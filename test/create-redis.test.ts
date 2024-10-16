import { deepEqual, equal } from "node:assert";
import { test } from "node:test";
import { createRedis } from "../src";

test("create-redis", async () => {
  const redis = createRedis("redis://localhost:6379/0");

  const encoder = new TextEncoder();

  const PONG = encoder.encode("PONG");

  deepEqual(await redis.sendRaw("PING"), PONG);

  equal(await redis.send("SET", "foo", "bar"), "OK");

  equal(await redis.send("GET", "foo"), "bar");

  equal(await redis.send("DEL", "foo"), 1);

  equal(redis.connected, true);

  equal(await redis.sendOnce("GET", "foo"), null);

  equal(redis.connected, false);

  equal(await redis.sendOnce("PING"), "PONG");
});
