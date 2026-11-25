import { createHash } from "crypto";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000;

/**
 * In-memory cache with TTL for job search results.
 * Falls back to database cache for persistence across serverless instances.
 */
export class JobCache {
  /**
   * Get cached data or fetch and cache it.
   */
  static async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = DEFAULT_TTL,
  ): Promise<T> {
    const cacheKey = this.hash(key);
    const cached = cache.get(cacheKey) as CacheEntry<T> | undefined;

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const data = await fetcher();

    // Evict old entries if cache is too large
    if (cache.size >= MAX_CACHE_SIZE) {
      const oldest = Array.from(cache.entries())
        .sort((a, b) => a[1].createdAt - b[1].createdAt)
        .slice(0, cache.size - MAX_CACHE_SIZE + 1);
      oldest.forEach(([k]) => cache.delete(k));
    }

    cache.set(cacheKey, {
      data,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now(),
    });

    return data;
  }

  /**
   * Invalidate cache entries matching a pattern.
   */
  static invalidate(pattern?: string): void {
    if (!pattern) {
      cache.clear();
      return;
    }

    const hashed = this.hash(pattern);
    for (const key of cache.keys()) {
      if (key.includes(hashed)) {
        cache.delete(key);
      }
    }
  }

  /**
   * Get cache stats.
   */
  static stats() {
    const now = Date.now();
    const entries = Array.from(cache.values());
    return {
      size: cache.size,
      hits: entries.filter((e) => e.expiresAt > now).length,
      expired: entries.filter((e) => e.expiresAt <= now).length,
    };
  }

  private static hash(key: string): string {
    return createHash("sha256").update(key).digest("hex").slice(0, 16);
  }
}
