import type { connect as nodeConnect } from "@arrowood.dev/socket";
import type { connect } from "cloudflare:sockets";

export type Command = [string, ...(string | number | Uint8Array)[]];

export type RedisResponse = Uint8Array | number | null | RedisResponse[];

export interface CreateRedisOptions {
  url: string;
  tls?: boolean;
  logger?: (...message: string[]) => void;
  connectFn?: typeof connect | typeof nodeConnect;
}

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
