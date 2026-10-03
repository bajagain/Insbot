import { env } from "../config/env.js";
import { getProvider } from "../instagram/provider.js";
import { normalizeUsername } from "../instagram/validator.js";
import type { InstagramPost } from "../instagram/types.js";
import { postsCache, cacheKeys } from "../cache/memoryCache.js";
import { providerRateLimiter, PROVIDER_LIMIT_KEY } from "../security/rateLimiter.js";
import { DataUnavailableError, ProviderRateLimitError } from "../utils/errors.js";

/**
 * Fetch a profile's public posts. Posts are cached in memory only —
 * they are large and short-lived, so they are not written to disk.
 */
export async function getPosts(input: string): Promise<InstagramPost[]> {
  const username = normalizeUsername(input);
  const key = cacheKeys.posts(username);

  const cached = postsCache.get<InstagramPost[]>(key);
  if (cached) return cached;

  const provider = getProvider();
  if (!provider) {
    throw new DataUnavailableError(
      "No authorized Instagram data source is configured for Insbit.",
    );
  }

  const gate = providerRateLimiter.check(PROVIDER_LIMIT_KEY);
  if (!gate.allowed) {
    throw new ProviderRateLimitError("Insbit is handling too many lookups right now.");
  }

  const posts = await provider.getPosts(username);
  postsCache.set(key, posts.posts, env.POST_CACHE_TTL);
  return posts.posts;
}

export function invalidatePosts(input: string): void {
  postsCache.delete(cacheKeys.posts(normalizeUsername(input)));
}
