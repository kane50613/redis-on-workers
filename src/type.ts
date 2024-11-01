import type { connect as nodeConnect, Socket } from "@arrowood.dev/socket";
import type { connect } from "cloudflare:sockets";

export type Command = [string, ...(string | number | Uint8Array)[]];

export type RedisResponse = Uint8Array | number | null | RedisResponse[];

export type StringifyRedisResponse = string | number | null | StringifyRedisResponse[];

interface BaseRedisOptions {
  tls?: boolean;
  logger?: (...message: string[]) => void;
  connectFn?: typeof connect | typeof nodeConnect;
}

export type RedisConnectionOptions =
  | {
      url: string;
    }
  | {
      hostname: string;
      port: string | number;
      username?: string;
      password?: string;
      database?: string;
    };

export type CreateRedisOptions = BaseRedisOptions & RedisConnectionOptions;

export interface CreateParserOptions {
  onReply: (reply: RedisResponse) => void;
  onError: (err: Error) => void;
}

export type Redis = ((
  cmd: string,
  ...args: (string | number | Buffer)[]
) => Promise<string | null>) & {
  raw: (
    cmd: string,
    ...args: (string | number | Buffer)[]
  ) => Promise<Buffer | null>;
};

export interface ConnectionInstance {
  writer: WritableStreamDefaultWriter<Uint8Array>;
  reader: ReadableStreamDefaultReader<Uint8Array>;
  socket: Socket | ReturnType<typeof connect>;
}
