import { Redis } from "~/lib/redis";
import type { RedisOptions } from "~/type";

/** Create a client from a redis:// URL or an options object; connects lazily. */
export function createRedis(options: RedisOptions | string) {
  return new Redis(typeof options === "string" ? { url: options } : options);
}
