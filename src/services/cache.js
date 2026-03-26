function createCache(ttlMs) {
  let payload = null;
  let expiresAt = 0;

  async function getOrSet(loadFn) {
    const now = Date.now();
    if (payload && now < expiresAt) return payload;
    payload = await loadFn();
    expiresAt = now + ttlMs;
    return payload;
  }

  function clear() {
    payload = null;
    expiresAt = 0;
  }

  return {
    getOrSet,
    clear,
  };
}

module.exports = {
  createCache,
};
