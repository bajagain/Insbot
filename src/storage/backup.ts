import { mkdir, readdir, copyFile, unlink } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const dataDir = path.resolve(env.DATA_DIR);
const backupDir = path.join(dataDir, "backups");

/**
 * Copy a data file into data/backups/<name>-<YYYY-MM-DD>.json and prune
 * old backups so at most MAX_BACKUPS files remain. Best-effort: failures
 * are logged, never thrown, so backups can't break a request.
 */
export async function backupFile(fileName: string): Promise<void> {
  try {
    await mkdir(backupDir, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 10);
    const base = fileName.replace(/\.json$/, "");
    const target = path.join(backupDir, `${base}-${stamp}.json`);

    await copyFile(path.join(dataDir, fileName), target);

    const entries = (await readdir(backupDir))
      .filter((f) => f.startsWith(`${base}-`) && f.endsWith(".json"))
      .sort();

    const excess = entries.length - env.MAX_BACKUPS;
    for (let i = 0; i < excess; i += 1) {
      await unlink(path.join(backupDir, entries[i]!));
    }
  } catch (err) {
    logger.warn({ err, fileName }, "Backup skipped");
  }
}
