/**
 * Cache layer.
 *
 *  - Redis (ioredis) when REDIS_URL is set
 *  - in-memory Map with TTL otherwise (same get/set/del API)
 */
const Redis = require('ioredis');

let client = null;
let useRedis = false;
const memory = new Map();

async function initCache() {
  if (process.env.REDIS_URL) {
    try {
      client = new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // don't hammer a dead Redis
      });
      await client.connect();
      useRedis = true;
      console.log('[cache] Connected to Redis');
    } catch (err) {
      console.warn('[cache] Redis unavailable, falling back to in-memory cache:', err.message);
      useRedis = false;
    }
  } else {
    console.log('[cache] Using in-memory cache (set REDIS_URL for Redis)');
  }
  return useRedis;
}

async function get(key) {
  if (useRedis) {
    return client.get(key);
  }
  const entry = memory.get(key);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    memory.delete(key);
    return null;
  }
  return entry.value;
}

/** set(key, value, ttlSeconds) — ttlSeconds optional */
async function set(key, value, ttlSeconds = 60) {
  if (useRedis) {
    if (ttlSeconds) return client.set(key, value, 'EX', ttlSeconds);
    return client.set(key, value);
  }
  memory.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0,
  });
  return 'OK';
}

async function del(key) {
  if (useRedis) return client.del(key);
  memory.delete(key);
  return 1;
}

/** Cache helper: get-or-compute with TTL. */
async function remember(key, ttlSeconds, compute) {
  const hit = await get(key);
  if (hit !== null) return JSON.parse(hit);
  const value = await compute();
  await set(key, JSON.stringify(value), ttlSeconds);
  return value;
}

module.exports = { initCache, get, set, del, remember, get isRedis() { return useRedis; } };
