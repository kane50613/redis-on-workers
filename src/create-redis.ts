import { RedisInstance } from "./lib/redis-instance";
import type { CreateRedisOptions } from "./type";

export function createRedis(options: CreateRedisOptions | string) {
  return new RedisInstance(
    typeof options === "string"
      ? {
          url: options,
        }
      : options,
  );
}
