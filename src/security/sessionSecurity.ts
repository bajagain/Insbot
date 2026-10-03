import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { normalizeUsername } from "../instagram/validator.js";
import {
  getSession,
  saveSession,
  type InsbitSession,
  type SessionView,
} from "../storage/sessionsStore.js";
import { SessionExpiredError, UnauthorizedSessionError } from "../utils/errors.js";

export function newSessionId(): string {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}

export async function createSession(params: {
  discordUserId: string;
  username: string;
  view?: SessionView;
  page?: number;
}): Promise<InsbitSession> {
  const now = Date.now();
  const session: InsbitSession = {
    sessionId: newSessionId(),
    discordUserId: params.discordUserId,
    username: normalizeUsername(params.username),
    view: params.view ?? "profile",
    page: params.page ?? 1,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + env.SESSION_RETENTION_SECONDS * 1000).toISOString(),
  };
  await saveSession(session);
  return session;
}

export async function touchSession(
  sessionId: string,
  patch: Partial<Pick<InsbitSession, "view" | "page">>,
): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) return;
  await saveSession({
    ...session,
    ...patch,
    expiresAt: new Date(Date.now() + env.SESSION_RETENTION_SECONDS * 1000).toISOString(),
  });
}

/**
 * Load a session and assert it exists, has not expired, and belongs to
 * the interacting Discord user. Throws a safe, specific error otherwise.
 */
export async function assertSessionOwner(
  sessionId: string,
  discordUserId: string,
): Promise<InsbitSession> {
  const session = await getSession(sessionId);
  if (!session) throw new SessionExpiredError();
  if (Date.parse(session.expiresAt) <= Date.now()) throw new SessionExpiredError();
  if (session.discordUserId !== discordUserId) throw new UnauthorizedSessionError();
  return session;
}
