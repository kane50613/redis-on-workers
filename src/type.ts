import type { connect } from "cloudflare:sockets";
import type { connect as nodeConnect } from "@arrowood.dev/socket";

/** A command name followed by its arguments. */
export type Command = [string, ...(string | number | Uint8Array)[]];

/** A raw RESP reply; bulk strings stay as Uint8Array. */
export type RedisResponse = Uint8Array | number | null | Error | RedisResponse[];

/** A RESP reply with bulk strings decoded to JS strings. */
export type StringifyRedisResponse =
  | Exclude<RedisResponse, Uint8Array>
  | string
  | StringifyRedisResponse[];

/** The connection parameters resolved from `RedisOptions`. */
export interface RedisConnectConfig {
  hostname: string;
  port: number;
  username?: string;
  password?: string;
  database?: string;
  tls?: boolean;
}

interface BaseRedisOptions {
  /** Use TLS; defaults to true for `rediss:` URLs. */
  tls?: boolean;
  /** Receives debug messages such as connection and reply events. */
  logger?: (...message: unknown[]) => void;
  /** Replacement for `cloudflare:sockets` `connect`, e.g. the Node.js polyfill. */
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

export type RedisOptions = BaseRedisOptions & RedisConnectionOptions;
