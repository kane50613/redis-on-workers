import encodeCommand from "@redis/client/dist/lib/client/RESP2/encoder";
import type { RedisCommandArgument } from "@redis/client/dist/lib/commands";
import { Buffer } from "node:buffer";
import type { RedisError } from "redis-errors";
import Parser from "redis-parser";
import { getConnectFn } from "./get-connect-fn";
import { promiseWithResolvers, WithResolvers } from "./promise";
import type { Command, CreateRedisOptions, Redis, RedisResponse } from "./type";

export function createRedis(options: CreateRedisOptions) {
  const { hostname, port, password, pathname } = new URL(options.url);

  const portNumber = Number(port) || 6379;
  const database = Number(pathname.slice(1)) || 0;

  const encoder = new TextEncoder();

  async function raw(cmd: string, ...args: (string | number | Buffer)[]) {
    const connect = await getConnectFn(options.connectFn);

    options.logger?.("Connecting to", hostname, portNumber.toString());

    const socket = connect(
      {
        hostname,
        port: portNumber,
      },
      {
        secureTransport:
          options.tls ?? options.url.includes("rediss://") ? "on" : "off",
        allowHalfOpen: false,
      },
    );

    const writer = socket.writable.getWriter();
    const reader = socket.readable.getReader();

    async function closeSocket(err?: RedisError) {
      if (err) options.logger?.(`Closing socket due to error: ${err.message}`);

      await socket.close();
      await writer.abort(err);
      await reader.cancel(err);
    }

    const promiseQueue: WithResolvers<RedisResponse>[] = [];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const parser = new Parser({
      returnBuffers: true,
      stringNumbers: false,
      returnReply(reply: RedisResponse) {
        if (options.logger)
          options.logger(
            "Received reply",
            reply instanceof Buffer ? reply.toString("utf-8") : String(reply),
          );

        promiseQueue.shift()?.resolve(reply);
      },
      returnError: closeSocket,
      returnFatalError: closeSocket,
    });

    async function startListener() {
      while (true) {
        const result = await Promise.race([socket.closed, reader.read()]);

        if (!result) {
          options.logger?.("Socket closed while reading");
          break;
        }

        const { done, value } = result as {
          done: boolean;
          value: Uint8Array;
        };

        parser.execute(Buffer.from(value));

        if (done) break;
      }
    }

    startListener()
      .catch((e) => {
        options.logger?.(
          "Error sending command",
          e.message,
          e.stack ?? "No stack",
        );

        throw e;
      })
      .finally(async () => {
        options.logger?.("Listener closed");
        await closeSocket();
      });

    async function internalSend(commands: Command[]) {
      const chunks: RedisCommandArgument[] = [];

      for (const command of commands) {
        const { promise, resolve, reject } =
          promiseWithResolvers<RedisResponse>();

        promiseQueue.push({
          promise,
          resolve,
          reject,
        });

        const payload = encodeCommand(
          command.map((arg) => (arg instanceof Buffer ? arg : String(arg))),
        );

        chunks.push(...payload);
      }

      for (const chunk of chunks) {
        await writer.write(
          chunk instanceof Uint8Array ? chunk : encoder.encode(chunk),
        );
      }

      return Promise.all(promiseQueue.map((p) => p.promise));
    }

    const commands: Command[] = [];

    if (password) commands.push(["AUTH", password]);
    if (database) commands.push(["SELECT", database]);

    commands.push([cmd, ...args]);

    try {
      return await internalSend(commands).then((reply) => reply.at(-1) ?? null);
    } catch (e) {
      if (!(e instanceof Error)) throw e;

      options.logger?.(
        "Error sending command",
        e.message,
        e.stack ?? "No stack",
      );
      throw e;
    } finally {
      options.logger?.("Closing socket");
      await closeSocket();
    }
  }

  async function redis(cmd: string, ...args: (string | number | Buffer)[]) {
    const result = await raw(cmd, ...args);

    if (result instanceof Buffer) return result.toString("utf-8");

    return result;
  }

  redis.raw = raw;

  return redis as Redis;
}
