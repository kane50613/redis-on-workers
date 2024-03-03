import { connect } from "@arrowood.dev/socket";
import { expect, test } from "vitest";
import { createRedis } from "./create-redis";

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
