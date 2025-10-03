import { test } from "bun:test";
import { deepEqual } from "node:assert";
import { encodeCommand } from "../src/lib/utils/encode-command";

test("encode-command", () => {
  deepEqual(encodeCommand(["SET", "key", "value"]), [
    "*3\r\n$3\r\nSET\r\n$3\r\nkey\r\n$5\r\nvalue\r\n",
  ]);
});
