import type {
  Command,
  ConnectionInstance,
  CreateRedisOptions,
  RedisResponse,
} from "../type";
import { createParser } from "./utils/create-parser";
import { encodeCommand } from "./utils/encode-command";
import { getConnectFn } from "./utils/get-connect-fn";
import { type WithResolvers, promiseWithResolvers } from "./utils/promise";
import { stringifyResult } from "./utils/stringify-result";

export class RedisInstance {
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  private promiseQueue: WithResolvers<RedisResponse>[] = [];

  public options: CreateRedisOptions;
  private connectionInstance?: ConnectionInstance | Promise<ConnectionInstance>;
  public config;

  private isInitialized = false;

  private parser = createParser({
    onReply: (reply) => {
      const logger = this.logger;

      if (logger)
        logger?.(
          "Received reply",
          reply instanceof Uint8Array
            ? this.decoder.decode(reply)
            : String(reply),
        );

      this.promiseQueue.shift()?.resolve(reply);
    },
    onError: (err) => {
      if (this.logger)
        this.logger("Error", err.message, err.stack ?? "No stack");

      this.promiseQueue.shift()?.reject(err);
    },
  });

  constructor(options: CreateRedisOptions) {
    this.options = options;
    this.config = this.getConnectConfig();
  }

  get connected() {
    return !!this.connectionInstance;
  }

  get logger() {
    return this.options.logger;
  }

  get connectFn() {
    return this.options.connectFn;
  }

  get tls() {
    return this.options.tls;
  }

  async connection() {
    if (!this.connectionInstance)
      throw new Error(
        "Redis connection not started, call `startConnection` first",
      );

    return await this.connectionInstance;
  }

  private getConnectConfig() {
    if ("url" in this.options) {
      const { hostname, port, password, pathname } = new URL(this.options.url);

      return {
        hostname,
        port: Number(port) || 6379,
        password,
        database: pathname.slice(1) || undefined,
        tls: this.options.tls ?? this.options.url.includes("rediss://"),
      };
    }

    const {
      hostname: host,
      username,
      port,
      password,
      database,
      tls,
    } = this.options;

    const resolvedPort = Number(port) || 6379;

    return {
      hostname: host,
      username,
      port: resolvedPort,
      password,
      database,
      tls,
    };
  }

  public async startConnection() {
    if (this.connectionInstance) return this.connectionInstance;

    this.connectionInstance = this.createConnection()
      .catch((error) => {
        this.connectionInstance = undefined;
        throw error;
      })
      .then((connection) => {
        this.connectionInstance = connection;
        return connection;
      });

    void this.startMessageListener(await this.connectionInstance)
      .catch((e) => {
        this.logger?.(
          "Error sending command",
          e.message,
          e.stack ?? "No stack",
        );

        throw e;
      })
      .finally(async () => {
        this.logger?.("Listener closed");
        await this.close();
      });

    return this.connectionInstance;
  }

  private async createConnection() {
    const connect = await getConnectFn(this.connectFn);

    this.options.logger?.(
      "Connecting to",
      this.config.hostname,
      this.config.port.toString(),
    );

    const socket = connect(
      {
        hostname: this.config.hostname,
        port: this.config.port,
      },
      {
        secureTransport: this.config.tls ? "on" : "off",
        allowHalfOpen: false,
      },
    );

    const writer = socket.writable.getWriter();
    const reader = socket.readable.getReader();

    return {
      socket,
      reader,
      writer,
    };
  }

  private getInitializeCommands() {
    const commands: Command[] = [];

    if (this.config.password) {
      commands.push(["AUTH", this.config.password]);
    }

    if (this.config.database) {
      commands.push(["SELECT", this.config.database]);
    }

    return commands;
  }

  public async sendOnce(...args: Command) {
    try {
      return await this.send(...args);
    } finally {
      await this.close();
    }
  }

  public async sendOnceRaw(...args: Command) {
    try {
      return await this.sendRaw(...args);
    } finally {
      await this.close();
    }
  }

  public async send(...args: Command) {
    return stringifyResult(await this.sendRaw(...args));
  }

  public async sendRaw(...args: Command) {
    if (!this.connectionInstance) await this.startConnection();

    try {
      return await this.unsafeSend(args);
    } catch (e) {
      await this.close();

      throw e;
    }
  }

  private async unsafeSend(command: Command) {
    const commands: Command[] = [];

    if (!this.isInitialized) {
      commands.push(...this.getInitializeCommands());
    }

    commands.push(command);
    const result = await this.writeCommandsToConnection(commands);
    this.isInitialized = true;

    return result.at(-1) ?? null;
  }

  private async writeCommandsToConnection(commands: Command[]) {
    const connection = await this.connection();

    const chunks: Array<string | Uint8Array> = [];

    for (const command of commands) {
      const { promise, resolve, reject } =
        promiseWithResolvers<RedisResponse>();

      this.promiseQueue.push({
        promise,
        resolve,
        reject,
      });

      const payload = encodeCommand(
        command.map((arg) => (arg instanceof Uint8Array ? arg : String(arg))),
      );

      chunks.push(...payload);
    }

    for (const chunk of chunks) {
      await connection.writer.write(
        chunk instanceof Uint8Array ? chunk : this.encoder.encode(chunk),
      );
    }

    return Promise.all(this.promiseQueue.map((p) => p.promise));
  }

  private async startMessageListener(connection: ConnectionInstance) {
    while (true) {
      const result = await Promise.race([
        connection.socket.closed,
        connection.reader.read(),
      ]);

      if (!result) {
        this.logger?.("Socket closed while reading");
        break;
      }

      if (result.value) {
        this.parser(result.value);
      }

      if (result.done) {
        break;
      }
    }
  }

  public async close(err?: Error) {
    if (err) {
      this.logger?.(`Closing socket due to error: ${err.message}`);
    }

    const connection = await this.connectionInstance;

    this.connectionInstance = undefined;
    this.isInitialized = false;

    if (!connection) {
      return;
    }

    for (const promise of this.promiseQueue) {
      promise.reject(err ?? new Error("Connection closed"));
    }
    this.promiseQueue = [];

    await connection.socket.close();
    await connection.writer.abort(err);
    await connection.reader.cancel(err);
  }
}
