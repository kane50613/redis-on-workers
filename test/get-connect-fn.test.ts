import { Socket } from "@arrowood.dev/socket";
import { expect, test } from "vitest";
import { getConnectFn } from "../src";

test("get-connect-fn", async () => {
  expect(await getConnectFn()).toBeDefined();

  const fn = () => {
    return new Socket({
      hostname: "localhost",
      port: 6379,
    });
  };

  expect(await getConnectFn(fn)).toBe(fn);
});
