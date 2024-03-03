import { connect } from "@arrowood.dev/socket";
import { expect, test } from "vitest";
import { createRedis } from "./create-redis";

// node runtime doesn't have Promise.withResolvers yet
if (!Promise.withResolvers) {
  Promise.withResolvers = <T>() => {
    const result = {} as WithResolvers<T>;

    result.promise = new Promise<T>((resolve, reject) => {
      result.resolve = resolve;
      result.reject = reject;
    });

    return result;
  };
}

test("Redis", async () => {
  const redis = createRedis({
    url: "redis://localhost:6379/0",
    connectFn: connect,
  });

  expect(redis).toBeDefined();

  const PONG = Buffer.from("PONG");

  expect(await redis.raw("PING")).toEqual(PONG);

  expect(await redis("SET", "foo", "bar")).toBe("OK");

  expect(await redis("GET", "foo")).toBe("bar");

  expect(await redis("DEL", "foo")).toBe(1);

  expect(await redis("GET", "foo")).toBe(null);
});
