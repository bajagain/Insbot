import { env } from "../config/env.js";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the caller may retry (0 when allowed). */
  retryAfterSeconds: number;
}

/**
 * Sliding-window rate limiter backed by an in-memory Map.
 * State resets on process restart — acceptable for the JSON-only build.
 */
export class RateLimiter {
  private requests = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowSeconds: number,
  ) {}

  check(key: string, now = Date.now()): RateLimitResult {
    const windowMs = this.windowSeconds * 1000;
    const cutoff = now - windowMs;
    const timestamps = (this.requests.get(key) ?? []).filter((t) => t > cutoff);

    if (timestamps.length >= this.limit) {
      const oldest = timestamps[0]!;
      const retryAfterMs = oldest + windowMs - now;
      this.requests.set(key, timestamps);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      };
    }

    timestamps.push(now);
    this.requests.set(key, timestamps);
    return {
      allowed: true,
      remaining: Math.max(0, this.limit - timestamps.length),
      retryAfterSeconds: 0,
    };
  }

  /** Drop timestamps outside the window and return keys still active. */
  prune(now = Date.now()): number {
    const cutoff = now - this.windowSeconds * 1000;
    let removed = 0;
    for (const [key, timestamps] of this.requests.entries()) {
      const active = timestamps.filter((t) => t > cutoff);
      if (active.length === 0) {
        this.requests.delete(key);
        removed += 1;
      } else {
        this.requests.set(key, active);
      }
    }
    return removed;
  }

  reset(): void {
    this.requests.clear();
  }
}

/** Per-Discord-user request limiter. */
export const userRateLimiter = new RateLimiter(
  env.USER_REQUEST_LIMIT,
  env.USER_REQUEST_WINDOW_SECONDS,
);

/**
 * Global outbound provider limiter. A single bucket shared by every
 * request, so Insbit stays well within its data source's allowance and
 * never tries to circumvent an upstream rate limit.
 */
export const providerRateLimiter = new RateLimiter(
  env.PROVIDER_REQUEST_LIMIT,
  env.PROVIDER_REQUEST_WINDOW_SECONDS,
);

export const PROVIDER_LIMIT_KEY = "provider:global";

