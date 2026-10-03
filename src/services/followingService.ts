import { env } from "../config/env.js";
import { getProvider } from "../instagram/provider.js";
import { normalizeUsername } from "../instagram/validator.js";
import type { InstagramFollowingUser } from "../instagram/types.js";
import { followingCache, cacheKeys } from "../cache/memoryCache.js";
import { providerRateLimiter, PROVIDER_LIMIT_KEY } from "../security/rateLimiter.js";
import { DataUnavailableError, ProviderRateLimitError } from "../utils/errors.js";

/**
 * Fetch the public accounts a profile follows. Cached in memory only.
 * Only information the configured source exposes publicly is returned.
 */
export async function getFollowing(input: string): Promise<InstagramFollowingUser[]> {
  const username = normalizeUsername(input);
  const key = cacheKeys.following(username);

  const cached = followingCache.get<InstagramFollowingUser[]>(key);
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

  const result = await provider.getFollowing(username);
  followingCache.set(key, result.users, env.FOLLOWING_CACHE_TTL);
  return result.users;
}

export function invalidateFollowing(input: string): void {
  followingCache.delete(cacheKeys.following(normalizeUsername(input)));
}
