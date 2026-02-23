import { expect, test } from "bun:test";
import { Socket } from "@arrowood.dev/socket";
import { getConnectFn } from "../src";

test("get-connect-fn", async () => {
  expect(await getConnectFn()).toBeInstanceOf(Function);

  const fn = () => {
    return new Socket({
      hostname: "localhost",
      port: 6379,
    });
  };

  expect(await getConnectFn(fn)).toBe(fn);
});
