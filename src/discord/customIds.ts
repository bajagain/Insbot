export const CUSTOM_ID_PREFIX = "insbit";

export type CustomAction =
  | { kind: "profile"; sessionId: string }
  | { kind: "posts"; sessionId: string; direction: "open" | "prev" | "next" }
  | { kind: "following"; sessionId: string; direction: "open" | "prev" | "next" }
  | { kind: "refresh"; sessionId: string };

const build = (...parts: string[]) => [CUSTOM_ID_PREFIX, ...parts].join(":");

export const ids = {
  /** Back to the profile view. */
  profile: (sessionId: string) => build("profile", sessionId),
  /** Open the paginated posts view. */
  openPosts: (sessionId: string) => build("posts", sessionId, "open"),
  postsPrev: (sessionId: string) => build("posts", sessionId, "prev"),
  postsNext: (sessionId: string) => build("posts", sessionId, "next"),
  /** Open the paginated following view. */
  openFollowing: (sessionId: string) => build("following", sessionId, "open"),
  followingPrev: (sessionId: string) => build("following", sessionId, "prev"),
  followingNext: (sessionId: string) => build("following", sessionId, "next"),
  /** Refresh the profile from the data source. */
  refresh: (sessionId: string) => build("refresh", sessionId),
  /** Disabled page indicator button; parsed but ignored by the handler. */
  pageIndicator: (sessionId: string) => build("page", sessionId),
};

/**
 * Parse a custom ID. Only the compact, non-sensitive shape defined above
 * is accepted — no credentials or payloads ever travel in custom IDs.
 */
export function parseCustomId(customId: string): CustomAction | null {
  const parts = customId.split(":");
  if (parts[0] !== CUSTOM_ID_PREFIX) return null;

  const [, area, sessionId, direction] = parts;

  switch (area) {
    case "profile":
      return sessionId ? { kind: "profile", sessionId } : null;
    case "refresh":
      return sessionId ? { kind: "refresh", sessionId } : null;
    case "posts":
      if (!sessionId) return null;
      if (direction === "open" || direction === "prev" || direction === "next") {
        return { kind: "posts", sessionId, direction };
      }
      return null;
    case "following":
      if (!sessionId) return null;
      if (direction === "open" || direction === "prev" || direction === "next") {
        return { kind: "following", sessionId, direction };
      }
      return null;
    default:
      return null;
  }
}
