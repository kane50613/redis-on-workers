import { CreateRedisOptions } from "./type";

export async function getConnectFn(fn?: CreateRedisOptions["connectFn"]) {
  if (fn) return fn;

  try {
    return await import("cloudflare:sockets").then((r) => r.connect);
  } catch (e) {
    return await import("@arrowood.dev/socket").then((r) => r.connect);
  }
}
