import { env, hasProvider } from "../config/env.js";
import type { InstagramProvider } from "./types.js";
import { DoscoProvider } from "./providers/doscoProvider.js";

let cached: InstagramProvider | null = null;

/**
 * Return the configured **Dosco** provider, or `null` when no Dosco base URL
 * has been configured. Insbit uses Dosco and only Dosco — there is no
 * fallback to any other or unauthorized scraper.
 */
export function getProvider(): InstagramProvider | null {
  if (!hasProvider) return null;
  if (cached) return cached;

  cached = new DoscoProvider({
    baseUrl: env.DOSCO_BASE_URL!,
    apiKey: env.DOSCO_API_KEY,
    authHeader: env.DOSCO_AUTH_HEADER,
    authScheme: env.DOSCO_AUTH_SCHEME,
    keyQueryParam: env.DOSCO_KEY_QUERY_PARAM,
    profilePath: env.DOSCO_PROFILE_PATH,
    postsPath: env.DOSCO_POSTS_PATH,
    followingPath: env.DOSCO_FOLLOWING_PATH,
    usernameParam: env.DOSCO_USERNAME_PARAM,
    cursorParam: env.DOSCO_CURSOR_PARAM,
    timeoutMs: env.DOSCO_TIMEOUT_MS,
  });
  return cached;
}

/** Test seam: reset the memoized provider. */
export function resetProvider(): void {
  cached = null;
}
