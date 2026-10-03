import path from "node:path";
import { env } from "../config/env.js";
import { FileJsonStore } from "./jsonStore.js";
import { logger } from "../utils/logger.js";

export type SessionView = "profile" | "posts" | "following";

export interface InsbitSession {
  sessionId: string;
  discordUserId: string;
  username: string;
  view: SessionView;
  page: number;
  createdAt: string;
  expiresAt: string;
}

export interface SessionsFile {
  sessions: Record<string, InsbitSession>;
}

const dataDir = path.resolve(env.DATA_DIR);

export const sessionsStore = new FileJsonStore<SessionsFile>({
  filePath: path.join(dataDir, "sessions.json"),
  defaults: () => ({ sessions: {} }),
  parse: (raw) => {
    const obj = raw as Partial<SessionsFile> | null;
    if (!obj || typeof obj !== "object" || typeof obj.sessions !== "object") {
      return { sessions: {} };
    }
    return { sessions: obj.sessions ?? {} };
  },
});

export async function getSession(sessionId: string): Promise<InsbitSession | undefined> {
  const data = await sessionsStore.read();
  return data.sessions[sessionId];
}

export async function saveSession(session: InsbitSession): Promise<void> {
  await sessionsStore.update((data) => ({
    sessions: { ...data.sessions, [session.sessionId]: session },
  }));
}

export async function deleteSession(sessionId: string): Promise<void> {
  await sessionsStore.update((data) => {
    const sessions = { ...data.sessions };
    delete sessions[sessionId];
    return { sessions };
  });
}

/** Remove sessions whose `expiresAt` is in the past. */
export async function cleanupSessions(now = Date.now()): Promise<number> {
  let removed = 0;
  await sessionsStore.update((data) => {
    const kept: Record<string, InsbitSession> = {};
    for (const [id, session] of Object.entries(data.sessions)) {
      const expires = Date.parse(session.expiresAt ?? "");
      if (Number.isNaN(expires) || expires <= now) {
        removed += 1;
      } else {
        kept[id] = session;
      }
    }
    return { sessions: kept };
  });

  if (removed > 0) {
    logger.info({ removed }, "Cleaned up expired sessions");
  }
  return removed;
}
