import { z } from "zod";
import { logger } from "../../utils/logger.js";
import {
  DataUnavailableError,
  PrivateProfileError,
  ProfileNotFoundError,
  ProviderRateLimitError,
  ProviderUnavailableError,
} from "../../utils/errors.js";
import { normalizeUsername } from "../validator.js";
import type {
  InstagramFollowingResult,
  InstagramPostsResult,
  InstagramProfileResult,
  InstagramProvider,
  MediaType,
} from "../types.js";

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Lenient schemas: Dosco payloads may evolve and unknown fields are ignored,
 * so Insbit keeps working as long as the documented fields are present.
 */
const profileSchema = z.object({
  username: z.string(),
  displayName: z.string().nullish(),
  biography: z.string().nullish(),
  profilePictureUrl: z.string().nullish(),
  followers: z.number().nullish(),
  following: z.number().nullish(),
  postsCount: z.number().nullish(),
  verified: z.boolean().nullish(),
  category: z.string().nullish(),
  website: z.string().nullish(),
  profileUrl: z.string().nullish(),
  isPrivate: z.boolean().nullish(),
});

const postSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  mediaType: z.string().nullish(),
  mediaUrl: z.string().nullish(),
  thumbnailUrl: z.string().nullish(),
  caption: z.string().nullish(),
  permalink: z.string().nullish(),
  publishedAt: z.string().nullish(),
});

const followingUserSchema = z.object({
  username: z.string(),
  displayName: z.string().nullish(),
  biography: z.string().nullish(),
  profilePictureUrl: z.string().nullish(),
  profileUrl: z.string().nullish(),
});

function toMediaType(value: string | null | undefined): MediaType {
  switch ((value ?? "").toLowerCase()) {
    case "image":
    case "photo":
    case "image_post":
      return "image";
    case "video":
    case "reel":
    case "clips":
      return "video";
    case "carousel":
    case "carousel_album":
    case "sidecar":
      return "carousel";
    default:
      return "unknown";
  }
}

function undefinedIfEmpty(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export interface DoscoProviderOptions {
  /** Dosco base URL, e.g. `https://api.dosco.example`. */
  baseUrl: string;
  /** Optional API key. When absent, requests are sent unauthenticated. */
  apiKey?: string;
  /** Header used for the key (default `Authorization`). */
  authHeader?: string;
  /** Prefix for the key in the header (default `Bearer`; set empty for raw keys). */
  authScheme?: string;
  /** When set, the key is sent as this query parameter instead of a header. */
  keyQueryParam?: string;
  profilePath?: string;
  postsPath?: string;
  followingPath?: string;
  usernameParam?: string;
  cursorParam?: string;
  timeoutMs?: number;
}

/**
 * The one and only Insbit data source: **Dosco**.
 *
 * It is fully configurable so a base URL (and, when Dosco starts requiring
 * one, an API key) can be added without touching the application. Until a
 * base URL is configured, `getProvider()` returns `null` and Insbit reports
 * data as unavailable — it never falls back to an unauthorized scraper.
 */
export class DoscoProvider implements InstagramProvider {
  public readonly name = "dosco";
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly authHeader: string;
  private readonly authScheme: string;
  private readonly keyQueryParam?: string;
  private readonly profilePath: string;
  private readonly postsPath: string;
  private readonly followingPath: string;
  private readonly usernameParam: string;
  private readonly cursorParam: string;
  private readonly timeoutMs: number;

  constructor(options: DoscoProviderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey?.trim() || undefined;
    this.authHeader = options.authHeader?.trim() || "Authorization";
    this.authScheme = options.authScheme ?? "Bearer";
    this.keyQueryParam = options.keyQueryParam?.trim() || undefined;
    this.profilePath = options.profilePath ?? "/profile";
    this.postsPath = options.postsPath ?? "/posts";
    this.followingPath = options.followingPath ?? "/following";
    this.usernameParam = options.usernameParam ?? "username";
    this.cursorParam = options.cursorParam ?? "cursor";
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /** Auth headers for a request, or `{}` when no key is configured. */
  private authHeaders(): Record<string, string> {
    if (!this.apiKey || this.keyQueryParam) return {};
    const value = this.authScheme ? `${this.authScheme} ${this.apiKey}` : this.apiKey;
    return { [this.authHeader]: value };
  }

  private async request(pathname: string, query: Record<string, string> = {}) {
    const url = new URL(`${this.baseUrl}${pathname}`);
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
    // Some Dosco deployments expect the key as a query parameter.
    if (this.apiKey && this.keyQueryParam) {
      url.searchParams.set(this.keyQueryParam, this.apiKey);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          ...this.authHeaders(),
        },
        signal: controller.signal,
      });

      if (res.status === 404) throw new ProfileNotFoundError(query[this.usernameParam] ?? "user");
      if (res.status === 403 || res.status === 401) {
        throw new ProviderUnavailableError("The data source rejected the request.");
      }
      if (res.status === 429) {
        throw new ProviderRateLimitError("The data source asked us to slow down.");
      }
      if (!res.ok) {
        throw new ProviderUnavailableError(`Data source responded with ${res.status}.`);
      }

      return (await res.json()) as unknown;
    } catch (err) {
      if (err instanceof ProviderUnavailableError) throw err;
      if (err instanceof ProviderRateLimitError) throw err;
      if (err instanceof ProfileNotFoundError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new ProviderUnavailableError("The data source timed out.");
      }
      logger.warn({ err, pathname }, "Dosco request failed");
      throw new ProviderUnavailableError();
    } finally {
      clearTimeout(timer);
    }
  }

  async getProfile(username: string): Promise<InstagramProfileResult> {
    const user = normalizeUsername(username);
    const raw = await this.request(this.profilePath, { [this.usernameParam]: user });
    const parsed = profileSchema.safeParse(raw);

    if (!parsed.success) {
      logger.warn({ issues: parsed.error.issues }, "Unexpected Dosco profile payload");
      throw new DataUnavailableError("Profile data was malformed.");
    }

    const data = parsed.data;
    if (data.isPrivate) throw new PrivateProfileError(user);

    const profile = {
      username: data.username.toLowerCase(),
      displayName: undefinedIfEmpty(data.displayName),
      biography: undefinedIfEmpty(data.biography),
      profilePictureUrl: undefinedIfEmpty(data.profilePictureUrl),
      followers: data.followers ?? undefined,
      following: data.following ?? undefined,
      postsCount: data.postsCount ?? undefined,
      verified: data.verified ?? false,
      category: undefinedIfEmpty(data.category),
      website: undefinedIfEmpty(data.website),
      profileUrl: data.profileUrl?.trim() || `https://www.instagram.com/${user}/`,
      retrievedAt: new Date().toISOString(),
    };

    return { profile, private: false };
  }

  async getPosts(username: string, cursor?: string): Promise<InstagramPostsResult> {
    const user = normalizeUsername(username);
    const raw = await this.request(this.postsPath, {
      [this.usernameParam]: user,
      ...(cursor ? { [this.cursorParam]: cursor } : {}),
    });

    const envelope = z
      .object({
        posts: z.array(postSchema).default([]),
        cursor: z.string().nullish(),
        hasMore: z.boolean().nullish(),
      })
      .safeParse(raw);

    if (!envelope.success) throw new DataUnavailableError("Posts data was malformed.");

    const now = new Date().toISOString();
    const posts = envelope.data.posts.map((p) => ({
      id: p.id,
      mediaType: toMediaType(p.mediaType),
      mediaUrl: undefinedIfEmpty(p.mediaUrl),
      thumbnailUrl: undefinedIfEmpty(p.thumbnailUrl),
      caption: undefinedIfEmpty(p.caption),
      permalink: undefinedIfEmpty(p.permalink),
      publishedAt: undefinedIfEmpty(p.publishedAt),
      retrievedAt: now,
    }));

    return {
      posts,
      cursor: envelope.data.cursor ?? undefined,
      hasMore: envelope.data.hasMore ?? Boolean(envelope.data.cursor),
    };
  }

  async getFollowing(username: string, cursor?: string): Promise<InstagramFollowingResult> {
    const user = normalizeUsername(username);
    const raw = await this.request(this.followingPath, {
      [this.usernameParam]: user,
      ...(cursor ? { [this.cursorParam]: cursor } : {}),
    });

    const envelope = z
      .object({
        users: z.array(followingUserSchema).default([]),
        cursor: z.string().nullish(),
        hasMore: z.boolean().nullish(),
      })
      .safeParse(raw);

    if (!envelope.success) throw new DataUnavailableError("Following data was malformed.");

    const users = envelope.data.users.map((u) => ({
      username: u.username.toLowerCase(),
      displayName: undefinedIfEmpty(u.displayName),
      biography: undefinedIfEmpty(u.biography),
      profilePictureUrl: undefinedIfEmpty(u.profilePictureUrl),
      profileUrl:
        u.profileUrl?.trim() || `https://www.instagram.com/${u.username.toLowerCase()}/`,
    }));

    return {
      users,
      cursor: envelope.data.cursor ?? undefined,
      hasMore: envelope.data.hasMore ?? Boolean(envelope.data.cursor),
    };
  }
}
