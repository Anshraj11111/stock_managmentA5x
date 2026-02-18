// Simple in-memory cache middleware
const cache = new Map();

export const cacheMiddleware = (duration = 30) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Create cache key from URL and user
    const key = `${req.user?.shop_id || 'guest'}_${req.originalUrl}`;
    
    // Check if cached
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < duration * 1000) {
      return res.json(cached.data);
    }

    // Store original json function
    const originalJson = res.json.bind(res);
    
    // Override json function to cache response
    res.json = (data) => {
      cache.set(key, {
        data,
        timestamp: Date.now()
      });
      
      // Clean old cache entries (keep last 100)
      if (cache.size > 100) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      
      return originalJson(data);
    };

    next();
  };
};

// Clear cache for specific shop
export const clearShopCache = (shopId) => {
  for (const key of cache.keys()) {
    if (key.startsWith(`${shopId}_`)) {
      cache.delete(key);
    }
  }
};

// Clear all cache
export const clearAllCache = () => {
  cache.clear();
};
