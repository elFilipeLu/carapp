const Redis = require("ioredis");
const { REDIS_URL } = require("../config");
const { log } = require("./logger");

let redis = null;
let redisReady = false;

const mem = {
  kv: new Map(),
  list: new Map(),
};

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function memGet(key) {
  const item = mem.kv.get(key);
  if (!item) return null;
  if (item.expiresAt && item.expiresAt <= nowSeconds()) {
    mem.kv.delete(key);
    return null;
  }
  return item.value;
}

function memSet(key, value, ttlSeconds = 0) {
  const expiresAt = ttlSeconds > 0 ? nowSeconds() + ttlSeconds : 0;
  mem.kv.set(key, { value, expiresAt });
}

function ensureRedis() {
  if (!REDIS_URL) return null;
  if (redis) return redis;

  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  redis.on("ready", () => {
    redisReady = true;
    log("info", "redis_ready");
  });
  redis.on("error", (error) => {
    redisReady = false;
    log("error", "redis_error", { error: error.message });
  });

  redis.connect().catch(() => {
    redisReady = false;
  });
  return redis;
}

async function isRedisAvailable() {
  const client = ensureRedis();
  if (!client || !redisReady) return false;
  try {
    await client.ping();
    return true;
  } catch (_) {
    return false;
  }
}

async function getString(key) {
  if (await isRedisAvailable()) {
    return ensureRedis().get(key);
  }
  return memGet(key);
}

async function setString(key, value, ttlSeconds = 0) {
  if (await isRedisAvailable()) {
    if (ttlSeconds > 0) {
      await ensureRedis().set(key, value, "EX", ttlSeconds);
      return;
    }
    await ensureRedis().set(key, value);
    return;
  }
  memSet(key, value, ttlSeconds);
}

async function setIfNotExists(key, value, ttlSeconds = 0) {
  if (await isRedisAvailable()) {
    if (ttlSeconds > 0) {
      const out = await ensureRedis().set(key, value, "EX", ttlSeconds, "NX");
      return out === "OK";
    }
    const out = await ensureRedis().set(key, value, "NX");
    return out === "OK";
  }

  if (memGet(key) !== null) return false;
  memSet(key, value, ttlSeconds);
  return true;
}

async function incrWithWindow(key, windowSeconds) {
  if (await isRedisAvailable()) {
    const client = ensureRedis();
    const value = await client.incr(key);
    if (value === 1) {
      await client.expire(key, windowSeconds);
    }
    return value;
  }

  const current = Number(memGet(key) || 0) + 1;
  memSet(key, String(current), windowSeconds);
  return current;
}

async function listPushTrim(key, value, maxLen) {
  if (await isRedisAvailable()) {
    const client = ensureRedis();
    await client.lpush(key, value);
    await client.ltrim(key, 0, maxLen - 1);
    return;
  }
  const items = mem.list.get(key) || [];
  items.unshift(value);
  if (items.length > maxLen) items.length = maxLen;
  mem.list.set(key, items);
}

async function listRange(key, start, end) {
  if (await isRedisAvailable()) {
    return ensureRedis().lrange(key, start, end);
  }
  const items = mem.list.get(key) || [];
  const endInclusive = end < 0 ? items.length + end + 1 : end + 1;
  return items.slice(start, endInclusive);
}

function backendType() {
  return REDIS_URL ? (redisReady ? "redis" : "memory_fallback") : "memory";
}

module.exports = {
  getString,
  setString,
  setIfNotExists,
  incrWithWindow,
  listPushTrim,
  listRange,
  backendType,
};
