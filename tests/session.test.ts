import { describe, expect, it } from "vitest";
import {
  assertSessionOwner,
  createSession,
} from "../src/security/sessionSecurity.js";
import {
  SessionExpiredError,
  UnauthorizedSessionError,
} from "../src/utils/errors.js";

describe("session security", () => {
  it("creates a session owned by the requesting user", async () => {
    const session = await createSession({ discordUserId: "user-a", username: "@NASA" });
    expect(session.username).toBe("nasa");
    const loaded = await assertSessionOwner(session.sessionId, "user-a");
    expect(loaded.sessionId).toBe(session.sessionId);
  });

  it("rejects a different Discord user", async () => {
    const session = await createSession({ discordUserId: "user-a", username: "nasa" });
    await expect(assertSessionOwner(session.sessionId, "user-b")).rejects.toBeInstanceOf(
      UnauthorizedSessionError,
    );
  });

  it("rejects a missing session", async () => {
    await expect(assertSessionOwner("does-not-exist", "user-a")).rejects.toBeInstanceOf(
      SessionExpiredError,
    );
  });
});
