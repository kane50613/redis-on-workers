import { CreateParserOptions } from "./type";

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
    arrayCache: [] as any[],
    arrayPos: [] as number[],
  };
}

type ParserContext = ReturnType<typeof createParserContext>;

function pushArrayCache(parser: ParserContext, array: any[], pos: number) {
  parser.arrayCache.push(array);
  parser.arrayPos.push(pos);
}

function parseLength(parser: ParserContext) {
  if (!parser.buffer) throw new Error("Buffer is null");

  const length = parser.buffer.length - 1;

  let offset = parser.offset,
    number = 0;

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

      return parser.buffer?.slice(start, offset - 1);
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
  let offset = parser.offset,
    number = 0,
    sign = 1;

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
  let string = parseSimpleString(parser);

  if (string !== undefined) {
    return new Error(string.toString());
  }
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
  responses: any[],
  i: number,
) {
  if (!parser.buffer) throw new Error("Buffer is null");

  if (!Array.isArray(responses)) throw new Error("Responses is not an array");

  const bufferLength = parser.buffer.length;

  while (i < responses.length) {
    const offset = parser.offset;

    if (parser.offset >= bufferLength)
      return pushArrayCache(parser, responses, i);

    const response = parseType(parser, parser.buffer[parser.offset++]);

    if (response === undefined) {
      if (!(parser.arrayCache.length || parser.bufferCache.length)) {
        parser.offset = offset;
      }

      return pushArrayCache(parser, responses, i);
    }

    responses[i] = response;
    i++;
  }

  return responses;
}

function parseArrayChunks(parser: ParserContext) {
  const tmp = parser.arrayCache.pop();
  let pos = parser.arrayPos.pop();

  if (!tmp || pos === undefined) throw new Error("Array cache is empty");

  if (parser.arrayCache.length) {
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

export function createParser(options: CreateParserOptions) {
  const context = createParserContext(options);

  return function execute(buffer: Uint8Array) {
    if (context.buffer === null) {
      context.buffer = buffer;
      context.offset = 0;
    } else if (context.bigStrSize === 0) {
      const oldLength = context.buffer.length;
      const remainingLength = oldLength - context.offset;

      const newBuffer = new Uint8Array(remainingLength + context.buffer.length);

      newBuffer.set(context.buffer.subarray(context.offset, oldLength));
      newBuffer.set(buffer, remainingLength);

      context.offset = 0;

      if (context.arrayCache.length) {
        const arr = parseArrayChunks(context);

        if (arr === undefined) {
          return;
        }

        options.onReply(arr);
      }
    } else if (context.totalChunkSize + buffer.length >= context.bigStrSize) {
      context.bufferCache.push(buffer);

      let tmp = concatBulkBuffer(context) as Uint8Array | undefined;

      context.bigStrSize = 0;
      context.bufferCache = [];
      context.buffer = buffer;

      if (context.arrayCache.length) {
        context.arrayCache[0][context.arrayPos[0]++] = tmp;
        tmp = parseArrayChunks(context) as Uint8Array | undefined;

        if (!tmp) return;
      }

      if (tmp !== undefined) options.onReply(tmp);
    } else {
      context.bufferCache.push(buffer);
      context.totalChunkSize += buffer.length;
      return;
    }

    while (context.offset < context.buffer.length) {
      const offset = context.offset;
      const type = context.buffer[context.offset++];
      const response = parseType(context, type);

      if (response === undefined) {
        if (!(context.arrayCache.length || context.bufferCache.length)) {
          context.offset = offset;
        }

        return;
      }

      if (response instanceof Error) {
        options.onError(response);
      } else {
        options.onReply(response);
      }
    }

    context.buffer = null;
  };
}
