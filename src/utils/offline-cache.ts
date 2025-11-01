/**
 * Offline Cache Utility
 * 
 * Provides caching for API responses to support offline functionality
 * when the server is not accessible.
 */

const CACHE_VERSION = 'v1';
const CACHE_EXPIRY = 1000 * 60 * 60 * 24; // 24 hours

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: string;
}

/**
 * Save data to offline cache
 */
export function saveToCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };
    
    localStorage.setItem(`cache:${key}`, JSON.stringify(entry));
  } catch (error) {
    console.warn('[Offline Cache] Failed to save to cache:', error);
  }
}

/**
 * Get data from offline cache
 */
export function getFromCache<T>(key: string, maxAge = CACHE_EXPIRY): T | null {
  try {
    const cached = localStorage.getItem(`cache:${key}`);
    
    if (!cached) {
      return null;
    }
    
    const entry: CacheEntry<T> = JSON.parse(cached);
    
    // Check version
    if (entry.version !== CACHE_VERSION) {
      console.log('[Offline Cache] Cache version mismatch, ignoring');
      localStorage.removeItem(`cache:${key}`);
      return null;
    }
    
    // Check expiry
    const age = Date.now() - entry.timestamp;
    if (age > maxAge) {
      console.log('[Offline Cache] Cache expired, ignoring');
      localStorage.removeItem(`cache:${key}`);
      return null;
    }
    
    console.log('[Offline Cache] ✅ Using cached data for:', key, `(age: ${Math.round(age / 1000)}s)`);
    return entry.data;
  } catch (error) {
    console.warn('[Offline Cache] Failed to read from cache:', error);
    return null;
  }
}

/**
 * Clear specific cache entry
 */
export function clearCache(key: string): void {
  try {
    localStorage.removeItem(`cache:${key}`);
  } catch (error) {
    console.warn('[Offline Cache] Failed to clear cache:', error);
  }
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache:')) {
        localStorage.removeItem(key);
      }
    });
    console.log('[Offline Cache] All cache cleared');
  } catch (error) {
    console.warn('[Offline Cache] Failed to clear all cache:', error);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  entries: number;
  totalSize: number;
  oldestEntry: number | null;
} {
  let entries = 0;
  let totalSize = 0;
  let oldestTimestamp: number | null = null;
  
  try {
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.startsWith('cache:')) {
        entries++;
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += value.length;
          
          try {
            const entry = JSON.parse(value);
            if (!oldestTimestamp || entry.timestamp < oldestTimestamp) {
              oldestTimestamp = entry.timestamp;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    });
  } catch (error) {
    console.warn('[Offline Cache] Failed to get cache stats:', error);
  }
  
  return {
    entries,
    totalSize,
    oldestEntry: oldestTimestamp,
  };
}
