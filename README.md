# redis-on-workers

Connect to your Redis server using `cloudflare:sockets`.

This package is designed to work with Cloudflare Workers, but it can also be used in node.js thanks to the implementation of [`cloudflare:sockets` for node.js](https://github.com/Ethan-Arrowood/socket).

## Installation

```sh
npm install redis-on-workers
```

## Usage

### Minimal

This is the minimal example to connect to a Redis server.

```ts
import { createRedis } from "redis-on-workers";

const redis = createRedis({
  url: "redis://<username>:<password>@<host>:<port>",
});

await redis("SET", "foo", "bar");

const value = await redis("GET", "foo");

console.log(value); // bar
```

### Raw buffer

This is useful if you want to store binary data. For example, you can store protobuf messages in Redis.

```ts
import { createRedis } from "redis-on-workers";

const redis = createRedis({
  url: "redis://<username>:<password>@<host>:<port>",
});

await redis.raw("SET", "foo", "bar");

const value = await redis.raw("GET", "foo");

console.log(value); // <Buffer 62 61 72>
```

## API

### `createRedis(options: RedisOptions): Redis`

Create a new Redis client, does NOT connect to the server yet, the connection will be established when the first command is sent.

### `RedisOptions`

- `url` (string): The URL of the Redis server.
- `tls` (boolean): Whether to use TLS. Default: `false`.
- `logger` (function): A function to log debug messages.
- `connectFn` (function): Polyfill for `cloudflare:sockets`'s `connect` function if you're using it in node.js. Default: `undefined`.
