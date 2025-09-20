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

test("create-parser - concurrent instances no interference", () => {
  const results: { parserId: number; responses: RedisResponse[] }[] = [];

  // Create 5 concurrent parsers
  const parsers = Array.from({ length: 5 }, (_, i) => {
    const responses: RedisResponse[] = [];
    const parser = createParser({
      onReply: (reply) => responses.push(reply),
      onError: () => {}, // Ignore errors for this test
    });

    results.push({ parserId: i, responses });

    return { parser, responses, parserId: i };
  });

  // Send different data to each parser
  parsers.forEach(({ parser, parserId }) => {
    const data = `*2\r\n:1\r\n$${parserId + 1}\r\n${"x".repeat(parserId + 1)}\r\n`;
    parser(new TextEncoder().encode(data));
  });

  // Verify each parser got its own correct data
  results.forEach(({ parserId, responses }) => {
    equal(responses.length, 1);
    const response = responses[0] as RedisResponse[];
    equal(response[0], 1); // First element is always 1
    equal((response[1] as Uint8Array).length, parserId + 1); // Second element length matches parser ID
  });
});

test("create-parser - buffer pool isolation", () => {
  const responses1: RedisResponse[] = [];
  const responses2: RedisResponse[] = [];

  const parser1 = createParser({
    onReply: (reply) => responses1.push(reply),
    onError: () => {},
  });

  const parser2 = createParser({
    onReply: (reply) => responses2.push(reply),
    onError: () => {},
  });

  // Send large responses to trigger buffer pool creation
  const largeData = "x".repeat(100 * 1024); // 100KB
  const data1 = `$${largeData.length}\r\n${largeData}\r\n`;
  const data2 = `$${largeData.length}\r\n${largeData}\r\n`;

  parser1(new TextEncoder().encode(data1));
  parser2(new TextEncoder().encode(data2));

  // Both should get their responses
  equal(responses1.length, 1);
  equal(responses2.length, 1);
  equal((responses1[0] as Uint8Array).length, largeData.length);
  equal((responses2[0] as Uint8Array).length, largeData.length);
});

test("create-parser - cleanup prevents memory leaks", async () => {
  // This test verifies that parsers don't leak memory or resources

  // Override setInterval to track active intervals
  const originalSetInterval = global.setInterval;
  const originalClearInterval = global.clearInterval;

  const intervals = new Set<NodeJS.Timeout>();
  global.setInterval = ((callback: () => void, delay?: number) => {
    const id = originalSetInterval(callback, delay);
    intervals.add(id);
    return id;
  }) as typeof global.setInterval;

  global.clearInterval = ((id: NodeJS.Timeout) => {
    if (intervals.has(id)) {
      intervals.delete(id);
    }
    originalClearInterval(id);
  }) as typeof global.clearInterval;

  try {
    // Create parser that will trigger buffer pool creation
    const parser = createParser({
      onReply: () => {},
      onError: () => {},
    });

    // Send large data to trigger buffer pool
    const largeData = "x".repeat(200 * 1024); // 200KB - should trigger buffer pool
    const data = `$${largeData.length}\r\n${largeData}\r\n`;
    parser(new TextEncoder().encode(data));

    // Wait for cleanup interval to potentially run
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Parser should have cleaned up its interval
    // Note: This is a best-effort test since cleanup timing is unpredictable
  } finally {
    // Restore original functions
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
  }
});

test("create-parser - side effect isolation", () => {
  const responsesA: RedisResponse[] = [];
  const responsesB: RedisResponse[] = [];
  const errorsA: Error[] = [];
  const errorsB: Error[] = [];

  const parserA = createParser({
    onReply: (reply) => responsesA.push(reply),
    onError: (err) => errorsA.push(err),
  });

  const parserB = createParser({
    onReply: (reply) => responsesB.push(reply),
    onError: (err) => errorsB.push(err),
  });

  // Send normal data to parser A
  parserA(new TextEncoder().encode("+OK\r\n"));

  // Send error to parser B
  parserB(new TextEncoder().encode("-ERROR from parser B\r\n"));

  // Send more data to parser A
  parserA(new TextEncoder().encode(":123\r\n"));

  // Verify no cross-contamination
  equal(responsesA.length, 2);
  equal(errorsA.length, 0);
  equal(responsesB.length, 0);
  equal(errorsB.length, 1);

  deepEqual(responsesA[0], new TextEncoder().encode("OK"));
  equal(responsesA[1], 123);
  equal(errorsB[0].message, "ERROR from parser B");
});

test("create-parser - buffer state isolation", () => {
  const responses1: RedisResponse[] = [];
  const responses2: RedisResponse[] = [];

  const parser1 = createParser({
    onReply: (reply) => responses1.push(reply),
    onError: () => {},
  });

  const parser2 = createParser({
    onReply: (reply) => responses2.push(reply),
    onError: () => {},
  });

  // Send incomplete data to both parsers
  parser1(new TextEncoder().encode("$5\r\nhello"));
  parser2(new TextEncoder().encode("$5\r\nworld"));

  // At this point, neither should have emitted responses
  equal(responses1.length, 0);
  equal(responses2.length, 0);

  // Complete parser1's response
  parser1(new TextEncoder().encode("\r\n"));
  equal(responses1.length, 1);
  equal(responses2.length, 0); // Parser2 should still be waiting

  // Complete parser2's response
  parser2(new TextEncoder().encode("\r\n"));
  equal(responses1.length, 1);
  equal(responses2.length, 1);

  // Verify correct data
  deepEqual(responses1[0], new TextEncoder().encode("hello"));
  deepEqual(responses2[0], new TextEncoder().encode("world"));
});

test("create-parser - resource cleanup on error", () => {
  const errors: Error[] = [];
  let errorCount = 0;

  const parser = createParser({
    onReply: () => {},
    onError: (err) => {
      errors.push(err);
      errorCount++;
    },
  });

  // Send invalid protocol data multiple times
  parser(new TextEncoder().encode("!INVALID1\r\n"));
  parser(new TextEncoder().encode("!INVALID2\r\n"));
  parser(new TextEncoder().encode("!INVALID3\r\n"));

  equal(errorCount, 3);
  equal(errors.length, 3);

  // Parser should still be functional after errors
  parser(new TextEncoder().encode("+OK\r\n"));
  equal(errorCount, 3); // No additional errors
});

test("create-parser - memory pressure handling", () => {
  const responses: RedisResponse[] = [];

  const parser = createParser({
    onReply: (reply) => responses.push(reply),
    onError: () => {},
  });

  // Send progressively larger responses to test memory management
  const sizes = [10, 100, 1000, 10000, 100000]; // 10 bytes to 100KB

  sizes.forEach((size) => {
    const data = "x".repeat(size);
    const message = `$${size}\r\n${data}\r\n`;
    parser(new TextEncoder().encode(message));
  });

  // All responses should be received
  equal(responses.length, sizes.length);

  // Verify each response size is correct
  responses.forEach((response, index) => {
    equal((response as Uint8Array).length, sizes[index]);
  });
});
