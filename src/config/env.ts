import "dotenv/config";
import { z } from "zod";

const numeric = (fallback: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === "" ? fallback : Number(v)))
    .pipe(z.number().int().nonnegative());

const envSchema = z.object({
  // Discord
  DISCORD_TOKEN: z.string().min(1, "DISCORD_TOKEN is required"),
  DISCORD_CLIENT_ID: z.string().min(1, "DISCORD_CLIENT_ID is required"),
  DISCORD_GUILD_ID: z.string().optional(),

  // ── Dosco (the one and only Instagram data source) ──────────
  // Insbit talks exclusively to Dosco. Set DOSCO_BASE_URL to enable it.
  DOSCO_BASE_URL: z
    .string()
    .url("DOSCO_BASE_URL must be a valid URL")
    .optional()
    .or(z.literal("")),
  // Optional: Dosco works without a key today; add one and it is sent
  // automatically using the auth settings below.
  DOSCO_API_KEY: z.string().optional(),
  DOSCO_AUTH_HEADER: z.string().default("Authorization"),
  DOSCO_AUTH_SCHEME: z.string().default("Bearer"),
  // If set, the key is sent as this query parameter instead of a header.
  DOSCO_KEY_QUERY_PARAM: z.string().optional(),
  // Endpoint paths (relative to DOSCO_BASE_URL).
  DOSCO_PROFILE_PATH: z.string().default("/profile"),
  DOSCO_POSTS_PATH: z.string().default("/posts"),
  DOSCO_FOLLOWING_PATH: z.string().default("/following"),
  // Query parameter names Dosco expects.
  DOSCO_USERNAME_PARAM: z.string().default("username"),
  DOSCO_CURSOR_PARAM: z.string().default("cursor"),
  DOSCO_TIMEOUT_MS: numeric(10000),

  // Rate limiting
  USER_REQUEST_LIMIT: numeric(20),
  USER_REQUEST_WINDOW_SECONDS: numeric(60),
  PROVIDER_REQUEST_LIMIT: numeric(60),
  PROVIDER_REQUEST_WINDOW_SECONDS: numeric(60),

  // Cache TTLs
  PROFILE_CACHE_TTL: numeric(900),
  POST_CACHE_TTL: numeric(600),
  FOLLOWING_CACHE_TTL: numeric(600),

  // Retention
  PROFILE_RETENTION_SECONDS: numeric(86400),
  SESSION_RETENTION_SECONDS: numeric(3600),
  MAX_BACKUPS: numeric(5),

  // Runtime
  NODE_ENV: z.enum(["development", "test", "production"]).default("production"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  DATA_DIR: z.string().default("./data"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

/**
 * Whether the Dosco data source has been configured. Without a base URL,
 * Insbit cannot retrieve any data and reports a friendly
 * "data temporarily unavailable" message.
 */
export const hasProvider = Boolean(env.DOSCO_BASE_URL && env.DOSCO_BASE_URL.length > 0);
