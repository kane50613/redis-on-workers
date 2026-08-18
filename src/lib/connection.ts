import type { connect as nodeConnect } from "@arrowood.dev/socket";
import type { connect } from "cloudflare:sockets";
import type { RedisOptions, RedisConnectConfig, RedisResponse } from "~/type";
import { decodeResp, type RespReader } from "~/lib/resp";
import { getConnectFn } from "~/lib/utils/get-connect-fn";

type Socket = ReturnType<typeof connect | typeof nodeConnect>;

export class Connection {
  readonly replies: AsyncGenerator<RedisResponse, void>;

  private writer: WritableStreamDefaultWriter<Uint8Array>;
  private reader: RespReader & { cancel(reason?: Error): Promise<void> };

  private constructor(private socket: Socket) {
    this.writer = socket.writable.getWriter();

    const reader = socket.readable.getReader();

    this.reader = {
      read: async () => {
        const { value, done } = await reader.read();

        return { value: value instanceof Uint8Array ? value : undefined, done };
      },
      cancel: (reason?: Error) => reader.cancel(reason),
    };

    this.replies = decodeResp(this.reader);
  }

  static async open(
    config: RedisConnectConfig,
    options: Pick<RedisOptions, "connectFn" | "logger">,
  ) {
    const connectFn = await getConnectFn(options.connectFn);

    options.logger?.("Connecting to", config.hostname, config.port.toString());

    const socket = connectFn(
      { hostname: config.hostname, port: config.port },
      { secureTransport: config.tls ? "on" : "off", allowHalfOpen: false },
    );

    return new Connection(socket);
  }

  write(payload: Uint8Array) {
    return this.writer.write(payload);
  }

  async close(reason?: Error) {
    await Promise.allSettled([
      this.socket.close(),
      this.writer.abort(reason),
      this.reader.cancel(reason),
    ]);
  }
}
