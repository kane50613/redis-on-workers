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

const redis = createRedis("redis://<username>:<password>@<host>:<port>");

await redis.send("SET", "foo", "bar");

const value = await redis.send("GET", "foo");

console.log(value); // bar

// remember to close the connection after use, or use `redis.sendOnce`.
await redis.close();
```

### Raw Uint8Array

This is useful if you want to store binary data. For example, you can store protobuf messages in Redis.

```ts
import { createRedis } from "redis-on-workers";

const redis = createRedis("redis://<username>:<password>@<host>:<port>");

await redis.sendRaw("SET", "foo", "bar");

const value = await redis.sendRawOnce("GET", "foo");

const decoder = new TextDecoder();

console.log(decoder.decode(value)); // bar
```

### Node.js

Please install the node.js polyfill for `cloudflare:sockets` to use this package in node.js.

```sh
npm install @arrowood.dev/socket
```

## API

### `createRedis(options: CreateRedisOptions | string): RedisInstance`

Create a new Redis client, does NOT connect to the server yet, the connection will be established when the first command is sent.

Or you can start connection immediately by using `redis.startConnection()`.

### `CreateRedisOptions`

- `url` (string): The URL of the Redis server.
- `tls` (boolean): Whether to use TLS. Default: `false`.
- `logger` (function): A function to log debug messages.
- `connectFn` (function): Polyfill for `cloudflare:sockets`'s `connect` function if you're using it in node.js. Default: `undefined`.
