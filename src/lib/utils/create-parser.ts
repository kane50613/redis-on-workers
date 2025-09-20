// source: https://github.com/NodeRedis/node-redis-parser/blob/4c2d31c8717f05dea1ffd91a0e45d68f452c73bd/lib/parser.js#L315
// 1. replace node-only module "buffer" to "Uint8Array"
// 2. remove "string_decoder" module, just return Uint8Array
// 3. replace "redis-errors" with "Error"

import type { CreateParserOptions, RedisResponse } from "../../type";

let bufferPool: Uint8Array | undefined;
let bufferOffset = 0;
let interval: NodeJS.Timeout | undefined;
let counter = 0;
let notDecreased = 0;

function createParserContext(options: CreateParserOptions) {
  return {
    options,
    offset: 0,
    buffer: null as Uint8Array | null,
    bigStrSize: 0,
    totalChunkSize: 0,
    bufferCache: [] as Uint8Array[],
    arrayCache: [] as RedisResponse[],
    arrayPos: [] as number[],
  };
}

type ParserContext = ReturnType<typeof createParserContext>;

function pushArrayCache(
  parser: ParserContext,
  array: RedisResponse[],
  pos: number,
) {
  parser.arrayCache.push(array);
  parser.arrayPos.push(pos);
}

function parseLength(parser: ParserContext) {
  if (!parser.buffer) throw new Error("Buffer is null");

  const length = parser.buffer.length - 1;

  let offset = parser.offset;
  let number = 0;

  while (offset < length) {
    const c1 = parser.buffer[offset++];

    if (c1 === 13) {
      parser.offset = offset + 1;

      return number;
    }

    number = number * 10 + (c1 - 48);
  }
}

function parseBulkString(parser: ParserContext) {
  const length = parseLength(parser);

  if (length === undefined) return;

  if (length < 0) return null;

  const offset = parser.offset + length;

  if (!parser.buffer) throw new Error("Buffer is null");

  if (offset + 2 > parser.buffer.length) {
    parser.bigStrSize = offset + 2;
    parser.totalChunkSize = parser.buffer.length;
    parser.bufferCache.push(parser.buffer);
    return;
  }

  const start = parser.offset;

  parser.offset = offset + 2;

  return parser.buffer.slice(start, offset);
}

function parseSimpleString(parser: ParserContext) {
  const start = parser.offset;
  const buffer = parser.buffer;

  if (!buffer) throw new Error("Buffer is null");

  const length = buffer.length - 1;
  let offset = start;

  while (offset < length) {
    if (buffer[offset++] === 13) {
      // \r\n
      parser.offset = offset + 1;

      return buffer.slice(start, offset - 1);
    }
  }
}

function parseArray(parser: ParserContext) {
  const length = parseLength(parser);
  if (length === undefined) return;

  if (length < 0) return null;

  const responses = new Array(length);

  return parseArrayElements(parser, responses, 0);
}

function parseSimpleNumbers(parser: ParserContext) {
  if (!parser.buffer) throw new Error("Buffer is null");

  const length = parser.buffer.length - 1;
  let offset = parser.offset;
  let number = 0;
  let sign = 1;

  if (parser.buffer[offset] === 45) {
    sign = -1;
    offset++;
  }

  while (offset < length) {
    const c1 = parser.buffer[offset++];

    if (c1 === 13) {
      // \r\n
      parser.offset = offset + 1;
      return sign * number;
    }

    number = number * 10 + (c1 - 48);
  }
}

function parseError(parser: ParserContext) {
  return new Error(
    new TextDecoder().decode(parseSimpleString(parser)) || "Unknown error",
  );
}

function handleError(parser: ParserContext, type: number) {
  const err = new Error(
    `Protocol error, got ${JSON.stringify(String.fromCharCode(type))} as reply type byte: ${JSON.stringify(parser.buffer)} at offset ${parser.offset}`,
  );

  parser.buffer = null;
  parser.options.onError(err);
}

function parseType(parser: ParserContext, type: number) {
  switch (type) {
    case 36:
      return parseBulkString(parser);
    case 43:
      return parseSimpleString(parser);
    case 42:
      return parseArray(parser);
    case 58:
      return parseSimpleNumbers(parser);
    case 45:
      return parseError(parser);
    default:
      return handleError(parser, type);
  }
}

function parseArrayElements(
  parser: ParserContext,
  responses: RedisResponse[],
  startIndex: number,
) {
  if (!parser.buffer) throw new Error("Buffer is null");

  if (!Array.isArray(responses)) throw new Error("Responses is not an array");

  const bufferLength = parser.buffer.length;

  let index = startIndex;

  while (index < responses.length) {
    const offset = parser.offset;

    if (parser.offset >= bufferLength)
      return pushArrayCache(parser, responses, index);

    const response = parseType(parser, parser.buffer[parser.offset++]);

    if (response === undefined) {
      if (!(parser.arrayCache.length > 0 || parser.bufferCache.length > 0)) {
        parser.offset = offset;
      }

      return pushArrayCache(parser, responses, index);
    }

    responses[index] = response;
    index++;
  }

  return responses;
}

function parseArrayChunks(parser: ParserContext) {
  const tmp = parser.arrayCache.pop() as RedisResponse[];
  let pos = parser.arrayPos.pop();

  if (!Array.isArray(tmp) || pos === undefined)
    throw new Error("Array cache is empty");

  if (parser.arrayCache.length > 0) {
    const res = parseArrayChunks(parser);

    if (!res) return pushArrayCache(parser, tmp, pos);

    tmp[pos++] = res;
  }

  return parseArrayElements(parser, tmp, pos);
}

function decreaseBufferPool() {
  if (bufferPool && bufferPool.length > 50 * 1024) {
    if (counter === 1 || notDecreased > counter * 2) {
      const minSliceLen = Math.floor(bufferPool.length / 10);
      const sliceLength =
        minSliceLen < bufferOffset ? bufferOffset : minSliceLen;
      bufferOffset = 0;
      bufferPool = bufferPool.subarray(sliceLength, bufferPool.length);
    } else {
      notDecreased++;
      counter--;
    }
  } else {
    clearInterval(interval);

    counter = 0;
    notDecreased = 0;
    interval = undefined;
  }
}

function resizeBuffer(length: number) {
  if (bufferPool && bufferPool.length >= length + bufferOffset) {
    return;
  }

  const multiplier = length > 1024 * 1024 * 75 ? 2 : 3;

  if (bufferOffset > 1024 * 1024 * 111) {
    bufferOffset = 1024 * 1024 * 50;
  }

  bufferPool = new Uint8Array(length * multiplier + bufferOffset);
  bufferOffset = 0;
  counter++;

  if (interval === null) {
    interval = setInterval(decreaseBufferPool, 50);
  }
}

function concatBulkBuffer(parser: ParserContext) {
  const list = parser.bufferCache;
  const oldOffset = parser.offset;
  const length = parser.bigStrSize - oldOffset - 2;

  let chunks = list.length;
  let offset = parser.bigStrSize - parser.totalChunkSize;

  parser.offset = offset;

  if (offset <= 2) {
    if (chunks === 2) {
      return list[0].slice(oldOffset, list[0].length + offset - 2);
    }

    chunks--;
    offset = list[list.length - 2].length + offset;
  }

  resizeBuffer(length);
  const start = bufferOffset;

  if (!bufferPool) throw new Error("Buffer pool is null");

  bufferPool.set(list[0].subarray(oldOffset), start);

  bufferOffset += list[0].length - oldOffset;

  for (const chunk of list.slice(1, chunks - 1)) {
    bufferPool.set(chunk, bufferOffset);

    bufferOffset += chunk.length;
  }

  bufferPool.set(list[chunks - 1].subarray(0, offset - 2), bufferOffset);
  bufferOffset += offset - 2;

  return bufferPool.subarray(start, bufferOffset);
}

function handleInitialBuffer(context: ParserContext, buffer: Uint8Array) {
  context.buffer = buffer;
  context.offset = 0;
}

function handleBufferConcatenation(
  context: ParserContext,
  buffer: Uint8Array,
  options: CreateParserOptions,
) {
  if (!context.buffer) throw new Error("Buffer is null");

  const oldLength = context.buffer.length;
  const remainingLength = oldLength - context.offset;

  const newBuffer = new Uint8Array(remainingLength + buffer.length);

  newBuffer.set(context.buffer.subarray(context.offset, oldLength));
  newBuffer.set(buffer, remainingLength);

  context.buffer = newBuffer;
  context.offset = 0;

  if (context.arrayCache.length > 0) {
    const arr = parseArrayChunks(context);

    if (arr === undefined) {
      return false;
    }

    options.onReply(arr);
  }

  return true;
}

function handleLargeStringCompletion(
  context: ParserContext,
  buffer: Uint8Array,
  options: CreateParserOptions,
) {
  context.bufferCache.push(buffer);

  let tmp: RedisResponse = concatBulkBuffer(context);

  context.bigStrSize = 0;
  context.bufferCache = [];
  context.buffer = buffer;

  if (context.arrayCache.length > 0) {
    (context.arrayCache[0] as RedisResponse[])[context.arrayPos[0]++] = tmp;
    const result = parseArrayChunks(context);

    if (!result) return false;

    tmp = result;
  }

  if (tmp !== undefined) options.onReply(tmp);
  return true;
}

function handleBufferCaching(context: ParserContext, buffer: Uint8Array) {
  context.bufferCache.push(buffer);
  context.totalChunkSize += buffer.length;
}

function processParsedResponses(
  context: ParserContext,
  options: CreateParserOptions,
) {
  if (!context.buffer) throw new Error("Buffer is null");

  while (context.offset < context.buffer.length) {
    const offset = context.offset;
    const type = context.buffer[context.offset++];
    const response = parseType(context, type);

    if (response === undefined) {
      if (!(context.arrayCache.length > 0 || context.bufferCache.length > 0)) {
        context.offset = offset;
      }

      return false;
    }

    if (response instanceof Error) {
      options.onError(response);
    } else {
      options.onReply(response);
    }
  }

  return true;
}

export function createParser(options: CreateParserOptions) {
  const context = createParserContext(options);

  return function execute(buffer: Uint8Array) {
    let shouldContinue = true;

    if (context.buffer === null) {
      handleInitialBuffer(context, buffer);
    } else if (context.bigStrSize === 0) {
      shouldContinue = handleBufferConcatenation(context, buffer, options);
    } else if (context.totalChunkSize + buffer.length >= context.bigStrSize) {
      shouldContinue = handleLargeStringCompletion(context, buffer, options);
    } else {
      handleBufferCaching(context, buffer);
      return;
    }

    if (!shouldContinue) return;

    const completed = processParsedResponses(context, options);
    if (completed) {
      context.buffer = null;
    }
  };
}
