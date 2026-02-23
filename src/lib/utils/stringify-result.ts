import type { RedisResponse, StringifyRedisResponse } from "../../type";

const decoder = new TextDecoder();

export function stringifyResult(result: RedisResponse): StringifyRedisResponse {
  if (Array.isArray(result)) {
    return result.map(stringifyResult);
  }

  if (result instanceof Uint8Array) {
    return decoder.decode(result);
  }

  return result;
}
