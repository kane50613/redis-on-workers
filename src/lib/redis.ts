import type { Command, RedisOptions, RedisConnectConfig, RedisResponse } from "~/type";
import { Connection } from "~/lib/connection";
import { encodeCommand } from "~/lib/utils/encode-command";
import { stringifyResult } from "~/lib/utils/stringify-result";

const connectionClosedError = new Error("Redis connection closed");

function parseConnectConfig(options: RedisOptions): RedisConnectConfig {
  if ("url" in options) {
    const { hostname, port, username, password, pathname, protocol } = new URL(options.url);

    return {
      hostname,
      port: Number(port) || 6379,
      username: username || undefined,
      password: password || undefined,
      database: pathname.slice(1) || undefined,
      tls: options.tls ?? protocol === "rediss:",
    };
  }

  const { hostname, username, port, password, database, tls } = options;

  return { hostname, username, port: Number(port) || 6379, password, database, tls };
}

function initCommands(config: RedisConnectConfig) {
  const commands: Command[] = [];

  if (config.password) {
    commands.push(
      config.username ? ["AUTH", config.username, config.password] : ["AUTH", config.password],
    );
  }

  if (config.database) {
    commands.push(["SELECT", config.database]);
  }

  return commands;
}

export class Redis {
  private config: RedisConnectConfig;

  private connection?: Promise<Connection>;
  private pending: PromiseWithResolvers<RedisResponse>[] = [];

  constructor(private options: RedisOptions) {
    this.config = parseConnectConfig(options);
  }

  /** Send a command; bulk strings in the reply decode to JS strings. */
  async send(...command: Command) {
    return stringifyResult(await this.sendRaw(...command));
  }

  /** Send a command and get the raw reply, bulk strings as Uint8Array. */
  async sendRaw(...command: Command) {
    this.connection ??= this.open().catch((error) => {
      this.connection = undefined;
      throw error;
    });

    return this.request(await this.connection, command);
  }

  /** Reject in-flight commands and close the socket; the next send reconnects. */
  async close(reason?: Error) {
    const pending = this.pending;
    const connection = this.connection ? await this.connection.catch(() => undefined) : undefined;
    const error = reason ?? (pending.length > 0 ? connectionClosedError : undefined);

    this.connection = undefined;
    this.pending = [];

    if (error) {
      for (const reply of pending) {
        reply.reject(error);
      }
    }

    await connection?.close(error);
  }

  async [Symbol.asyncDispose]() {
    await this.close();
  }

  private async request(connection: Connection, command: Command) {
    const reply = Promise.withResolvers<RedisResponse>();

    this.pending.push(reply);

    try {
      await connection.write(
        encodeCommand(command.map((arg) => (arg instanceof Uint8Array ? arg : String(arg)))),
      );
    } catch (error) {
      await this.close(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }

    return reply.promise;
  }

  private async open() {
    const connection = await Connection.open(this.config, this.options);

    void this.pump(connection);

    for (const command of initCommands(this.config)) {
      await this.request(connection, command);
    }

    return connection;
  }

  private async pump(connection: Connection) {
    const active = this.connection;

    try {
      for await (const reply of connection.replies) {
        this.options.logger?.("Received reply", String(reply));

        const pending = this.pending.shift();

        if (reply instanceof Error) {
          pending?.reject(reply);
        } else {
          pending?.resolve(reply);
        }
      }
    } catch (error) {
      if (this.connection === active) {
        await this.close(error instanceof Error ? error : new Error(String(error)));
      }

      return;
    }

    if (this.connection === active) await this.close();
  }
}
