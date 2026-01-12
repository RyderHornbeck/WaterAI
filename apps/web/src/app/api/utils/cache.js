// Phase 3: In-memory cache for hot data (user settings, daily goals)
// Simple LRU cache implementation with TTL

class CacheEntry {
  constructor(value, ttl) {
    this.value = value;
    this.expiresAt = Date.now() + ttl;
  }

  isExpired() {
    return Date.now() > this.expiresAt;
  }
}

class MemoryCache {
  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  set(key, value, ttl = 60000) {
    // Default 60 seconds TTL
    // If cache is full, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, new CacheEntry(value, ttl));
  }

  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (entry.isExpired()) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  delete(key) {
    this.cache.delete(key);
  }

  invalidatePattern(pattern) {
    // Invalidate all keys matching a pattern (e.g., "user:123:*")
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern.replace("*", ""))) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

// Global cache instance
const globalCache = new MemoryCache(2000); // Store up to 2000 entries

export default globalCache;

// Helper functions for common cache patterns
export function userSettingsCacheKey(userId) {
  return `user:${userId}:settings`;
}

export function dailyStatsCacheKey(userId, date) {
  return `user:${userId}:daily:${date}`;
}

export function waterHistoryCacheKey(userId) {
  return `user:${userId}:history`;
}

export function invalidateUserCaches(userId) {
  globalCache.invalidatePattern(`user:${userId}:*`);
}
