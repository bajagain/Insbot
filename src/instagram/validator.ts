import { z } from "zod";
import { InvalidUsernameError } from "../utils/errors.js";

/**
 * Instagram usernames: letters, digits, periods and underscores,
 * up to 30 characters. We intentionally keep this strict so we never
 * construct a URL from untrusted input.
 */
const usernameSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/^@+/, "").replace(/\/+$/, ""))
  .pipe(
    z
      .string()
      .min(1, "Username is required")
      .max(30, "Username is too long")
      .regex(
        /^[A-Za-z0-9._]+$/,
        "Username may only contain letters, numbers, periods and underscores",
      ),
  );

/** Normalize `@NASA` / `nasa/` → `nasa`. Throws InvalidUsernameError. */
export function normalizeUsername(input: string): string {
  const result = usernameSchema.safeParse(input);
  if (!result.success) {
    throw new InvalidUsernameError(result.error.issues[0]?.message ?? "Invalid username.");
  }
  return result.data.toLowerCase();
}

export function isValidUsername(input: string): boolean {
  return usernameSchema.safeParse(input).success;
}

export function profileUrlFor(username: string): string {
  return `https://www.instagram.com/${normalizeUsername(username)}/`;
}
