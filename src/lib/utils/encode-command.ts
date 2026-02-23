const CRLF = "\r\n";
const encoder = new TextEncoder();
const crlfBytes = encoder.encode(CRLF);

export function encodeCommand(args: Array<string | Uint8Array>): Uint8Array[] {
  const chunks: Uint8Array[] = [encoder.encode(`*${args.length}${CRLF}`)];

  for (const arg of args) {
    if (typeof arg === "string") {
      const encodedArg = encoder.encode(arg);
      chunks.push(encoder.encode(`$${encodedArg.length}${CRLF}`));
      chunks.push(encodedArg);
      chunks.push(crlfBytes);
      continue;
    }

    chunks.push(encoder.encode(`$${arg.length}${CRLF}`));
    chunks.push(arg);
    chunks.push(crlfBytes);
  }

  return chunks;
}
