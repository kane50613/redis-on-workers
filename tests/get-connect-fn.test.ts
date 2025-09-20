import { doesNotReject, equal } from "node:assert";
import { test } from "node:test";
import { Socket } from "@arrowood.dev/socket";
import { getConnectFn } from "../src";

test("get-connect-fn", async () => {
  await doesNotReject(getConnectFn);

  const fn = () => {
    return new Socket({
      hostname: "localhost",
      port: 6379,
    });
  };

  equal(await getConnectFn(fn), fn);
});
