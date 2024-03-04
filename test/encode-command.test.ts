import { expect, test } from "vitest";
import { encodeCommand } from "../src/encode-command";

test("encode-command", async () => {
  expect(encodeCommand(["SET", "key", "value"])).toEqual([
    "*3\r\n$3\r\nSET\r\n$3\r\nkey\r\n$5\r\nvalue\r\n",
  ]);
});
