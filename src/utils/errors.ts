/**
 * Base class for all Insbit domain errors.
 * `userMessage` is safe to show in Discord; it never contains
 * provider credentials or raw upstream responses.
 */
export class InsbitError extends Error {
  public readonly userMessage: string;
  public readonly code: string;

  constructor(code: string, message: string, userMessage?: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.userMessage = userMessage ?? message;
  }
}

export class InvalidUsernameError extends InsbitError {
  constructor(message = "Invalid Instagram username.") {
    super("INVALID_USERNAME", message);
  }
}

export class ProfileNotFoundError extends InsbitError {
  constructor(username: string) {
    super(
      "PROFILE_NOT_FOUND",
      `No profile found for @${username}`,
      `No supported public profile information was returned for @${username}.`,
    );
  }
}

export class PrivateProfileError extends InsbitError {
  constructor(username: string) {
    super(
      "PRIVATE_PROFILE",
      `Profile @${username} is private`,
      "Insbit can only display information legitimately available through its configured data source.",
    );
  }
}

export class ProviderUnavailableError extends InsbitError {
  constructor(message = "The configured data source is unavailable.") {
    super(
      "PROVIDER_UNAVAILABLE",
      message,
      "Insbit couldn't retrieve this profile right now. Please try again later.",
    );
  }
}

export class ProviderRateLimitError extends InsbitError {
  constructor(message = "The configured data source rate limit was reached.") {
    super(
      "PROVIDER_RATE_LIMIT",
      message,
      "The data source is rate limited right now. Please try again in a moment.",
    );
  }
}

export class DataUnavailableError extends InsbitError {
  constructor(message = "Requested data is not available from the configured source.") {
    super(
      "DATA_UNAVAILABLE",
      message,
      "That information isn't available from Insbit's configured data source.",
    );
  }
}

export class SessionExpiredError extends InsbitError {
  constructor() {
    super(
      "SESSION_EXPIRED",
      "Session has expired",
      "⌛ This Insbit session has expired. Run `/instagram` again to start a new one.",
    );
  }
}

export class UnauthorizedSessionError extends InsbitError {
  constructor() {
    super(
      "UNAUTHORIZED_SESSION",
      "Session belongs to another user",
      "🔒 This Insbit session belongs to another user.\nRun `/instagram` yourself to create a new session.",
    );
  }
}

export class RateLimitError extends InsbitError {
  constructor(public readonly retryAfterSeconds: number) {
    super(
      "RATE_LIMITED",
      "User rate limit reached",
      `⏳ You're searching too fast. Try again in **${retryAfterSeconds}s**.`,
    );
  }
}

/** True for any Insbit domain error. */
export function isInsbitError(err: unknown): err is InsbitError {
  return err instanceof InsbitError;
}

/** Convert any thrown value into a safe user-facing string. */
export function toUserMessage(err: unknown): string {
  if (isInsbitError(err)) return err.userMessage;
  return "⚠️ Something went wrong while processing that request. Please try again later.";
}
