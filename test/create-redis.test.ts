import { connect } from "@arrowood.dev/socket";
import { deepEqual, equal } from "node:assert";
import { test } from "node:test";
import { createRedis } from "../src";

test("create-redis", async () => {
  const redis = createRedis({
    url: "redis://localhost:6379/0",
    connectFn: connect,
  });

  const encoder = new TextEncoder();

  const PONG = encoder.encode("PONG");

  deepEqual(await redis.raw("PING"), PONG);

  equal(await redis("SET", "foo", "bar"), "OK");

  equal(await redis("GET", "foo"), "bar");

  equal(await redis("DEL", "foo"), 1);

  equal(await redis("GET", "foo"), null);
});
