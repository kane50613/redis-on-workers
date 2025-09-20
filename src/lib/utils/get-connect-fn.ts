import type { CreateRedisOptions } from "../../type";

export async function getConnectFn(fn?: CreateRedisOptions["connectFn"]) {
  if (fn) return fn;

  try {
    const { connect } = await import(
      /* webpackIgnore: true */
      "cloudflare:sockets"
    );

    return connect;
  } catch (_e) {
    try {
      const { connect } = await import(
        /* webpackIgnore: true */
        "@arrowood.dev/socket"
      );

      return connect;
    } catch (_e) {
      throw new Error("No socket provider found");
    }
  }
}
