import { deepEqual, equal } from "node:assert";
import { test } from "node:test";
import { stringifyResult } from "../src/lib/utils/stringify-result";
import type { RedisResponse } from "../src/type";

test("stringifyResult - Uint8Array to string", () => {
  const encoder = new TextEncoder();

  // Test basic string conversion
  const input = encoder.encode("hello world");
  const result = stringifyResult(input);
  equal(result, "hello world");

  // Test empty Uint8Array
  const emptyInput = encoder.encode("");
  const emptyResult = stringifyResult(emptyInput);
  equal(emptyResult, "");

  // Test UTF-8 characters
  const utf8Input = encoder.encode("héllo wörld 🚀");
  const utf8Result = stringifyResult(utf8Input);
  equal(utf8Result, "héllo wörld 🚀");

  // Test binary data (should still convert to string)
  const binaryInput = new Uint8Array([0, 1, 255, 128]);
  const binaryResult = stringifyResult(binaryInput);
  // This will convert the bytes to characters, with invalid UTF-8 bytes becoming replacement chars
  equal(binaryResult, "\x00\x01��");
});

test("stringifyResult - preserve numbers", () => {
  equal(stringifyResult(42), 42);
  equal(stringifyResult(0), 0);
  equal(stringifyResult(-123), -123);
  equal(stringifyResult(3.14), 3.14);
  equal(stringifyResult(Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER);
});

test("stringifyResult - preserve null", () => {
  equal(stringifyResult(null), null);
});

test("stringifyResult - preserve Error objects", () => {
  const error = new Error("test error");
  const result = stringifyResult(error);
  equal(result, error);
  equal(result.message, "test error");

  // Test custom error
  class CustomError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "CustomError";
    }
  }

  const customError = new CustomError("custom message");
  const customResult = stringifyResult(customError);
  equal(customResult, customError);
  equal(customResult.name, "CustomError");
  equal(customResult.message, "custom message");
});

test("stringifyResult - array processing", () => {
  const encoder = new TextEncoder();

  // Test array with strings
  const stringArray: RedisResponse[] = [
    encoder.encode("foo"),
    encoder.encode("bar"),
  ];
  const stringResult = stringifyResult(stringArray);
  deepEqual(stringResult, ["foo", "bar"]);

  // Test array with numbers
  const numberArray: RedisResponse[] = [1, 2, 3];
  const numberResult = stringifyResult(numberArray);
  deepEqual(numberResult, [1, 2, 3]);

  // Test array with null
  const nullArray: RedisResponse[] = [encoder.encode("test"), null];
  const nullResult = stringifyResult(nullArray);
  deepEqual(nullResult, ["test", null]);

  // Test array with errors
  const error = new Error("array error");
  const errorArray: RedisResponse[] = [encoder.encode("ok"), error];
  const errorResult = stringifyResult(errorArray);
  deepEqual(errorResult, ["ok", error]);
});

test("stringifyResult - nested arrays", () => {
  const encoder = new TextEncoder();

  // Test nested array
  const nestedArray: RedisResponse[] = [
    encoder.encode("first"),
    [encoder.encode("nested1"), encoder.encode("nested2")],
    encoder.encode("last"),
  ];

  const result = stringifyResult(nestedArray);
  deepEqual(result, ["first", ["nested1", "nested2"], "last"]);
});

test("stringifyResult - deeply nested arrays", () => {
  const encoder = new TextEncoder();

  // Test deeply nested array
  const deepArray: RedisResponse[] = [
    [[encoder.encode("level3")], encoder.encode("level2")],
    encoder.encode("level1"),
  ];

  const result = stringifyResult(deepArray);
  deepEqual(result, [[["level3"], "level2"], "level1"]);
});

test("stringifyResult - mixed array types", () => {
  const encoder = new TextEncoder();

  // Test array with all different types
  const mixedArray: RedisResponse[] = [
    encoder.encode("string"),
    42,
    null,
    new Error("test error"),
    [encoder.encode("nested"), 123],
  ];

  const result = stringifyResult(mixedArray);
  deepEqual(result, [
    "string",
    42,
    null,
    mixedArray[3], // Error object should be preserved
    ["nested", 123],
  ]);
});

test("stringifyResult - empty array", () => {
  const emptyArray: RedisResponse[] = [];
  const result = stringifyResult(emptyArray);
  deepEqual(result, []);
});

test("stringifyResult - array with empty arrays", () => {
  const encoder = new TextEncoder();

  const arrayWithEmpty: RedisResponse[] = [[], encoder.encode("test"), []];

  const result = stringifyResult(arrayWithEmpty);
  deepEqual(result, [[], "test", []]);
});

test("stringifyResult - complex Redis response", () => {
  const encoder = new TextEncoder();

  // Simulate a complex Redis response like from SCAN or KEYS
  const complexResponse: RedisResponse[] = [
    0, // cursor
    [encoder.encode("key1"), encoder.encode("key2"), encoder.encode("key3")],
  ];

  const result = stringifyResult(complexResponse);
  deepEqual(result, [0, ["key1", "key2", "key3"]]);
});

test("stringifyResult - Redis hash response", () => {
  const encoder = new TextEncoder();

  // Simulate HGETALL response
  const hashResponse: RedisResponse[] = [
    encoder.encode("field1"),
    encoder.encode("value1"),
    encoder.encode("field2"),
    encoder.encode("value2"),
  ];

  const result = stringifyResult(hashResponse);
  deepEqual(result, ["field1", "value1", "field2", "value2"]);
});

test("stringifyResult - Redis sorted set response", () => {
  const encoder = new TextEncoder();

  // Simulate ZRANGE response with scores
  const zsetResponse: RedisResponse[] = [
    [encoder.encode("member1"), 1.5],
    [encoder.encode("member2"), 2.5],
    [encoder.encode("member3"), 3.5],
  ];

  const result = stringifyResult(zsetResponse);
  deepEqual(result, [
    ["member1", 1.5],
    ["member2", 2.5],
    ["member3", 3.5],
  ]);
});
