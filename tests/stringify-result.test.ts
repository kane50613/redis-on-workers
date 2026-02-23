import { expect, test } from "bun:test";
import { stringifyResult } from "../src/lib/utils/stringify-result";
import type { RedisResponse } from "../src/type";

test("stringifyResult - Uint8Array to string", () => {
  const encoder = new TextEncoder();

  // Test basic string conversion
  const input = encoder.encode("hello world");
  const result = stringifyResult(input);
  expect(result).toBe("hello world");

  // Test empty Uint8Array
  const emptyInput = encoder.encode("");
  const emptyResult = stringifyResult(emptyInput);
  expect(emptyResult).toBe("");

  // Test UTF-8 characters
  const utf8Input = encoder.encode("héllo wörld 🚀");
  const utf8Result = stringifyResult(utf8Input);
  expect(utf8Result).toBe("héllo wörld 🚀");

  // Test binary data (should still convert to string)
  const binaryInput = new Uint8Array([1, 2, 3]);
  const binaryResult = stringifyResult(binaryInput);
  // This will convert the bytes to characters, with invalid UTF-8 bytes becoming replacement chars
  expect(binaryResult).toBe("\x01\x02\x03");
});

test("stringifyResult - preserve numbers", () => {
  expect(stringifyResult(42)).toBe(42);
  expect(stringifyResult(0)).toBe(0);
  expect(stringifyResult(-123)).toBe(-123);
  expect(stringifyResult(3.14)).toBe(3.14);
  expect(stringifyResult(Number.MAX_SAFE_INTEGER)).toBe(
    Number.MAX_SAFE_INTEGER,
  );
});

test("stringifyResult - preserve null", () => {
  expect(stringifyResult(null)).toBe(null);
});

test("stringifyResult - preserve Error objects", () => {
  const error = new Error("test error");
  const result = stringifyResult(error);
  expect(result).toBe(error);

  // Test custom error
  class CustomError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "CustomError";
    }
  }

  const customError = new CustomError("custom message");
  const customResult = stringifyResult(customError);
  expect(customResult).toBe(customError);
});

test("stringifyResult - array processing", () => {
  const encoder = new TextEncoder();

  // Test array with strings
  const stringArray: RedisResponse[] = [
    encoder.encode("foo"),
    encoder.encode("bar"),
  ];
  const stringResult = stringifyResult(stringArray);
  expect(stringResult).toEqual(["foo", "bar"]);

  // Test array with numbers
  const numberArray: RedisResponse[] = [1, 2, 3];
  const numberResult = stringifyResult(numberArray);
  expect(numberResult).toEqual([1, 2, 3]);

  // Test array with null
  const nullArray: RedisResponse[] = [encoder.encode("test"), null];
  const nullResult = stringifyResult(nullArray);
  expect(nullResult).toEqual(["test", null]);

  // Test array with errors
  const error = new Error("array error");
  const errorArray: RedisResponse[] = [encoder.encode("ok"), error];
  const errorResult = stringifyResult(errorArray);
  expect(errorResult).toEqual(["ok", error]);
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
  expect(result).toEqual(["first", ["nested1", "nested2"], "last"]);
});

test("stringifyResult - deeply nested arrays", () => {
  const encoder = new TextEncoder();

  // Test deeply nested array
  const deepArray: RedisResponse[] = [
    [[encoder.encode("level3")], encoder.encode("level2")],
    encoder.encode("level1"),
  ];

  const result = stringifyResult(deepArray);
  expect(result).toEqual([[["level3"], "level2"], "level1"]);
});

test("stringifyResult - mixed array types", () => {
  const encoder = new TextEncoder();

  const error = new Error("test error");

  // Test array with all different types
  const mixedArray: RedisResponse[] = [
    encoder.encode("string"),
    42,
    null,
    error,
    [encoder.encode("nested"), 123],
  ];

  const result = stringifyResult(mixedArray);
  expect(result).toEqual(["string", 42, null, error, ["nested", 123]]);
});

test("stringifyResult - empty array", () => {
  const emptyArray: RedisResponse[] = [];
  const result = stringifyResult(emptyArray);
  expect(result).toEqual([]);
});

test("stringifyResult - array with empty arrays", () => {
  const encoder = new TextEncoder();

  const arrayWithEmpty: RedisResponse[] = [[], encoder.encode("test"), []];

  const result = stringifyResult(arrayWithEmpty);
  expect(result).toEqual([[], "test", []]);
});

test("stringifyResult - complex Redis response", () => {
  const encoder = new TextEncoder();

  // Simulate a complex Redis response like from SCAN or KEYS
  const complexResponse: RedisResponse[] = [
    0, // cursor
    [encoder.encode("key1"), encoder.encode("key2"), encoder.encode("key3")],
  ];

  const result = stringifyResult(complexResponse);
  expect(result).toEqual([0, ["key1", "key2", "key3"]]);
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
  expect(result).toEqual(["field1", "value1", "field2", "value2"]);
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
  expect(result).toEqual([
    ["member1", 1.5],
    ["member2", 2.5],
    ["member3", 3.5],
  ]);
});
