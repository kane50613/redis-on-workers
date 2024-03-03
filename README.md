# redis-on-worker

Connect to your Redis server using cloudflare:sockets

## Installation

```sh
npm install redis-on-worker
```

## Usage

```ts
import { createRedis } from "redis-on-worker";

const redis = createRedis({
  url: "redis://<username>:<password>@<host>:<port>",
});

await redis("SET", "foo", "bar");

const value = await redis("GET", "foo");

console.log(value); // bar
```
