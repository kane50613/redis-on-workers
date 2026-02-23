import type { connect } from "cloudflare:sockets";
import type { connect as nodeConnect } from "@arrowood.dev/socket";

export type Command = [string, ...(string | number | Uint8Array)[]];

export type RedisResponse =
  | Uint8Array
  | number
  | null
  | Error
  | RedisResponse[];

export type StringifyRedisResponse =
  | Exclude<RedisResponse, Uint8Array>
  | string
  | StringifyRedisResponse[];

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

export interface ConnectionInstance {
  writer: WritableStreamDefaultWriter<Uint8Array>;
  reader: ReadableStreamDefaultReader<Uint8Array>;
  socket: ReturnType<typeof connect | typeof nodeConnect>;
}
