const CACHE_PREFIX = 'caremaster_offline_';
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function cacheKey(key) {
  return `${CACHE_PREFIX}${key}`;
}

export const offlineCache = {
  /**
   * Store a value in the offline cache with optional TTL.
   * @param {string} key
   * @param {any} value
   * @param {number} ttlMs
   */
  set(key, value, ttlMs = DEFAULT_TTL_MS) {
    try {
      const item = {
        value,
        storedAt: Date.now(),
        ttlMs,
      };
      localStorage.setItem(cacheKey(key), JSON.stringify(item));
    } catch (e) {
      // Ignore cache write failures (e.g. storage quota exceeded)
    }
  },

  /**
   * Retrieve a value from the offline cache. Returns null if missing or expired.
   * @param {string} key
   * @returns {any|null}
   */
  get(key) {
    try {
      const raw = localStorage.getItem(cacheKey(key));
      if (!raw) return null;
      const item = JSON.parse(raw);
      if (!item || Date.now() - item.storedAt > item.ttlMs) {
        this.remove(key);
        return null;
      }
      return item.value;
    } catch (e) {
      this.remove(key);
      return null;
    }
  },

  /**
   * Remove an item from the cache.
   * @param {string} key
   */
  remove(key) {
    try {
      localStorage.removeItem(cacheKey(key));
    } catch (e) {
      // Ignore
    }
  },

  /**
   * Clear the entire offline cache.
   */
  clear() {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith(CACHE_PREFIX))
        .forEach(k => localStorage.removeItem(k));
    } catch (e) {
      // Ignore
    }
  },

  /**
   * Build a cache key for an API GET request.
   * @param {string} path
   * @param {object} params
   * @returns {string}
   */
  keyForRequest(path, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(k => `${k}=${JSON.stringify(params[k])}`)
      .join('&');
    return `${path}${sortedParams ? `?${sortedParams}` : ''}`;
  },

  /**
   * Simple online check that works in browser and Capacitor WebView.
   * @returns {boolean}
   */
  isOnline() {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  },
};
