import path from "node:path";
import { env } from "../config/env.js";
import { FileJsonStore } from "./jsonStore.js";

export interface InsbitSettings {
  cacheTTL: number;
  postsPerPage: number;
  followingPerPage: number;
}

const dataDir = path.resolve(env.DATA_DIR);

export const settingsStore = new FileJsonStore<InsbitSettings>({
  filePath: path.join(dataDir, "settings.json"),
  defaults: () => ({
    cacheTTL: env.PROFILE_CACHE_TTL,
    postsPerPage: 5,
    followingPerPage: 10,
  }),
  parse: (raw) => {
    const obj = (raw ?? {}) as Partial<InsbitSettings>;
    return {
      cacheTTL: typeof obj.cacheTTL === "number" ? obj.cacheTTL : env.PROFILE_CACHE_TTL,
      postsPerPage: typeof obj.postsPerPage === "number" ? obj.postsPerPage : 5,
      followingPerPage: typeof obj.followingPerPage === "number" ? obj.followingPerPage : 10,
    };
  },
});

export async function getSettings(): Promise<InsbitSettings> {
  return settingsStore.read();
}
