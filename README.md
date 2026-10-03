# Insbit

**Insbit** is a GUI-first Discord bot for viewing information that is **legitimately
available from public Instagram profiles** through the **Dosco** data source.

It is built with **Node.js + TypeScript + discord.js** and stores **all persistent
application data in local JSON files**. There is **no PostgreSQL, MySQL, MongoDB, Redis,
Prisma, or any external database or cache server.**

> **Privacy first.** Insbit does not bypass private Instagram accounts, authentication,
> CAPTCHAs, rate limits, or access controls. It only displays what its configured data
> source legitimately makes available, and it never interacts with the accounts it looks up.

---

## Table of contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Discord application setup](#discord-application-setup)
- [Inviting the bot](#inviting-the-bot)
- [Environment variables](#environment-variables)
- [Provider configuration](#provider-configuration)
- [Commands](#commands)
- [GUI navigation](#gui-navigation)
- [JSON storage & data directory](#json-storage--data-directory)
- [Cache behavior](#cache-behavior)
- [Rate limiting](#rate-limiting)
- [Backup](#backup)
- [Docker deployment](#docker-deployment)
- [Scripts](#scripts)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Privacy limitations](#privacy-limitations)

---

## Features

- `/instagram <username>` slash command with `@` / case normalization and validation.
- Polished **profile embed** with avatar, display name, follower/following/post counts,
  verification, category, website, bio and a link to the public profile.
- Interactive **buttons** (no extra commands needed):
  - 📷 **View All Posts** — paginated posts with images, captions, dates and permalinks.
  - 👥 **View Following** — paginated list of public accounts with bios and links.
  - 🔗 **Open Instagram** — a link button to the public profile.
  - 🔄 **Refresh** — re-fetch from the data source, bypassing cache.
- **Pagination** (posts: 5/page, following: 10/page) with disabled prev/next at the edges.
- **Session security** — every button re-verifies ownership and expiry. Another user
  clicking your buttons gets a friendly refusal; session contents are never exposed.
- **Atomic, serialized JSON writes** — temp file + rename, with a per-file write queue so
  concurrent interactions can never corrupt storage.
- **In-memory TTL cache** so button clicks never hammer the data source.
- **In-memory rate limiting** — per Discord user and a global provider bucket.
- **Automatic cleanup** — expired profiles and sessions are pruned on a timer.
- **Rotating backups** of JSON data.
- **Dosco-powered** — one configurable data source, optional key, no code changes to enable.
- **45+ unit tests** covering storage, cache, rate limiting, sessions, pagination,
  validation, the provider and the Discord views.

---

## Requirements

- **Node.js 20 or newer** (developed and tested on Node 22).
- A **Discord bot application** (token + client ID).
- A **Dosco data source** (`DOSCO_BASE_URL`) — see
  [Provider configuration](#provider-configuration).
- A **persistent filesystem** for `data/` (required in production).

---

## Installation

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp env.template .env
#   then edit .env (see Environment variables)

# 3. Build and run
npm run build
npm start
```

For development with auto-reload:

```bash
npm run dev
```

---

## Discord application setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
   and create a new application.
2. Open the **Bot** tab and click **Reset Token**, then copy the token into
   `DISCORD_TOKEN`.
3. Copy the **Application ID** from the **General Information** tab into
   `DISCORD_CLIENT_ID`.
4. (Optional, recommended for testing) Copy a server's ID into `DISCORD_GUILD_ID`
   so commands register instantly instead of globally.
5. Register the slash commands:

   ```bash
   npm run register
   ```

   - With `DISCORD_GUILD_ID` set, commands appear in that guild immediately.
   - Without it, global commands can take up to an hour to appear.

Insbit requests **only the `Guilds` intent** — no privileged intents are needed, and it
does not read message content.

---

## Inviting the bot

In the Developer Portal, open **OAuth2 → URL Generator**:

- **Scopes:** `bot`, `applications.commands`
- **Bot permissions:** `Send Messages`, `Embed Links`, `Use External Emojis`
  (permissions are intentionally minimal).

Open the generated URL and add Insbit to your server.

---

## Environment variables

Copy `env.template` to `.env` and fill in the values.

| Variable | Default | Description |
| --- | --- | --- |
| `DISCORD_TOKEN` | — | **Required.** Bot token. |
| `DISCORD_CLIENT_ID` | — | **Required.** Application ID. |
| `DISCORD_GUILD_ID` | — | Optional guild for instant command registration. |
| `DOSCO_BASE_URL` | — | **Dosco** base URL. Required to enable data lookups. |
| `DOSCO_API_KEY` | — | Optional Dosco key. Sent automatically once set. |
| `DOSCO_AUTH_HEADER` | `Authorization` | Header the key is sent in. |
| `DOSCO_AUTH_SCHEME` | `Bearer` | Prefix for the key (blank for a raw key). |
| `DOSCO_KEY_QUERY_PARAM` | — | If set, send the key as this query param instead. |
| `DOSCO_PROFILE_PATH` | `/profile` | Profile endpoint path. |
| `DOSCO_POSTS_PATH` | `/posts` | Posts endpoint path. |
| `DOSCO_FOLLOWING_PATH` | `/following` | Following endpoint path. |
| `DOSCO_USERNAME_PARAM` | `username` | Username query parameter name. |
| `DOSCO_CURSOR_PARAM` | `cursor` | Pagination cursor parameter name. |
| `DOSCO_TIMEOUT_MS` | `10000` | Per-request timeout. |
| `USER_REQUEST_LIMIT` | `20` | Per-user requests allowed per window. |
| `USER_REQUEST_WINDOW_SECONDS` | `60` | Per-user rate-limit window. |
| `PROVIDER_REQUEST_LIMIT` | `60` | Global outbound provider requests per window. |
| `PROVIDER_REQUEST_WINDOW_SECONDS` | `60` | Global provider rate-limit window. |
| `PROFILE_CACHE_TTL` | `900` | Profile cache TTL (seconds). |
| `POST_CACHE_TTL` | `600` | Posts cache TTL (seconds). |
| `FOLLOWING_CACHE_TTL` | `600` | Following cache TTL (seconds). |
| `PROFILE_RETENTION_SECONDS` | `86400` | How long stored profiles are kept. |
| `SESSION_RETENTION_SECONDS` | `3600` | Session lifetime (also refreshed on interaction). |
| `MAX_BACKUPS` | `5` | Number of rotating backups kept per file. |
| `NODE_ENV` | `production` | `development` \| `test` \| `production`. |
| `LOG_LEVEL` | `info` | Pino log level. |
| `DATA_DIR` | `./data` | Directory for JSON storage. |

There is deliberately **no `DATABASE_URL` and no `REDIS_URL`** — Insbit uses neither.

---

## Provider configuration

Insbit talks to **Dosco and only Dosco** (`src/instagram/providers/doscoProvider.ts`).
There is no secondary or fallback source. The provider is abstracted behind
`InstagramProvider`, so the rest of the app never knows how data is fetched.

### Enabling Dosco

Set `DOSCO_BASE_URL` and you are done — **no key is required to start**. The key is
optional today: if you add `DOSCO_API_KEY` later, Insbit sends it automatically using
`DOSCO_AUTH_HEADER` / `DOSCO_AUTH_SCHEME` (or as a query parameter when
`DOSCO_KEY_QUERY_PARAM` is set). No code change is needed.

Because Dosco's exact paths and parameter names can differ per deployment, every part of
the request is configurable via the `DOSCO_*` variables in the table above. Point them at
the paths your Dosco instance exposes.

The provider expects a JSON API with these endpoints:

| Endpoint | Query | Response |
| --- | --- | --- |
| `GET /profile` | `username` | Profile object (see below) |
| `GET /posts` | `username`, `cursor?` | `{ posts: [...], cursor?, hasMore? }` |
| `GET /following` | `username`, `cursor?` | `{ users: [...], cursor?, hasMore? }` |

Profile payload fields (all optional except `username`):

```jsonc
{
  "username": "nasa",
  "displayName": "NASA",
  "biography": "Explore the universe",
  "profilePictureUrl": "https://...",
  "followers": 12400,
  "following": 321,
  "postsCount": 45,
  "verified": true,
  "category": "Government Organization",
  "website": "https://nasa.gov",
  "profileUrl": "https://www.instagram.com/nasa/",
  "isPrivate": false
}
```

Post payload fields: `id`, `mediaType` (`image`/`video`/`carousel`), `mediaUrl`,
`thumbnailUrl`, `caption`, `permalink`, `publishedAt`.

Following-user payload fields: `username`, `displayName`, `biography`,
`profilePictureUrl`, `profileUrl`.

**If `DOSCO_BASE_URL` is not set**, Insbit starts normally but reports data as
unavailable. It will **never** fall back to another or unauthorized scraper.

Upstream `404`, `429`, `401/403`, timeouts and malformed payloads are translated into
friendly Discord messages; raw upstream errors and credentials are never shown or logged.

To retarget the request shape without touching code, adjust the `DOSCO_*` environment
variables. If Dosco's response uses different field names, edit the mapping in
`src/instagram/providers/doscoProvider.ts`.

---

## Commands

| Command | Description |
| --- | --- |
| `/instagram <username>` | Look up public profile information for a username. |

Usernames are normalized (`@NASA` → `nasa`) and validated (letters, digits, `.`, `_`,
max 30 chars) before use. While the lookup runs, Insbit shows
`🔎 Looking up @username…`, then replaces it with the profile GUI.

---

## GUI navigation

```
/instagram username
        │
        ▼
   🔎 Loading…
        │
        ▼
┌──────────────────────────────────┐
│ Insbit · Instagram Profile       │
│        [Profile Photo]           │
│ @username · Display Name ✔️      │
│ Followers / Following / Posts    │
│ Bio · Category · Website         │
│ [📷 View All Posts] [👥 View Following] │
│ [🔗 Open Instagram] [🔄 Refresh] │
└──────────────────────────────────┘
        │                    │
        ▼                    ▼
   ALL POSTS            FOLLOWING
   ◀ Next ▶ 🔙 Profile  ◀ Next ▶ 🔙 Profile
```

- **Previous** is disabled on the first page; **Next** is disabled on the last page.
- The page indicator shows `current / total`.
- **🔙 Profile** returns to the profile view.

Custom IDs are compact and non-sensitive, e.g. `insbit:posts:<sessionId>:next`. No keys
or large payloads are ever placed in a custom ID.

---

## JSON storage & data directory

All persistent data lives in `data/`:

```
data/
├── profiles.json    # recently retrieved public profiles
├── sessions.json    # active short-lived sessions
├── settings.json    # bot settings (cacheTTL, postsPerPage, followingPerPage)
├── stats.json       # usage statistics
└── backups/         # rotating backups (created automatically)
```

Files are created automatically on first use. Example `settings.json`:

```json
{ "cacheTTL": 900, "postsPerPage": 5, "followingPerPage": 10 }
```

### Atomic, serialized writes

Writes follow a **temp-file + rename** strategy:

```
read → modify in memory → write *.json.tmp → rename over *.json
```

Rename is atomic on a single filesystem, so a crash mid-write cannot leave a half-written
document. A **per-file promise queue** serializes writes so concurrent Discord
interactions never interleave.

`data/*.json` is git-ignored (it can contain runtime/user data). Only `data/.gitkeep`
and `data/examples/` are committed.

---

## Cache behavior

```
lookup → memory cache? ─yes→ return cached
             │no
             ▼
         profiles.json? ─yes→ return stored (and warm the cache)
             │no
             ▼
         provider request → save to JSON → warm cache
```

- **Profiles** are cached in memory **and** persisted to `profiles.json`.
- **Posts** and **following** are cached in memory only (large and short-lived).
- Memory cache and rate-limit state **reset on restart** — that is intentional.
  Persistent data stays in JSON.

---

## Rate limiting

Two in-memory sliding-window limiters (no Redis):

1. **Per Discord user** — `USER_REQUEST_LIMIT` / `USER_REQUEST_WINDOW_SECONDS`.
   Exceeding it returns `⏳ You're searching too fast. Try again in Ns.`
2. **Global provider** — `PROVIDER_REQUEST_LIMIT` / `PROVIDER_REQUEST_WINDOW_SECONDS`,
   a safety valve so Insbit stays within its data source's allowance and never attempts to
   circumvent an upstream rate limit.

---

## Backup

`data/` is the entire persistent state, so **back it up**.

A rotating backup is written to `data/backups/<name>-<YYYY-MM-DD>.json` before profile
storage is modified; at most `MAX_BACKUPS` files are kept per source file.

Manual backup:

```bash
mkdir -p backups && cp data/*.json backups/
```

Restore by copying the files back into `data/`.

---

## Docker deployment

```bash
docker build -t insbit .
docker run -d --name insbit \
  --env-file .env \
  -v "$(pwd)/data:/app/data" \
  insbit
```

The `-v ./data:/app/data` mount is **required** so JSON data survives container restarts.
The image is a multi-stage build: TypeScript is compiled in the builder, and only
production dependencies plus `dist/` ship in the runtime image.

---

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Run with auto-reload (tsx watch). |
| `npm run build` | Compile TypeScript to `dist/`. |
| `npm start` | Run the compiled bot. |
| `npm run register` | Register slash commands with Discord. |
| `npm run typecheck` | Type-check without emitting. |
| `npm test` | Run the Vitest suite. |
| `npm run lint` | Lint with ESLint. |
| `npm run format` | Format with Prettier. |

---

## Testing

```bash
npm test
```

Coverage includes: JSON store (creation, read, write, update, corrupt-file recovery,
atomic writes, 50 concurrent writes), memory cache (hit/miss/expiry/prefix invalidation),
rate limiter (allow/block/window expiry/per-user isolation), sessions (valid, wrong user,
missing), pagination (first/middle/last/clamping), username validation, the provider
(valid/missing fields/private/not-found/429/500/malformed), and the Discord views
(embeds, buttons, disabled states, error sanitization).

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Slash commands don't appear | Run `npm run register`. Set `DISCORD_GUILD_ID` for instant registration. |
| `Invalid environment configuration` on start | `DISCORD_TOKEN` / `DISCORD_CLIENT_ID` are missing or malformed. |
| `⚠️ Data temporarily unavailable` | `DOSCO_BASE_URL` is unset, or Dosco is down/rate-limited. |
| `🔒 Private Profile` | The source reported the profile as private — Insbit will not bypass this. |
| `🔒 This Insbit session belongs to another user` | Run `/instagram` yourself; sessions are per-user. |
| `⌛ This Insbit session has expired` | Sessions expire after `SESSION_RETENTION_SECONDS`; start a new lookup. |
| Profiles vanish after restart | Expected — the memory cache is cleared; `data/*.json` persists. |
| Data lost after container restart | Mount a volume: `-v ./data:/app/data`. |
| JSON looks corrupted | Insbit recovers by falling back to defaults and logs the error; restore from `data/backups/`. |

---

## Privacy limitations

Insbit **does not** and **will not**:

- Access private Instagram content.
- Bypass authentication, CAPTCHAs, or anti-bot systems.
- Circumvent rate limits or access restrictions.
- Obtain private email addresses, phone numbers, passwords, tokens, or credentials.
- Send follows, likes, comments, DMs, or any interaction to Instagram accounts.
- Reveal information Instagram intentionally hides.

"Anonymous" here means that **searching through Insbit does not cause Insbit to interact
with the Instagram account.** Only information the configured data source legitimately
exposes publicly is displayed, and unavailable fields are shown as **"Not available"** —
never invented.

---

## Performance note

For a small/medium bot, JSON storage is more than sufficient, and Insbit only writes when
persistent data actually changes (button clicks read from cache). If the project grows
very large, JSON files may become a bottleneck — at that point, consider a database
**explicitly**, rather than silently introducing one.
