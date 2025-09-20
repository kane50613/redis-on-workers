const CRLF = "\r\n";

export function encodeCommand(args: Array<string | Uint8Array>) {
  const toWrite: Array<string | Uint8Array> = [];

  let strings = `*${args.length}${CRLF}`;

  for (const arg of args) {
    const encoder = new TextEncoder();

    if (typeof arg === "string") {
      strings += `$${encoder.encode(arg).byteLength}${CRLF}${arg}${CRLF}`;
    } else {
      toWrite.push(`${strings}$${arg.length}${CRLF}`, arg);
      strings = CRLF;
    }
  }

  toWrite.push(strings);

  return toWrite;
}
