import { expect, test } from "bun:test";
import { encodeCommand } from "../src/lib/utils/encode-command";

test("encode-command", () => {
  const decoder = new TextDecoder();
  const encoded = encodeCommand(["SET", "key", "value"]);
  const totalLength = encoded.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of encoded) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  expect(encoded.every((chunk) => chunk instanceof Uint8Array)).toBe(true);
  expect(decoder.decode(merged)).toBe(
    "*3\r\n$3\r\nSET\r\n$3\r\nkey\r\n$5\r\nvalue\r\n",
  );
});
