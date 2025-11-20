/**
 * Cache Manager Utility
 * Provides in-memory caching with TTL (Time To Live) support
 */

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, value, ttl = this.defaultTTL) {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, {
      value,
      expiresAt
    });
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or null if not found or expired
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Check if a key exists in cache and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is valid
   */
  has(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from cache
   * @param {string} key - Cache key
   * @returns {boolean} True if key was deleted
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   * @returns {number} Number of entries cleared
   */
  clearExpired() {
    const now = Date.now();
    let cleared = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Get cache size
   * @returns {number} Number of entries in cache
   */
  size() {
    return this.cache.size;
  }

  /**
   * Get all cache keys
   * @returns {Array<string>} Array of cache keys
   */
  keys() {
    return Array.from(this.cache.keys());
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

// Auto-cleanup expired entries every minute
if (typeof window !== 'undefined') {
  setInterval(() => {
    cacheManager.clearExpired();
  }, 60 * 1000);
}

/**
 * Cache API response
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Function that returns a Promise
 * @param {number} ttl - Time to live in milliseconds (optional)
 * @returns {Promise<*>} Cached or fresh data
 */
export const cachedFetch = async (key, fetchFn, ttl) => {
  // Check cache first
  const cached = cacheManager.get(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  try {
    const data = await fetchFn();
    cacheManager.set(key, data, ttl);
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Cache with custom key generator
 * @param {Function} keyGenerator - Function that generates cache key from arguments
 * @param {Function} fetchFn - Function that returns a Promise
 * @param {number} ttl - Time to live in milliseconds (optional)
 * @returns {Function} Cached function
 */
export const createCachedFunction = (keyGenerator, fetchFn, ttl) => {
  return async (...args) => {
    const key = keyGenerator(...args);
    return cachedFetch(key, () => fetchFn(...args), ttl);
  };
};

export default cacheManager;

