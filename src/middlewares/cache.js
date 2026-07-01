// ─────────────────────────────────────────────────────────────────────────────
// Improved in-memory response cache with LRU eviction
// ─────────────────────────────────────────────────────────────────────────────
const cache   = new Map();
const MAX_ENTRIES = 500; // up from 100

/**
 * cacheMiddleware(duration) — GET-only response cache
 * Cache key = shopId + full URL (includes query params)
 * On cache hit: returns immediately, no DB hit
 */
export const cacheMiddleware = (duration = 30) => {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();

    const key = `${req.user?.shop_id || 'pub'}_${req.originalUrl}`;

    const cached = cache.get(key);
    if (cached && Date.now() - cached.ts < duration * 1000) {
      // Move to end (LRU touch)
      cache.delete(key);
      cache.set(key, cached);
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached.data);
    }

    // Intercept response
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      // Only cache successful responses
      if (res.statusCode < 400) {
        // LRU eviction — remove oldest when full
        if (cache.size >= MAX_ENTRIES) {
          const oldestKey = cache.keys().next().value;
          cache.delete(oldestKey);
        }
        cache.set(key, { data, ts: Date.now() });
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(data);
    };

    next();
  };
};

// ─── Cache invalidation helpers ──────────────────────────────────────────────

/** Clear all cached responses for a shop */
export const clearShopCache = (shopId) => {
  const prefix = `${shopId}_`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
};

/** Clear all cache */
export const clearAllCache = () => cache.clear();

/** Get cache stats */
export const getCacheStats = () => ({
  size: cache.size,
  maxSize: MAX_ENTRIES,
  keys: [...cache.keys()].slice(0, 20), // first 20 for debugging
});
