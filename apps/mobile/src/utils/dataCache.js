import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEYS = {
  USER_STATS: "cache:user_stats",
  WATER_HISTORY: "cache:water_history",
  DAILY_GOAL: "cache:daily_goal",
  NOTIFICATION_SETTINGS: "cache:notification_settings",
  WATER_TODAY: "cache:water_today",
};

const CACHE_DURATION = {
  USER_STATS: 5 * 60 * 1000, // 5 minutes
  WATER_HISTORY: 5 * 60 * 1000, // 5 minutes
  DAILY_GOAL: 30 * 60 * 1000, // 30 minutes
  NOTIFICATION_SETTINGS: 30 * 60 * 1000, // 30 minutes
  WATER_TODAY: 2 * 60 * 1000, // 2 minutes
};

/**
 * Get data from cache
 * @param {string} key - Cache key from CACHE_KEYS
 * @returns {Promise<any|null>} - Cached data or null if not found/expired
 */
export async function getCache(key) {
  // Validate key
  if (!key || typeof key !== "string") {
    console.error(`Invalid cache key provided to getCache:`, key);
    return null;
  }

  try {
    const cached = await AsyncStorage.getItem(key);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();
    const duration =
      CACHE_DURATION[key.replace("cache:", "").toUpperCase()] || 5 * 60 * 1000;

    // Check if cache is expired
    if (now - timestamp > duration) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Error reading cache for ${key}:`, error);
    return null;
  }
}

/**
 * Set data in cache
 * @param {string} key - Cache key from CACHE_KEYS
 * @param {any} data - Data to cache
 */
export async function setCache(key, data) {
  // Validate key
  if (!key || typeof key !== "string") {
    console.error(`Invalid cache key provided to setCache:`, key);
    return;
  }

  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error(`Error writing cache for ${key}:`, error);
  }
}

/**
 * Clear specific cache key
 * @param {string} key - Cache key from CACHE_KEYS
 */
export async function clearCache(key) {
  // Validate key
  if (!key || typeof key !== "string") {
    console.error(`Invalid cache key provided to clearCache:`, key);
    return;
  }

  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`Error clearing cache for ${key}:`, error);
  }
}

/**
 * Clear all related caches when water is added/removed
 */
export async function invalidateWaterCaches() {
  try {
    await Promise.all([
      clearCache(CACHE_KEYS.USER_STATS),
      clearCache(CACHE_KEYS.WATER_HISTORY),
      clearCache(CACHE_KEYS.WATER_TODAY),
    ]);
  } catch (error) {
    console.error("Error invalidating water caches:", error);
  }
}

/**
 * Clear all caches
 */
export async function clearAllCaches() {
  try {
    await Promise.all(Object.values(CACHE_KEYS).map((key) => clearCache(key)));
  } catch (error) {
    console.error("Error clearing all caches:", error);
  }
}

export { CACHE_KEYS };
