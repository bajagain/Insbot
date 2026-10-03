Build Insbit — JSON-Only Discord Instagram Public Profile Viewer

1. Project Overview

Build a production-quality Discord bot called Insbit using Node.js + TypeScript + discord.js.

Insbit is a GUI-first Discord bot for viewing information legitimately available from public Instagram profiles through an authorized/permitted data source.

The bot must have:

- NO PostgreSQL
- NO MySQL
- NO MongoDB
- NO Redis
- NO external database
- NO external cache server

All persistent Insbit application data must be stored locally in JSON files.

Temporary runtime state may be stored in Node.js memory using "Map", "Set", or similar structures.

---

2. Core Privacy Rule

Insbit must only display information that its configured data source legitimately makes available.

Insbit must NOT:

- Access private Instagram content.
- Bypass authentication.
- Bypass CAPTCHA or anti-bot systems.
- Circumvent rate limits or access restrictions.
- Obtain private email addresses or phone numbers.
- Obtain passwords, tokens, or credentials.
- Send follows, likes, comments, DMs, or other interactions to Instagram accounts.
- Attempt to reveal information intentionally hidden by Instagram.

"Anonymous" means that searching through Insbit does not cause Insbit to interact with the Instagram account.

---

3. Technology Stack

Use:

- Node.js
- TypeScript
- discord.js
- Zod
- Pino
- dotenv
- ESLint
- Prettier
- Vitest or Jest

Storage:

JSON files only

Do NOT install or configure:

PostgreSQL
MySQL
MongoDB
Redis
Prisma
Mongoose
Sequelize

---

4. Project Structure

Use this structure:

insbit/
│
├── src/
│   ├── index.ts
│   │
│   ├── config/
│   │   └── env.ts
│   │
│   ├── discord/
│   │   ├── client.ts
│   │   │
│   │   ├── commands/
│   │   │   └── instagram.ts
│   │   │
│   │   ├── components/
│   │   │   ├── profileView.ts
│   │   │   ├── postsView.ts
│   │   │   ├── followingView.ts
│   │   │   └── errorView.ts
│   │   │
│   │   └── handlers/
│   │       ├── buttonHandler.ts
│   │       └── interactionHandler.ts
│   │
│   ├── instagram/
│   │   ├── provider.ts
│   │   ├── types.ts
│   │   ├── validator.ts
│   │   └── providers/
│   │       └── authorizedProvider.ts
│   │
│   ├── services/
│   │   ├── profileService.ts
│   │   ├── postsService.ts
│   │   └── followingService.ts
│   │
│   ├── storage/
│   │   ├── jsonStore.ts
│   │   ├── profilesStore.ts
│   │   ├── sessionsStore.ts
│   │   └── settingsStore.ts
│   │
│   ├── cache/
│   │   └── memoryCache.ts
│   │
│   ├── security/
│   │   ├── rateLimiter.ts
│   │   └── sessionSecurity.ts
│   │
│   └── utils/
│       ├── logger.ts
│       ├── pagination.ts
│       └── errors.ts
│
├── data/
│   ├── profiles.json
│   ├── sessions.json
│   ├── settings.json
│   └── stats.json
│
├── tests/
│
├── .env
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── eslint.config.js
├── prettier.config.js
├── Dockerfile
└── README.md

---

5. JSON Storage

All persistent application information must live inside:

data/

Example:

data/
├── profiles.json
├── sessions.json
├── settings.json
└── stats.json

Create these automatically if they don't exist.

Example "profiles.json":

{
  "profiles": {}
}

Example:

{
  "profiles": {
    "example": {
      "username": "example",
      "displayName": "Example User",
      "biography": "Building cool things.",
      "profilePictureUrl": "https://...",
      "followers": 12000,
      "following": 321,
      "postsCount": 45,
      "verified": false,
      "website": null,
      "profileUrl": "https://instagram.com/example/",
      "retrievedAt": "2026-10-03T12:00:00.000Z"
    }
  }
}

---

6. JSON Store Implementation

Create a reusable JSON storage service.

Example API:

interface JsonStore<T> {
  read(): Promise<T>;
  write(data: T): Promise<void>;
  update(updater: (data: T) => T | Promise<T>): Promise<T>;
}

Use asynchronous filesystem operations.

Use:

fs/promises

Do NOT block the Node.js event loop with synchronous file operations during normal requests.

---

7. Atomic JSON Writes

Do not directly overwrite the JSON file while it may be accessed by another operation.

Use an atomic-write strategy:

Read existing JSON
       ↓
Modify in memory
       ↓
Write temporary file
       ↓
Rename temporary file
       ↓
Original file replaced

For example:

profiles.json
profiles.json.tmp

Write the new data to ".tmp", then rename it to "profiles.json".

This reduces the chance of corrupting the JSON file if the process crashes during a write.

---

8. Prevent Concurrent Write Problems

Multiple Discord interactions may happen simultaneously.

Implement a lightweight per-file write queue.

Example concept:

Request A ─┐
Request B ─┼──► JSON write queue ──► profiles.json
Request C ─┘

Do not allow simultaneous writes to the same JSON file.

A simple promise-based queue is sufficient.

Do NOT introduce Redis or a database just for this.

---

9. Temporary Runtime Cache

Since Redis is forbidden, use an in-memory cache.

Example:

const profileCache = new Map<string, CachedProfile>();

Each cached item should have:

interface CachedProfile<T> {
  data: T;
  expiresAt: number;
}

Example:

Memory
│
├── profile:example
├── profile:nasa
├── posts:example
└── following:example

When the bot restarts, this cache disappears.

That is intentional.

Persistent data belongs in JSON.

---

10. Cache Strategy

Flow:

User searches username
        │
        ▼
Memory cache?
   │          │
  YES         NO
   │          │
   ▼          ▼
Return      profiles.json?
cached          │
data        ┌───┴───┐
            │       │
           YES      NO
            │       │
            ▼       ▼
          Return   Provider
          stored   request
          data       │
                     ▼
                Save JSON
                     │
                     ▼
                Memory cache

Do not make an external provider request every time someone clicks a button.

---

11. Main Command

Create:

/instagram <username>

Example:

/instagram username:nasa

Normalize:

nasa
@nasa

into:

nasa

Validate usernames before processing.

---

12. Profile GUI

After the search, display a polished Discord Embed.

Example layout:

┌─────────────────────────────────┐
│         Instagram Profile       │
│                                 │
│          [Profile Photo]        │
│                                 │
│             @username           │
│          Display Name           │
│                                 │
│ Followers      Following        │
│  12.4K           321            │
│                                 │
│ Bio                             │
│ Building cool things 🚀        │
│                                 │
│ [📷 View All Posts]             │
│ [👥 View Following]             │
│ [🔗 Open Instagram]             │
│ [🔄 Refresh]                    │
└─────────────────────────────────┘

Use Discord buttons rather than requiring additional commands.

---

13. Profile Information

Show when available:

- Profile picture
- Username
- Display name
- Biography
- Followers
- Following
- Post count
- Verification status
- Website
- Public category
- Instagram profile URL

If unavailable:

Not available

Never invent information.

---

14. View All Posts

Button:

📷 View All Posts

opens a paginated GUI.

Example:

@username — Posts

[Post image]

Caption:
Example caption...

Post 1 / 20

[◀ Previous] [Next ▶]
[🔙 Profile]

Support:

- Image posts
- Supported video previews
- Carousel posts where the provider supports them
- Caption
- Public date
- Public permalink

Only display/download media when permitted by the configured data source.

---

15. Following GUI

Button:

👥 View Following

opens:

@username — Following

👤 @person1
Person One
"Photographer & creator"

👤 @person2
Person Two
"Developer"

👤 @person3
Person Three
"Travel"

[◀ Previous] [Next ▶]
[🔙 Profile]

Each following entry may contain:

- Profile picture
- Username
- Display name
- Public bio
- Public profile URL

Do not display private contact information.

---

16. Pagination

Do not load thousands of accounts into one Discord message.

Use pagination.

Recommended page size:

10 users per page

Posts can use a smaller page size if necessary.

Example:

Page 1 / 20

Buttons:

◀ Previous
Next ▶
🔙 Profile

Disable Previous on the first page.

Disable Next on the final page.

---

17. Session Storage

Sessions should be stored in:

data/sessions.json

Example:

{
  "sessions": {
    "abc123": {
      "sessionId": "abc123",
      "discordUserId": "123456789",
      "username": "example",
      "view": "profile",
      "page": 1,
      "createdAt": "2026-10-03T12:00:00.000Z",
      "expiresAt": "2026-10-03T13:00:00.000Z"
    }
  }
}

For very short-lived UI state, you may additionally maintain an in-memory Map.

---

18. Session Security

Every interaction must verify:

Who created this session?

If User A creates a session, User B clicking its buttons should receive:

This Insbit session belongs to another user.

Run /instagram yourself to create a new session.

Do not expose session contents.

Sessions must expire automatically.

---

19. Custom IDs

Use compact custom IDs:

insbit:profile:<sessionId>
insbit:posts:<sessionId>:prev
insbit:posts:<sessionId>:next
insbit:following:<sessionId>:prev
insbit:following:<sessionId>:next
insbit:refresh:<sessionId>

Never put API keys, private information, or large JSON data into Discord custom IDs.

---

20. Memory Rate Limiter

Because Redis is not being used, implement rate limiting in memory.

Example:

const requests = new Map<string, number[]>();

Track:

Discord user ID
timestamps

Example configuration:

USER_REQUEST_LIMIT=20
USER_REQUEST_WINDOW_SECONDS=60

When the process restarts, rate-limit state resets.

That is acceptable for this JSON-only version.

---

21. Global Provider Rate Limit

Also maintain a simple in-memory provider limiter.

Example:

Provider requests
      │
      ▼
In-memory limiter
      │
      ├── Allowed
      │
      └── Delayed/rejected

Never attempt to circumvent an external provider's rate limit.

---

22. Instagram Provider Interface

Keep the provider independent from the rest of the application.

interface InstagramProvider {
  getProfile(username: string): Promise<InstagramProfileResult>;

  getPosts(
    username: string,
    cursor?: string
  ): Promise<InstagramPostsResult>;

  getFollowing(
    username: string,
    cursor?: string
  ): Promise<InstagramFollowingResult>;
}

The provider must only use a legitimate/authorized data source.

---

23. Profile Type

interface InstagramProfile {
  username: string;
  displayName?: string;
  biography?: string;
  profilePictureUrl?: string;

  followers?: number;
  following?: number;
  postsCount?: number;

  verified?: boolean;
  category?: string;
  website?: string;

  profileUrl: string;

  retrievedAt: string;
}

---

24. Post Type

interface InstagramPost {
  id: string;

  mediaType:
    | "image"
    | "video"
    | "carousel"
    | "unknown";

  mediaUrl?: string;
  thumbnailUrl?: string;

  caption?: string;
  permalink?: string;
  publishedAt?: string;

  retrievedAt: string;
}

---

25. Following User Type

interface InstagramFollowingUser {
  username: string;
  displayName?: string;
  biography?: string;
  profilePictureUrl?: string;
  profileUrl: string;
}

---

26. Error Handling

Create:

InvalidUsernameError
ProfileNotFoundError
PrivateProfileError
ProviderUnavailableError
ProviderRateLimitError
DataUnavailableError
SessionExpiredError
UnauthorizedSessionError

Display friendly messages.

Example:

❌ Profile not found

No supported public profile information was returned
for @username.

Provider failure:

⚠️ Data temporarily unavailable

Insbit couldn't retrieve this profile right now.
Please try again later.

Private profile:

🔒 Private Profile

Insbit can only display information legitimately
available through its configured data source.

---

27. JSON Files

profiles.json

Stores recently retrieved profiles.

sessions.json

Stores active/short-lived sessions if persistence is required.

settings.json

Stores bot settings.

Example:

{
  "cacheTTL": 900,
  "postsPerPage": 5,
  "followingPerPage": 10
}

stats.json

Optional bot statistics:

{
  "totalSearches": 0,
  "totalProfilesViewed": 0,
  "lastUpdated": null
}

Do not store unnecessary personal information.

---

28. Automatic JSON Cleanup

Because there is no database, implement cleanup.

For example:

profiles.json
      │
      ▼
Remove entries older than configured retention period

Similarly remove expired sessions.

Make retention configurable:

PROFILE_RETENTION_SECONDS=86400
SESSION_RETENTION_SECONDS=3600

Do not retain information indefinitely by default.

---

29. JSON Backup Safety

Before major storage modifications, optionally maintain:

data/backups/

Example:

data/backups/profiles-2026-10-03.json

However, don't create unlimited backups.

Keep only a configurable number.

---

30. Data Directory Safety

Add:

data/

to ".gitignore" if the JSON files may contain runtime/user data.

Commit only:

data/.gitkeep

and optionally example files:

data/examples/profiles.example.json

Never commit API keys or private runtime data.

---

31. Environment Variables

Use:

DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=

INSTAGRAM_PROVIDER_URL=
INSTAGRAM_PROVIDER_API_KEY=

USER_REQUEST_LIMIT=20
USER_REQUEST_WINDOW_SECONDS=60

PROFILE_CACHE_TTL=900
POST_CACHE_TTL=600
FOLLOWING_CACHE_TTL=600

PROFILE_RETENTION_SECONDS=86400
SESSION_RETENTION_SECONDS=3600

NODE_ENV=production
LOG_LEVEL=info

No:

DATABASE_URL
REDIS_URL

because this project does not use either.

---

32. Memory vs JSON

Use this rule:

JSON = persistent

Store:

profiles
sessions
settings
statistics

Memory = temporary

Store:

active cache
rate limits
write queues
temporary provider state

When Node.js restarts:

Memory → cleared
JSON → preserved

This behavior is intentional.

---

33. Performance

Because JSON files are being used, do not rewrite massive JSON files for every button click.

For example:

BAD:

Button click
   ↓
Rewrite entire profiles.json

Prefer:

Button click
   ↓
Read/cache existing data
   ↓
Only write when persistent data actually changes

For a small/medium bot this is sufficient.

If the project eventually becomes very large, document that JSON storage may become a bottleneck.

Do not silently introduce a database.

---

34. Concurrency

Implement a JSON file write queue.

Concept:

class JsonWriteQueue {
  private queues = new Map<string, Promise<void>>();

  async enqueue(
    file: string,
    operation: () => Promise<void>
  ): Promise<void> {
    // serialize writes per file
  }
}

This prevents:

Request A ─┐
Request B ─┼──► simultaneous writes ──► corrupted JSON
Request C ─┘

Instead:

Request A
   ↓
Request B
   ↓
Request C
   ↓
JSON

---

35. GUI Design Requirements

The UI must feel modern and polished.

Use:

- Discord Embeds
- Buttons
- Pagination
- Profile thumbnails
- Clear section headings
- Consistent footer
- Error states
- Loading states where useful

Loading message:

🔎 Looking up @username...

Then replace it with the profile GUI.

---

36. Main Navigation

Profile:

📷 View All Posts
👥 View Following
🔗 Open Instagram
🔄 Refresh

Posts:

◀ Previous
Next ▶
🔙 Profile

Following:

◀ Previous
Next ▶
🔙 Profile

All navigation should happen through Discord components.

---

37. Open Instagram

The button should link to the normal public profile:

https://www.instagram.com/<username>/

Only construct URLs from validated usernames.

Do not use this button to trigger any automatic interaction.

---

38. Security

Implement:

- Username validation
- Session ownership validation
- Rate limiting
- Input validation with Zod
- Safe JSON parsing
- Atomic JSON writes
- Serialized writes
- API-key protection
- Error sanitization
- Discord permission minimization

Never use:

eval()
new Function()

on external data.

Never expose provider credentials.

---

39. Testing

Test:

JSON storage

- File creation
- Read
- Write
- Update
- Corrupted JSON handling
- Atomic writes
- Concurrent writes

Cache

- Cache hit
- Cache miss
- Expiration

Rate limiting

- Allowed request
- Rate-limited request
- Window expiration

Sessions

- Valid session
- Expired session
- Wrong Discord user
- Missing session

Pagination

- First page
- Middle page
- Last page
- Previous
- Next

Provider

- Valid profile
- Missing fields
- Private profile
- Not found
- Provider error

---

40. Commands

Initially implement only:

/instagram <username>

Optional administrative commands can be added later.

Do not create unnecessary commands.

---

41. Deployment

The bot should run on a normal Node.js server/VPS.

Example:

npm install
npm run build
npm start

Data remains in:

./data/

Therefore the deployment must use persistent disk storage.

If Docker is used, mount:

./data:/app/data

so JSON survives container restarts.

---

42. Backup

Because JSON is the persistent storage, explain in README that:

data/

must be backed up.

A simple backup command can copy:

data/*.json

to a backup directory.

---

43. README Requirements

Document:

- Installation
- Node.js version
- Discord application setup
- Bot invitation
- Environment variables
- JSON storage
- Data directory
- Provider configuration
- Commands
- GUI navigation
- Cache behavior
- Rate limiting
- Backup
- Docker deployment
- Troubleshooting
- Privacy limitations

Explicitly state:

Insbit does not bypass private Instagram accounts,
authentication, CAPTCHAs, rate limits, or access controls.

---

44. Final User Flow

The final experience must look like:

User
 │
 │ /instagram username
 ▼
Insbit
 │
 ▼
Loading...
 │
 ▼
┌──────────────────────────────┐
│ Instagram Profile            │
│                              │
│       [Profile Photo]        │
│                              │
│          @username           │
│        Display Name          │
│                              │
│ Followers   Following       │
│  12.4K        321            │
│                              │
│ Bio                          │
│ Building cool things 🚀     │
│                              │
│ [📷 View All Posts]          │
│ [👥 View Following]          │
│ [🔗 Open Instagram]          │
│ [🔄 Refresh]                 │
└──────────────────────────────┘
          │
          ├───────────────┐
          ▼               ▼
     ALL POSTS        FOLLOWING
          │               │
          ▼               ▼
     Pagination       Pagination
                          │
                          ▼
                    Username
                    Display Name
                    Public Bio

45. Final Development Instruction

Build the complete project, not just an example.

Do not add PostgreSQL, MySQL, MongoDB, Redis, Prisma, or another database.

Use local JSON files for persistent storage and Node.js memory for temporary runtime state.

Implement robust JSON read/write handling, atomic writes, serialized writes, caching, rate limiting, session security, pagination, Discord GUI components, provider abstraction, error handling, tests, and documentation.

The final bot should be clean enough to deploy on a small VPS with only:

Node.js
Discord bot token
Configured permitted data source
Persistent filesystem

No external database or Redis server should be required.
