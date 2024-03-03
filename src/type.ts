import type { connect as nodeConnect } from "@arrowood.dev/socket";
import type { connect } from "cloudflare:sockets";

export type Command = [string, ...(string | number | Uint8Array)[]];

export type RedisResponse = Buffer | string | null;

export interface CreateRedisOptions {
  url: string;
  tls?: boolean;
  logger?: (...message: string[]) => void;
  connectFn?: typeof connect | typeof nodeConnect;
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
