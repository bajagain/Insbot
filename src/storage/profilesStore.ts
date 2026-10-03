import path from "node:path";
import { env } from "../config/env.js";
import { FileJsonStore } from "./jsonStore.js";
import type { InstagramProfile } from "../instagram/types.js";
import { logger } from "../utils/logger.js";

export interface ProfilesFile {
  profiles: Record<string, InstagramProfile>;
}

const dataDir = path.resolve(env.DATA_DIR);

export const profilesStore = new FileJsonStore<ProfilesFile>({
  filePath: path.join(dataDir, "profiles.json"),
  defaults: () => ({ profiles: {} }),
  parse: (raw) => {
    const obj = raw as Partial<ProfilesFile> | null;
    if (!obj || typeof obj !== "object" || typeof obj.profiles !== "object") {
      return { profiles: {} };
    }
    return { profiles: obj.profiles ?? {} };
  },
});

export async function getStoredProfile(
  username: string,
): Promise<InstagramProfile | undefined> {
  const data = await profilesStore.read();
  return data.profiles[username.toLowerCase()];
}

export async function saveProfile(profile: InstagramProfile): Promise<void> {
  await profilesStore.update((data) => ({
    profiles: { ...data.profiles, [profile.username.toLowerCase()]: profile },
  }));
}

/**
 * Remove profiles whose `retrievedAt` is older than the configured
 * retention window. Returns the number of entries removed.
 */
export async function cleanupProfiles(now = Date.now()): Promise<number> {
  const retentionMs = env.PROFILE_RETENTION_SECONDS * 1000;
  let removed = 0;

  await profilesStore.update((data) => {
    const kept: Record<string, InstagramProfile> = {};
    for (const [key, profile] of Object.entries(data.profiles)) {
      const retrieved = Date.parse(profile.retrievedAt ?? "");
      const expired = Number.isNaN(retrieved) || now - retrieved > retentionMs;
      if (expired) {
        removed += 1;
      } else {
        kept[key] = profile;
      }
    }
    return { profiles: kept };
  });

  if (removed > 0) {
    logger.info({ removed }, "Cleaned up expired profiles");
  }
  return removed;
}
