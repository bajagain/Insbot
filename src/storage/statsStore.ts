import path from "node:path";
import { env } from "../config/env.js";
import { FileJsonStore } from "./jsonStore.js";

export interface InsbitStats {
  totalSearches: number;
  totalProfilesViewed: number;
  lastUpdated: string | null;
}

const dataDir = path.resolve(env.DATA_DIR);

export const statsStore = new FileJsonStore<InsbitStats>({
  filePath: path.join(dataDir, "stats.json"),
  defaults: () => ({ totalSearches: 0, totalProfilesViewed: 0, lastUpdated: null }),
  parse: (raw) => {
    const obj = (raw ?? {}) as Partial<InsbitStats>;
    return {
      totalSearches: typeof obj.totalSearches === "number" ? obj.totalSearches : 0,
      totalProfilesViewed:
        typeof obj.totalProfilesViewed === "number" ? obj.totalProfilesViewed : 0,
      lastUpdated: typeof obj.lastUpdated === "string" ? obj.lastUpdated : null,
    };
  },
});

export async function recordSearch(): Promise<void> {
  await statsStore.update((stats) => ({
    ...stats,
    totalSearches: stats.totalSearches + 1,
    lastUpdated: new Date().toISOString(),
  }));
}

export async function recordProfileView(): Promise<void> {
  await statsStore.update((stats) => ({
    ...stats,
    totalProfilesViewed: stats.totalProfilesViewed + 1,
    lastUpdated: new Date().toISOString(),
  }));
}

export async function getStats(): Promise<InsbitStats> {
  return statsStore.read();
}
