## redis-on-workers@0.5.0

### Rewrite the client around a pull-based RESP decoder

The API shrinks to `send`, `sendRaw`, `close`, and `await using`. `sendOnce`, `sendOnceRaw`, `pipeline`, `isConnected`, `connection()`, and `RedisInstance` are gone. Use `await using` and `Promise.all` instead. A server error reply rejects its command with a `RedisError` and keeps the connection open. A transport failure closes the connection.

### Export option and response types from the package entry

`RedisOptions`, `RedisResponse`, and the other public types are now importable from `redis-on-workers` instead of living only inside the package.

# redis-on-workers

## 0.4.2

### Patch Changes

- 55e8c46: improve redis connection stability, add ACL auth support, optimize encoding
- b4ebcf5: isolate pending replies per send call to avoid `Promise.all` mixups

## 0.4.1

### Patch Changes

- 7c7e34c: setup trusted publisher on npm

## 0.4.0

### Minor Changes

- 5b41b38: remove `connected` getter, add async `isConnected`

### Patch Changes

- 41e9edb: remove unused `Redis` type
- 10e18d2: remove global variables in create-parser
