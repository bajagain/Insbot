import { env } from "../config/env.js";
import { getProvider } from "../instagram/provider.js";
import { normalizeUsername } from "../instagram/validator.js";
import type { InstagramProfile } from "../instagram/types.js";
import { profileCache, cacheKeys } from "../cache/memoryCache.js";
import { getStoredProfile, saveProfile } from "../storage/profilesStore.js";
import { backupFile } from "../storage/backup.js";
import { providerRateLimiter, PROVIDER_LIMIT_KEY } from "../security/rateLimiter.js";
import { DataUnavailableError, ProviderRateLimitError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export interface ProfileLookupResult {
  profile: InstagramProfile;
  /** Where the data came from — useful for the embed footer. */
  source: "cache" | "storage" | "provider";
}

/**
 * Resolve a profile following the documented cache strategy:
 *   memory cache → profiles.json → provider
 * Successful provider responses are persisted and cached.
 */
export async function getProfile(input: string): Promise<ProfileLookupResult> {
  const username = normalizeUsername(input);
  const key = cacheKeys.profile(username);

  const cached = profileCache.get<InstagramProfile>(key);
  if (cached) return { profile: cached, source: "cache" };

  const stored = await getStoredProfile(username);
  if (stored) {
    profileCache.set(key, stored, env.PROFILE_CACHE_TTL);
    return { profile: stored, source: "storage" };
  }

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

  const result = await provider.getProfile(username);
  profileCache.set(key, result.profile, env.PROFILE_CACHE_TTL);

  // Persist in the background; a backup failure must never block the reply.
  try {
    await backupFile("profiles.json");
    await saveProfile(result.profile);
  } catch (err) {
    logger.warn({ err, username }, "Failed to persist profile");
  }

  return { profile: result.profile, source: "provider" };
}

/** Force a provider refresh, ignoring cache and stored copies. */
export async function refreshProfile(input: string): Promise<ProfileLookupResult> {
  const username = normalizeUsername(input);
  profileCache.delete(cacheKeys.profile(username));

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

  const result = await provider.getProfile(username);
  profileCache.set(cacheKeys.profile(username), result.profile, env.PROFILE_CACHE_TTL);
  try {
    await saveProfile(result.profile);
  } catch (err) {
    logger.warn({ err, username }, "Failed to persist refreshed profile");
  }

  return { profile: result.profile, source: "provider" };
}
