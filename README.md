# `redis-on-workers`

Connect to your Redis server in Cloudflare Workers using `cloudflare:sockets`.

Use this package in Cloudflare Workers or Node.js with the [`cloudflare:sockets` for Node.js](https://github.com/Ethan-Arrowood/socket) implementation.

## Installation

```sh
npm install redis-on-workers
```

## Usage

The API has three methods: `send`, `sendRaw`, and `close`.

```ts
import { createRedis } from "redis-on-workers";

await using redis = createRedis("redis://<username>:<password>@<host>:<port>");

await redis.send("SET", "foo", "bar");

const value = await redis.send("GET", "foo");

console.log(value); // bar
```

`await using` closes the connection when the block ends. Without it, call `redis.close()` yourself.

Concurrent `send` calls share one connection. Each reply stays matched to its command.

### Raw Uint8Array

`sendRaw` skips string decoding. Use it for binary data, such as protobuf messages.

```ts
const value = await redis.sendRaw("GET", "foo");

console.log(new TextDecoder().decode(value)); // bar
```

### Error handling

A server error reply rejects its command with a `RedisError`. The connection stays open. A transport failure rejects with a plain `Error` and closes the connection.

```ts
import { RedisError } from "redis-on-workers";

try {
  await redis.send("MY_GO");
} catch (error) {
  if (error instanceof RedisError) console.log(error.message); // ERR unknown command 'MY_GO'
}
```

### Node.js

Install the `cloudflare:sockets` Node.js polyfill:

```sh
npm install @arrowood.dev/socket
```

## API

### `createRedis(options: RedisOptions | string): Redis`

Create a Redis client. It connects when you send the first command.

- `redis.send(...command)`: send a command, decode bulk strings in the reply.
- `redis.sendRaw(...command)`: send a command, keep bulk strings as `Uint8Array`.
- `redis.close()`: close the connection. The next `send` reconnects.

### `RedisOptions`

- `url` (string): The URL of the Redis server.
- `tls` (boolean): Whether to use TLS. Defaults to true for `rediss:` URLs.
- `logger` (function): A function to log debug messages.
- `connectFn` (function): Polyfill for `cloudflare:sockets`'s `connect` function if you're using it in node.js. Default: `undefined`.

## License

MIT
