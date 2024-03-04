import { CreateRedisOptions } from "./type";

export async function getConnectFn(fn?: CreateRedisOptions["connectFn"]) {
  if (fn) return fn;

  try {
    const { connect } = await import("cloudflare:sockets");

    return connect;
  } catch (e) {
    try {
      const { connect } = await import("@arrowood.dev/socket");

      return connect;
    } catch (e) {
      throw new Error("No socket provider found");
    }
  }
}
