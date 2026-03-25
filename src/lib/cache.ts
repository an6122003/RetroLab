/**
 * Client-side cache for user data — reduces Supabase API calls.
 *
 * Strategy:
 *  - Profile/settings: cached for 5 minutes (rarely changes)
 *  - Liked/saved slugs: cached for 2 minutes (changes on user action)
 *  - Like counts: cached for 1 minute (changes from other users)
 *  - On write (like/unlike/save/unsave), the relevant cache key is
 *    invalidated immediately — no stale UI.
 *
 * Storage: localStorage (persists across page navigations, cleared on logout).
 * Fallback: if localStorage is unavailable, cache is a no-op and every
 *           call goes to the network (graceful degradation).
 */

const PREFIX = 'rl_cache_';

interface CacheEntry<T> {
  data: T;
  /** Unix timestamp (ms) when this entry expires */
  expiresAt: number;
}

/** Default TTLs in milliseconds */
export const TTL = {
  PROFILE: 5 * 60 * 1000,       // 5 min
  SETTINGS: 5 * 60 * 1000,      // 5 min
  LIKED_SLUGS: 2 * 60 * 1000,   // 2 min
  SAVED_SLUGS: 2 * 60 * 1000,   // 2 min
  LIKE_COUNT: 60 * 1000,         // 1 min
  LIKED_STATUS: 2 * 60 * 1000,  // 2 min
  SAVED_STATUS: 2 * 60 * 1000,  // 2 min
} as const;

function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__rl_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const storageAvailable = typeof window !== 'undefined' && isLocalStorageAvailable();

/**
 * Get a cached value. Returns undefined if expired or missing.
 */
export function cacheGet<T>(key: string): T | undefined {
  if (!storageAvailable) return undefined;

  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return undefined;

    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(PREFIX + key);
      return undefined;
    }
    return entry.data;
  } catch {
    return undefined;
  }
}

/**
 * Set a cached value with a TTL.
 */
export function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  if (!storageAvailable) return;

  try {
    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + ttlMs,
    };
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage full — silently fail, network fallback works fine
  }
}

/**
 * Invalidate a specific cache key.
 */
export function cacheInvalidate(key: string): void {
  if (!storageAvailable) return;
  localStorage.removeItem(PREFIX + key);
}

/**
 * Invalidate all cache keys matching a prefix pattern.
 * Used when user logs out or to clear all like/save state.
 */
export function cacheInvalidatePattern(pattern: string): void {
  if (!storageAvailable) return;

  const fullPrefix = PREFIX + pattern;
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(fullPrefix)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

/**
 * Clear ALL RetroLab cache entries.
 * Called on logout.
 */
export function cacheClearAll(): void {
  if (!storageAvailable) return;

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

/* ═══════════════════════════════════════════
   Convenience key helpers
   ═══════════════════════════════════════════ */

export const cacheKeys = {
  profile: (userId: string) => `profile:${userId}`,
  settings: (userId: string) => `settings:${userId}`,
  likedSlugs: (userId: string) => `liked_slugs:${userId}`,
  savedSlugs: (userId: string) => `saved_slugs:${userId}`,
  likeCount: (postSlug: string) => `like_count:${postSlug}`,
  likedStatus: (userId: string, postSlug: string) => `liked:${userId}:${postSlug}`,
  savedStatus: (userId: string, postSlug: string) => `saved:${userId}:${postSlug}`,
};
