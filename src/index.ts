import { env, hasProvider } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { startBot } from "./discord/client.js";
import { cleanupProfiles } from "./storage/profilesStore.js";
import { cleanupSessions } from "./storage/sessionsStore.js";
import { getStats } from "./storage/statsStore.js";
import { profileCache, postsCache, followingCache } from "./cache/memoryCache.js";
import { userRateLimiter, providerRateLimiter } from "./security/rateLimiter.js";

const CLEANUP_INTERVAL_MS = 15 * 60 * 1000; // every 15 minutes

/** Remove expired profiles/sessions and prune in-memory structures. */
async function runCleanup(): Promise<void> {
  try {
    await Promise.all([cleanupProfiles(), cleanupSessions()]);
    profileCache.prune();
    postsCache.prune();
    followingCache.prune();
    userRateLimiter.prune();
    providerRateLimiter.prune();
  } catch (err) {
    logger.error({ err }, "Cleanup cycle failed");
  }
}

async function main(): Promise<void> {
  logger.info(
    {
      env: env.NODE_ENV,
      providerConfigured: hasProvider,
      dataDir: env.DATA_DIR,
    },
    "Starting Insbit",
  );

  if (!hasProvider) {
    logger.warn(
      "No DOSCO_BASE_URL configured — Insbit will report data as unavailable until the Dosco data source is set.",
    );
  }

  await runCleanup();
  const stats = await getStats();
  logger.info({ stats }, "Loaded statistics");

  const timer = setInterval(() => void runCleanup(), CLEANUP_INTERVAL_MS);
  timer.unref();

  await startBot();
}

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutting down Insbit");
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => logger.error({ reason }, "Unhandled rejection"));
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  process.exit(1);
});

main().catch((err) => {
  logger.fatal({ err }, "Failed to start Insbit");
  process.exit(1);
});
