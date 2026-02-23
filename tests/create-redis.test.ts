import { expect, test } from "bun:test";
import { createRedis } from "../src";

test("create-redis", async () => {
  const redis = createRedis("redis://localhost:6379/0");

  const encoder = new TextEncoder();

  const PONG = encoder.encode("PONG");

  expect(await redis.sendRaw("PING")).toEqual(PONG);

  expect(await redis.send("SET", "foo", "bar")).toBe("OK");

  expect(await redis.send("GET", "foo")).toBe("bar");

  expect(await redis.send("DEL", "foo")).toBe(1);

  expect(await redis.isConnected()).toBe(true);

  expect(await redis.sendOnce("GET", "foo")).toBe(null);

  expect(await redis.isConnected()).toBe(false);

  expect(await redis.sendOnce("PING")).toBe("PONG");
});

test("full-text-search", async () => {
  const redis = createRedis("redis://localhost:6379/0");

  expect(await redis.send("FLUSHALL")).toBe("OK");

  expect(
    await redis.send(
      "FT.CREATE",
      "idx",
      "ON",
      "hash",
      "PREFIX",
      "1",
      "doc:",
      "SCHEMA",
      "field1",
      "TEXT",
    ),
  ).toBe("OK");

  expect(
    await redis.send(
      "FT.ADD",
      "idx",
      "doc:1",
      "1.0",
      "FIELDS",
      "field1",
      "value1",
    ),
  ).toBe("OK");

  const searchResult1 = await redis.send("FT.SEARCH", "idx", "@field1:value1");

  expect(searchResult1).toEqual([1, "doc:1", ["field1", "value1"]]);

  const searchResult2 = await redis.send("FT.SEARCH", "idx", "@field1:value2");

  expect(searchResult2).toEqual([0]);

  const searchResult3 = await redis.send("FT.SEARCH", "idx", "@field1:value*");

  expect(searchResult3).toEqual([1, "doc:1", ["field1", "value1"]]);

  const searchResult4 = await redis.send("FT.SEARCH", "idx", "@field1:*value*");

  expect(searchResult4).toEqual([1, "doc:1", ["field1", "value1"]]);

  await redis.close();
});

test("error-handling", async () => {
  const redis = createRedis("redis://localhost:6379/0");

  expect(redis.sendOnce("MY_GO")).rejects.toThrow(
    "ERR unknown command 'MY_GO'",
  );

  await redis.close();
});

// https://github.com/kane50613/redis-on-workers/issues/18
test("concurrent send keeps replies matched to each command", async () => {
  const redis = createRedis("redis://localhost:6379/0");

  expect(await redis.send("FLUSHALL")).toBe("OK");

  const entryA1 = await redis.send("XADD", "mystream:a", "*", "field", "a1");
  const entryA2 = await redis.send("XADD", "mystream:a", "*", "field", "a2");
  const entryB1 = await redis.send("XADD", "mystream:b", "*", "field", "b1");
  const entryB2 = await redis.send("XADD", "mystream:b", "*", "field", "b2");

  const [firstEntry, lastEntry, countA, countB] = await Promise.all([
    redis.send("XRANGE", "mystream:a", "-", "+", "COUNT", "1"),
    redis.send("XREVRANGE", "mystream:b", "+", "-", "COUNT", "1"),
    redis.send("XLEN", "mystream:a"),
    redis.send("XLEN", "mystream:b"),
  ]);

  expect(firstEntry).toEqual([[entryA1, ["field", "a1"]]]);
  expect(lastEntry).toEqual([[entryB2, ["field", "b2"]]]);
  expect(countA).toBe(2);
  expect(countB).toBe(2);

  expect(entryA2).toEqual(expect.any(String));
  expect(entryB1).toEqual(expect.any(String));

  await redis.close();
});
