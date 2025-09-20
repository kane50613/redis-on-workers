import { deepEqual, equal, throws } from "node:assert";
import { test } from "node:test";
import { createParser } from "../src/lib/utils/create-parser";
import type { RedisResponse } from "../src/type";

test("create-parser - simple string", () => {
  const responses: RedisResponse[] = [];
  const errors: Error[] = [];

  const parser = createParser({
    onReply: (reply) => responses.push(reply),
    onError: (err) => errors.push(err),
  });

  // Simple string response
  parser(new TextEncoder().encode("+OK\r\n"));

  equal(responses.length, 1);
  equal(errors.length, 0);
  deepEqual(responses[0], new TextEncoder().encode("OK"));
});

test("create-parser - error", () => {
  const responses: RedisResponse[] = [];
  const errors: Error[] = [];

  const parser = createParser({
    onReply: (reply) => responses.push(reply),
    onError: (err) => errors.push(err),
  });

  // Error response
  parser(new TextEncoder().encode("-ERR something went wrong\r\n"));

  equal(responses.length, 0);
  equal(errors.length, 1);
  equal(errors[0].message, "ERR something went wrong");
});

test("create-parser - integer", () => {
  const responses: RedisResponse[] = [];
  const errors: Error[] = [];

  const parser = createParser({
    onReply: (reply) => responses.push(reply),
    onError: (err) => errors.push(err),
  });

  // Integer response
  parser(new TextEncoder().encode(":42\r\n"));

  equal(responses.length, 1);
  equal(errors.length, 0);
  equal(responses[0], 42);
});

test("create-parser - negative integer", () => {
  const responses: RedisResponse[] = [];
  const errors: Error[] = [];

  const parser = createParser({
    onReply: (reply) => responses.push(reply),
    onError: (err) => errors.push(err),
  });

  // Negative integer response
  parser(new TextEncoder().encode(":-123\r\n"));

  equal(responses.length, 1);
  equal(errors.length, 0);
  equal(responses[0], -123);
});

test("create-parser - bulk string", () => {
  const responses: RedisResponse[] = [];
  const errors: Error[] = [];

  const parser = createParser({
    onReply: (reply) => responses.push(reply),
    onError: (err) => errors.push(err),
  });

  // Bulk string response
  parser(new TextEncoder().encode("$5\r\nhello\r\n"));

  equal(responses.length, 1);
  equal(errors.length, 0);
  deepEqual(responses[0], new TextEncoder().encode("hello"));
});

test("create-parser - empty bulk string", () => {
  const responses: RedisResponse[] = [];
  const errors: Error[] = [];

  const parser = createParser({
    onReply: (reply) => responses.push(reply),
    onError: (err) => errors.push(err),
  });

  // Empty bulk string response
  parser(new TextEncoder().encode("$0\r\n\r\n"));

  equal(responses.length, 1);
  equal(errors.length, 0);
  deepEqual(responses[0], new TextEncoder().encode(""));
});

test("create-parser - null bulk string", () => {
  const responses: RedisResponse[] = [];
  const errors: Error[] = [];

  const parser = createParser({
    onReply: (reply) => responses.push(reply),
    onError: (err) => errors.push(err),
  });

  // Null bulk string response
  parser(new TextEncoder().encode("$-1\r\n"));

  equal(responses.length, 1);
  equal(errors.length, 0);
  equal(responses[0], null);
});

test("create-parser - array", () => {
  const responses: RedisResponse[] = [];
  const errors: Error[] = [];

  const parser = createParser({
    onReply: (reply) => responses.push(reply),
    onError: (err) => errors.push(err),
  });

  // Array response with two bulk strings
  parser(new TextEncoder().encode("*2\r\n$3\r\nfoo\r\n$3\r\nbar\r\n"));

  equal(responses.length, 1);
  equal(errors.length, 0);
  deepEqual(responses[0], [
    new TextEncoder().encode("foo"),
    new TextEncoder().encode("bar"),
  ]);
});

test("create-parser - empty array", () => {
  const responses: RedisResponse[] = [];
  const errors: Error[] = [];

  const parser = createParser({
    onReply: (reply) => responses.push(reply),
    onError: (err) => errors.push(err),
  });

  // Empty array response
  parser(new TextEncoder().encode("*0\r\n"));

  equal(responses.length, 1);
  equal(errors.length, 0);
  deepEqual(responses[0], []);
});

test("create-parser - null array", () => {
  const responses: RedisResponse[] = [];
  const errors: Error[] = [];

  const parser = createParser({
    onReply: (reply) => responses.push(reply),
    onError: (err) => errors.push(err),
  });

  // Null array response
  parser(new TextEncoder().encode("*-1\r\n"));

  equal(responses.length, 1);
  equal(errors.length, 0);
  equal(responses[0], null);
});

test("create-parser - nested array", () => {
  const responses: RedisResponse[] = [];
  const errors: Error[] = [];

  const parser = createParser({
    onReply: (reply) => responses.push(reply),
    onError: (err) => errors.push(err),
  });

  // Nested array response
  parser(
    new TextEncoder().encode("*2\r\n*2\r\n:1\r\n:2\r\n*2\r\n:3\r\n:4\r\n"),
  );

  equal(responses.length, 1);
  equal(errors.length, 0);
  deepEqual(responses[0], [
    [1, 2],
    [3, 4],
  ]);
});

test("create-parser - mixed array", () => {
  const responses: RedisResponse[] = [];
  const errors: Error[] = [];

  const parser = createParser({
    onReply: (reply) => responses.push(reply),
    onError: (err) => errors.push(err),
  });

  // Mixed array with different types
  parser(
    new TextEncoder().encode("*4\r\n+OK\r\n:42\r\n$5\r\nhello\r\n$-1\r\n"),
  );

  equal(responses.length, 1);
  equal(errors.length, 0);
  deepEqual(responses[0], [
    new TextEncoder().encode("OK"),
    42,
    new TextEncoder().encode("hello"),
    null,
  ]);
});

test("create-parser - chunked response", () => {
  const responses: RedisResponse[] = [];
  const errors: Error[] = [];

  const parser = createParser({
    onReply: (reply) => responses.push(reply),
    onError: (err) => errors.push(err),
  });

  // Send response in chunks
  parser(new TextEncoder().encode("+OK\r\n*2\r\n$3\r\n"));
  parser(new TextEncoder().encode("foo\r\n$3\r\nbar\r\n"));

  equal(responses.length, 2);
  equal(errors.length, 0);
  deepEqual(responses[0], new TextEncoder().encode("OK"));
  deepEqual(responses[1], [
    new TextEncoder().encode("foo"),
    new TextEncoder().encode("bar"),
  ]);
});

test("create-parser - large bulk string", () => {
  const responses: RedisResponse[] = [];
  const errors: Error[] = [];

  const parser = createParser({
    onReply: (reply) => responses.push(reply),
    onError: (err) => errors.push(err),
  });

  // Create a large bulk string (100KB)
  const largeString = "x".repeat(100 * 1024);
  const encoder = new TextEncoder();
  const lengthStr = largeString.length.toString();

  // Send in chunks to simulate large response handling
  const chunk1 = encoder.encode(
    `$${lengthStr}\r\n${largeString.slice(0, 50000)}`,
  );
  const chunk2 = encoder.encode(`${largeString.slice(50000)}\r\n`);

  parser(chunk1);
  parser(chunk2);

  equal(responses.length, 1);
  equal(errors.length, 0);
  deepEqual(responses[0], encoder.encode(largeString));
});

test("create-parser - invalid protocol", () => {
  const responses: RedisResponse[] = [];
  const errors: Error[] = [];

  const parser = createParser({
    onReply: (reply) => responses.push(reply),
    onError: (err) => errors.push(err),
  });

  // Invalid protocol character
  parser(new TextEncoder().encode("!INVALID\r\n"));

  equal(responses.length, 0);
  equal(errors.length, 1);
  throws(() => {
    throw errors[0];
  }, /Protocol error/);
});

test("create-parser - incomplete response", () => {
  const responses: RedisResponse[] = [];
  const errors: Error[] = [];

  const parser = createParser({
    onReply: (reply) => responses.push(reply),
    onError: (err) => errors.push(err),
  });

  // Send incomplete response
  parser(new TextEncoder().encode("$5\r\nhello"));

  // No response should be emitted yet
  equal(responses.length, 0);
  equal(errors.length, 0);

  // Send the rest
  parser(new TextEncoder().encode("\r\n"));

  equal(responses.length, 1);
  equal(errors.length, 0);
  deepEqual(responses[0], new TextEncoder().encode("hello"));
});

test("create-parser - multiple responses in one buffer", () => {
  const responses: RedisResponse[] = [];
  const errors: Error[] = [];

  const parser = createParser({
    onReply: (reply) => responses.push(reply),
    onError: (err) => errors.push(err),
  });

  // Multiple responses in one buffer
  parser(new TextEncoder().encode("+OK\r\n:42\r\n$5\r\nhello\r\n"));

  equal(responses.length, 3);
  equal(errors.length, 0);
  deepEqual(responses[0], new TextEncoder().encode("OK"));
  equal(responses[1], 42);
  deepEqual(responses[2], new TextEncoder().encode("hello"));
});
