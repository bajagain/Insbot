export interface CachedItem<T> {
  data: T;
  expiresAt: number;
}

/**
 * Simple in-memory TTL cache. Redis is intentionally not used.
 * Everything here disappears on restart — that is the intended design.
 */
export class MemoryCache {
  private store = new Map<string, CachedItem<unknown>>();

  constructor(private readonly defaultTtlSeconds: number = 300) {}

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds = this.defaultTtlSeconds): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + Math.max(0, ttlSeconds) * 1000,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  /** Invalidate every key with the given prefix, e.g. "profile:". */
  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  clear(): void {
    this.store.clear();
  }

  /** Drop expired entries and return how many were removed. */
  prune(now = Date.now()): number {
    let removed = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.expiresAt) {
        this.store.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  get size(): number {
    return this.store.size;
  }
}

export const profileCache = new MemoryCache();
export const postsCache = new MemoryCache();
export const followingCache = new MemoryCache();

export const cacheKeys = {
  profile: (username: string) => `profile:${username.toLowerCase()}`,
  posts: (username: string) => `posts:${username.toLowerCase()}`,
  following: (username: string) => `following:${username.toLowerCase()}`,
};
