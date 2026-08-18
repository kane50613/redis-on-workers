---
packages:
  redis-on-workers:
    type: minor
---

### Export option and response types from the package entry

`RedisOptions`, `RedisResponse`, and the other public types are now importable from `redis-on-workers` instead of living only inside the package.
