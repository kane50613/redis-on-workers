import type { RedisResponse, StringifyRedisResponse } from "../../type";

export function stringifyResult(result: RedisResponse): StringifyRedisResponse {
  if (Array.isArray(result)) {
    return result.map(stringifyResult);
  }

  if (result instanceof Uint8Array) {
    return new TextDecoder().decode(result);
  }

  return result;
}
