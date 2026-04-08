# Platform Hardening Architecture
### The Sandbox — CATS-AI / University of Kentucky
### Status: Blueprint — not yet implemented
### Written: 2026-03-18

This document describes the concrete architectural changes needed to move The Sandbox from a
demo-grade prototype to a production-ready platform. It is organized into tiers by severity
and is meant to be worked through roughly in order.

---

## Table of Contents

1. [Tier 1 — Critical (Pre-Launch Blockers)](#tier-1--critical)
   - [1.1 Collab Real-Time: In-Process EventEmitter → Redis Pub/Sub](#11-collab-real-time-in-process-eventemitter--redis-pubsub)
   - [1.2 AI Endpoint Rate Limiting](#12-ai-endpoint-rate-limiting)
   - [1.3 Admin Dashboard Unbounded Queries](#13-admin-dashboard-unbounded-queries)
2. [Tier 2 — High (Security & Correctness)](#tier-2--high)
   - [2.1 Auth Layer: Fix Suspended-User Bypass & Duplicate Lookups](#21-auth-layer-fix-suspended-user-bypass--duplicate-lookups)
   - [2.2 Authorization: Educator Ownership Checks](#22-authorization-educator-ownership-checks)
   - [2.3 XP & Quest Idempotency](#23-xp--quest-idempotency)
3. [Tier 3 — Medium (Maintainability & Performance)](#tier-3--medium)
   - [3.1 Zod Enums: Single-Source from Prisma](#31-zod-enums-single-source-from-prisma)
   - [3.2 Auth DB Roundtrip: Edge-Compatible Session Cache](#32-auth-db-roundtrip-edge-compatible-session-cache)
   - [3.3 Admin Dashboard: Decomposed Endpoints](#33-admin-dashboard-decomposed-endpoints)
4. [Dependency & Migration Notes](#dependency--migration-notes)

---

## Tier 1 — Critical

### 1.1 Collab Real-Time: In-Process EventEmitter → Redis Pub/Sub

#### Problem

`app/lib/collab-bus.ts` uses a Node.js `EventEmitter` as the message bus for collab sessions.
This is an in-process singleton. When the app runs on more than one server process (Vercel
serverless functions, any horizontal scale), two participants in the same collab session can land
on different instances and never receive each other's events. The SSE streams will appear alive
but carry no collaborative messages.

The same module is also the sole mechanism keeping the collab stream route open:
`/api/collab/stream/[id]` subscribes via `subscribeToCollabSession`. There is no retry or
fallback — if the bus is cross-process, the stream silently delivers nothing.

#### Solution: Upstash Redis Pub/Sub

Replace the EventEmitter with **Upstash Redis** using their `@upstash/redis` client and its
built-in pub/sub API. Upstash is serverless-native (HTTP-based, no persistent TCP connection)
and works on Vercel edge and serverless runtimes.

**New environment variables required:**
```
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

**New module: `app/lib/collab-bus.ts` (replacement)**

The interface stays identical so call sites don't change. Only the internals change.

```
publishToCollabSession(sessionId, event)
  → JSON.stringify(event)
  → redis.publish(`collab:${sessionId}`, payload)

subscribeToCollabSession(sessionId, handler)
  → Opens a subscribe connection via Upstash's pub/sub
  → Calls handler(event) on each received message
  → Returns an unsubscribe function that calls unsubscribe + disconnect
```

**SSE route change (`/api/collab/stream/[id]/route.ts`):**

The route must keep the HTTP response open while forwarding Redis events into the SSE stream.
The subscribe call returns an async iterator or callback; enqueue each message via
`ReadableStream`. Set `runtime = 'nodejs'` on this route (not edge) because Upstash's
pub/sub uses a long-lived HTTP connection that needs Node streams.

**Key constraints:**
- `publishToCollabSession` stays fire-and-forget (no await on the publish call sites in
  message handlers).
- The subscribe side must clean up the Redis connection on stream close / client disconnect.
  Use the `req.signal.addEventListener('abort', unsubscribe)` pattern.
- Channel key format: `collab:${sessionId}` — prefixed to avoid collisions with any future
  Redis key usage.
- Upstash pub/sub connections count against rate limits; max collab participants per session
  (currently 20) is well within limits.

**Collab bus tests:**
- Integration test that publishes from one simulated instance and asserts the subscriber on
  a different call receives the message.
- Verify the unsubscribe cleanup runs on both clean close and abrupt disconnect.

---

### 1.2 AI Endpoint Rate Limiting

#### Problem

The following endpoints each trigger paid external API calls with no usage cap per user:

| Endpoint | External call | Cost surface |
|---|---|---|
| `POST /api/sessions/[id]/messages` | Anthropic (Haiku stream) | Per-message, high frequency |
| `POST /api/concierge` | Anthropic (Sonnet stream) | Sonnet is ~5× Haiku cost |
| `POST /api/build-tool` | Anthropic (Sonnet) | Full tool generation |
| `POST /api/build-gamification` | Anthropic (Sonnet) | Metrics generation |
| `POST /api/builder` | Anthropic (Sonnet) | Builder session |
| `POST /api/audio/synthesize` | OpenAI TTS | Per-character |
| `POST /api/playground/chat` | Anthropic | Per-message |
| `POST /api/courses/[id]/generate-bot` | Anthropic | TA generation |

A single user can hammer any of these in a tight loop. There is no cost ceiling per user,
per tool, or per day.

#### Solution: `@upstash/ratelimit` Middleware Layer

**New environment variable:** Shares the Upstash Redis from 1.1.

**New module: `app/lib/rate-limit.ts`**

Wrap `@upstash/ratelimit` into typed helpers that match our route patterns:

```typescript
// Three limit tiers, keyed by userId (falls back to IP for anonymous):
//
// CHAT:     60 requests / 1 minute  — conversational, streaming
// GENERATE: 10 requests / 1 minute  — tool/bot generation (expensive)
// AUDIO:    20 requests / 1 minute  — TTS
//
// Uses a sliding window algorithm (fair, no burst cliff)

export type RateLimitTier = 'CHAT' | 'GENERATE' | 'AUDIO'

export async function checkRateLimit(
  req: NextRequest,
  userId: string | null,
  tier: RateLimitTier
): Promise<NextResponse | null>
// Returns null if allowed, or a 429 NextResponse if throttled.
// The 429 response includes `Retry-After` header.
```

**Usage pattern in route handlers:**

```typescript
// Near the top of each AI route, after auth:
const rateLimitError = await checkRateLimit(req, user.id, 'CHAT')
if (rateLimitError) return rateLimitError
```

**Tier assignments:**

| Tier | Routes |
|---|---|
| `CHAT` | `/api/sessions/[id]/messages`, `/api/concierge`, `/api/playground/chat`, `/api/collab/sessions/[id]/messages` |
| `GENERATE` | `/api/build-tool`, `/api/build-gamification`, `/api/builder`, `/api/courses/[id]/generate-bot`, `/api/courses/[id]/materials/import-syllabus`, `/api/studio/audit` |
| `AUDIO` | `/api/audio/synthesize` |

**Admin bypass:**
Admin users get 10× the normal limit (multiply window count). Do not skip the check entirely —
even admins should not be able to generate unbounded costs accidentally.

**Educator vs Student:**
Consider giving EDUCATOR accounts a higher GENERATE limit (20/min vs 10/min) since they
are the primary tool builders and need faster iteration.

**Frontend handling:**
When a 429 is returned, the UI should show a "You're going too fast — try again in N seconds"
message rather than a generic error. The `Retry-After` header carries the N value.

---

### 1.3 Admin Dashboard Unbounded Queries

#### Problem

`GET /api/admin` runs 15 parallel queries, two of which are unbounded full-table scans:

1. `prisma.tool.findMany()` — no `take` — fetches every tool in the database with full counts.
2. `prisma.chatMessage.findMany({ where: { createdAt: { gte: monthStart } } })` — fetches all
   monthly chat messages and aggregates them in JavaScript.

As the platform grows (thousands of tools, millions of messages), this single dashboard
endpoint will become the most expensive query in the system.

#### Solution: Pagination + DB-Level Aggregation

**Fix 1 — Paginate `allTools`:**

Add a `take` and `skip` to the allTools query. The admin UI almost certainly doesn't need
every tool on initial load.

```
prisma.tool.findMany({
  take: 50,
  skip: offset,          // from ?page= query param
  orderBy: { createdAt: 'desc' },
  include: { creator: true, _count: { ... } },
})
```

Add a companion count query (`prisma.tool.count()`) so the UI can render pagination controls.

**Fix 2 — Aggregate token economics at the DB level:**

Replace the JS-side reduce with a `groupBy` query:

```
prisma.chatMessage.groupBy({
  by: ['sessionId'],
  where: { createdAt: { gte: monthStart }, role: 'assistant' },
  _sum: { inputTokens: true, outputTokens: true, tokensUsed: true },
})
```

Then join the session→tool and session→user mappings in a second targeted query (keyed by
the sessionIds returned). This avoids pulling message content into memory at all.

For the top-10 tools and top-10 users views, perform the sort/limit in the query rather than
pulling all data and sorting in JS.

**Fix 3 — Cache the economics calculation:**

Token economics don't change second-to-second. Cache the result in Redis with a 5-minute TTL:

```
const cacheKey = `admin:economics:${monthStart.toISOString().slice(0, 7)}`  // YYYY-MM
const cached = await redis.get(cacheKey)
if (cached) return NextResponse.json(JSON.parse(cached))
// ... compute ...
await redis.set(cacheKey, JSON.stringify(result), { ex: 300 })
```

This makes the admin dashboard feel instant for subsequent loads and removes the biggest
cost query from the hot path.

---

## Tier 2 — High

### 2.1 Auth Layer: Fix Suspended-User Bypass & Duplicate Lookups

#### Problem A: Suspended users can create sessions

`POST /api/sessions/route.ts` calls `parseRequestBody` then does its own manual user lookup:
```typescript
const userEmail = req.headers.get('x-demo-user-email')
const user = await prisma.user.findUnique({ where: { email: userEmail } })
```
This bypasses `requireRequestUser` entirely, which means `user.suspended` is never checked.
A suspended user can create tool sessions freely.

Similarly, `GET /api/sessions/[id]/messages/route.ts` does the same ad-hoc lookup without
suspension checking.

Any route that does its own `prisma.user.findUnique` instead of using `requireRequestUser`
is vulnerable to this class of bypass.

#### Problem B: Auth lookup inconsistency

There are at least two separate auth utilities that duplicate the same DB lookup:
- `requireRequestUser` in `app/lib/server-auth.ts`
- `requireLeagueUser` in `app/lib/leagues/auth.ts`

These have different error formats, different suspended-user handling (leagues auth has none),
and different suspension bypass behavior. Any future auth change must be applied to both.

#### Solution: Consolidate Auth, Fix Sessions Route

**Step 1 — Merge `requireLeagueUser` into `requireRequestUser`:**

Delete `app/lib/leagues/auth.ts`'s `requireLeagueUser` and `getLeagueUserByEmail`. Replace all
call sites in league routes with `requireRequestUser` from `server-auth.ts`. The
`LeagueHttpError` throw-style error handling in league routes can be preserved by wrapping
the result check (`isAuthFailure(auth) → throw new LeagueHttpError(auth.response.status, ...)`)
or by migrating leagues to the return-style pattern used elsewhere.

**Step 2 — Fix `POST /api/sessions`:**

Replace the ad-hoc lookup with `requireRequestUser`. Sessions should be user-authenticated:

```typescript
const auth = await requireRequestUser(req, { allowSuspended: false })
if (isAuthFailure(auth)) return auth.response
const { user } = auth
// userId = user.id — no second lookup needed
```

**Step 3 — Audit all routes for ad-hoc lookups:**

Search for `prisma.user.findUnique({ where: { email` across all route files. Every match
that is not inside `server-auth.ts` or `leagues/auth.ts` is a candidate bypass. Each should
be replaced with `requireRequestUser`.

The routes most likely to have this pattern (based on the messages route): all `GET` routes
that need the user for ownership checks but weren't given auth utilities to use.

---

### 2.2 Authorization: Educator Ownership Checks

#### Problem

`requireRequestUser` has a `requireAdmin` option but no educator or resource-ownership checks.
Routes that should only be accessible by the educator who owns a course or tool must implement
ownership checks manually — and some don't.

`POST /api/build-tool` and `POST /api/courses` have no role guard at all currently.
Any authenticated user (including students) can call them.

#### Solution: Extend `server-auth.ts` with Resource Guards

**New utility functions in `app/lib/server-auth.ts`:**

```typescript
// Requires EDUCATOR or ADMIN role.
export async function requireEducatorUser(request: NextRequest): Promise<RequestAuthResult>

// Requires the authenticated user to be the creator of a course,
// or an ADMIN (admins can always edit anything).
export async function requireCourseOwner(
  request: NextRequest,
  courseId: string
): Promise<RequestAuthResult>

// Same pattern for tools.
export async function requireToolOwner(
  request: NextRequest,
  toolId: string
): Promise<RequestAuthResult>
```

**Implementation of `requireCourseOwner`:**

```typescript
export async function requireCourseOwner(
  request: NextRequest,
  courseId: string
): Promise<RequestAuthResult> {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth

  const { user } = auth
  if (user.role === 'ADMIN') return auth  // admins pass through

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { creatorId: true },
  })
  if (!course) {
    return { response: NextResponse.json({ error: 'Course not found' }, { status: 404 }) }
  }
  if (course.creatorId !== user.id) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return auth
}
```

**Routes to update:**

| Route | Current guard | Required guard |
|---|---|---|
| `POST /api/courses` | `requireRequestUser` | `requireEducatorUser` |
| `PUT /api/courses/[id]` | manual? | `requireCourseOwner(id)` |
| `POST /api/courses/[id]/materials` | manual? | `requireCourseOwner(id)` |
| `POST /api/courses/[id]/generate-bot` | manual? | `requireCourseOwner(id)` |
| `POST /api/courses/[id]/objectives` | manual? | `requireCourseOwner(id)` |
| `POST /api/courses/[id]/rubrics` | manual? | `requireCourseOwner(id)` |
| `POST /api/build-tool` | none | `requireEducatorUser` |
| `POST /api/builder` | none | `requireEducatorUser` |
| `PUT /api/tools/[id]` | manual? | `requireToolOwner(id)` |

Do a full audit by searching for routes under `/api/courses/[id]` and `/api/admin/tools`
that accept `PUT`, `POST`, `PATCH`, or `DELETE` and verify each has an appropriate guard.

---

### 2.3 XP & Quest Idempotency

#### Problem

`POST /api/xp/events` logs an XP award with no deduplication. A network retry, double-tap
on a button, or race condition in the client can write multiple XP rows for the same event.

`POST /api/quests/[id]/claim` — if the claim write succeeds but the response times out,
the client retries and the quest is claimed (and XP awarded) a second time.

Sand ledger operations in league resolution have the same risk.

#### Solution: Idempotency Keys + Unique DB Constraints

**XP events — client-generated idempotency key:**

The client generates a UUID for each intentional XP event and sends it in the request body.
The server stores it in a `idempotencyKey` column on the `XpEvent` table (unique constraint).
On a duplicate key violation, return `200` (not `409`) — the operation is "already done,"
which is correct from the client's perspective.

Schema addition:
```prisma
model XpEvent {
  // ... existing fields ...
  idempotencyKey String? @unique
}
```

Schema addition to `CreateXpEventSchema` in `schemas.ts`:
```typescript
idempotencyKey: z.string().uuid().optional(),
```

Server logic:
```typescript
try {
  await prisma.xpEvent.create({ data: { ...eventData, idempotencyKey } })
} catch (e) {
  if (isUniqueConstraintError(e)) {
    return NextResponse.json({ ok: true, duplicate: true })  // idempotent
  }
  throw e
}
```

**Quest claims — unique DB constraint:**

Add a unique constraint on `(userId, questId)` on the `UserQuestProgress` (or equivalent)
table. The server-side claim logic becomes:

```typescript
try {
  await prisma.userQuestProgress.upsert({
    where: { userId_questId: { userId, questId } },
    create: { userId, questId, completedAt: new Date() },
    update: {},  // no-op if already claimed
  })
} catch { ... }
```

This makes the claim endpoint idempotent by construction — a second request is a no-op
rather than an error or a double-award.

**Sand ledger — transactional writes:**

League cycle resolution already uses `prisma.$transaction` in most places. Verify all Sand
ledger credit/debit operations are inside transactions and that the resolve endpoint is not
callable twice for the same cycle. Add a `resolvedAt` timestamp to the cycle model and
reject resolution if already set.

---

## Tier 3 — Medium

### 3.1 Zod Enums: Single-Source from Prisma

#### Problem

`app/lib/schemas.ts` manually mirrors Prisma enums:
```typescript
export const ToolTypeSchema = z.enum(['EXTERNAL', 'CHATBOT', 'SIMULATION', ...])
export const UserRoleSchema = z.enum(['EDUCATOR', 'STUDENT', 'ADMIN'])
// etc.
```

When a new value is added to a Prisma enum, the Zod schema must be updated separately.
This is a common source of bugs that only surface at runtime.

#### Solution: `z.nativeEnum()` with Prisma-generated enums

Prisma generates TypeScript enums (or const objects) in `app/generated/prisma`. Import and
use them directly:

```typescript
import { ToolType, UserRole, ApprovalStatus, ... } from '../generated/prisma'

export const ToolTypeSchema = z.nativeEnum(ToolType)
export const UserRoleSchema = z.nativeEnum(UserRole)
export const ApprovalStatusSchema = z.nativeEnum(ApprovalStatus)
```

After this change, adding a new `ToolType` in `schema.prisma` and running `prisma generate`
automatically makes it valid in all API input validation — no manual sync needed.

**Note:** `z.nativeEnum()` works with both TypeScript `enum` declarations and Prisma's
const object enums. Verify the Prisma v7 generator output format (`app/generated/prisma`)
before migrating — if it emits `const` objects rather than `enum` declarations, use the
`z.enum([...Object.values(ToolType)] as const)` pattern instead.

---

### 3.2 Auth DB Roundtrip: Edge-Compatible Session Cache

#### Problem

Every API request triggers `requireRequestUser` → `prisma.user.findUnique()`. For a page
that makes 5 parallel API calls on load (common in the admin dashboard and course view),
that is 5 DB roundtrips just for auth. At scale, this is significant overhead.

#### Solution: Short-Lived In-Memory Cache (Phase 1) → Redis (Phase 2)

**Phase 1 — LRU cache in `server-auth.ts`:**

Use a small in-memory LRU cache (e.g., `lru-cache` package, 500-entry limit) keyed by email,
with a 60-second TTL:

```typescript
import { LRUCache } from 'lru-cache'

const userCache = new LRUCache<string, User>({ max: 500, ttl: 60_000 })

export async function getUserByEmail(email: string): Promise<User | null> {
  const cached = userCache.get(email)
  if (cached) return cached

  const user = await prisma.user.findUnique({ where: { email } })
  if (user) userCache.set(email, user)
  return user
}
```

This is safe because:
- User roles and suspension status change infrequently.
- The 60-second window is short enough that a suspension takes effect quickly.
- On a single-process dev server it's perfectly effective.
- On multi-instance production, different instances may have slightly stale cache —
  acceptable for role/suspension staleness, not for financial data.

**Phase 2 — Redis cache (when Upstash is already in place from 1.1):**

Replace the LRU cache with a Redis GET/SET with 60-second TTL. This makes the cache
consistent across all serverless instances. Invalidate the cache key when a user's role
or suspended status changes (in `PATCH /api/admin/users/[id]`).

**What this is NOT:**
This is not a full auth system. The `x-demo-user-email` header-based identity should be
replaced with a real auth provider (NextAuth.js, Clerk, or UK SSO/Shibboleth) before
production. When that migration happens, the DB lookup becomes a JWT verification — which
is CPU-only and needs no cache at all.

---

### 3.3 Admin Dashboard: Decomposed Endpoints

#### Problem

`GET /api/admin` returns 15 different data shapes in one payload. This means:
- The entire dashboard blocks on the slowest query.
- Individual sections cannot be cached independently.
- Adding a new admin widget requires modifying this single mega-endpoint.
- Frontend can't show partial data as sections load.

#### Solution: Split into Purpose-Scoped Endpoints

Decompose `GET /api/admin` into:

| New endpoint | Replaces | Cache TTL |
|---|---|---|
| `GET /api/admin/stats` | totalTools, totalSessions, totalUsers, totalUpvotes | 5 min |
| `GET /api/admin/tools?status=pending` | pendingTools | 30 sec |
| `GET /api/admin/tools?status=all&page=N` | allTools (paginated) | 30 sec |
| `GET /api/admin/tools?type=service` | serviceBots | 2 min |
| `GET /api/admin/sessions/flagged` | flaggedSessions | 30 sec |
| `GET /api/admin/economics?month=YYYY-MM` | economics | 5 min (Redis cached) |
| `GET /api/admin/audit-log` | auditLog | 30 sec |
| `GET /api/admin/announcements` | recentAnnouncements | 1 min |

The existing `GET /api/admin` can remain for backwards compatibility but should delegate to
these sub-endpoints rather than running its own queries.

**Frontend loading strategy:**
Load `stats` first (cheap, cached). Render the dashboard skeleton. Load each tab's data
only when the tab is activated (lazy per-tab fetch). This makes the admin page feel
instant regardless of data volume.

---

## Dependency & Migration Notes

### Package additions required

```
@upstash/redis          — Redis client (HTTP-based, serverless-compatible)
@upstash/ratelimit      — Rate limiting built on Upstash Redis
lru-cache               — Phase 1 auth cache (lightweight, zero infra)
```

The first two share a single Upstash account and two environment variables:
`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

### Implementation order

Work through items strictly in tier order. Tier 2 items assume Tier 1 is done (e.g., the
rate limiter uses Redis which requires Upstash to be in place). Tier 3 items are independent
of each other and can be done in any order.

```
1.1 Collab bus → Redis         (requires Upstash account)
1.2 Rate limiting              (requires Upstash from 1.1)
1.3 Admin query cleanup        (can start in parallel with 1.1/1.2)
2.1 Auth consolidation         (can start in parallel with Tier 1)
2.2 Ownership guards           (after 2.1 — builds on consolidated auth)
2.3 Idempotency                (independent, can parallelize)
3.1 Zod enums                  (independent)
3.2 Auth cache                 (after 2.1 — depends on consolidated getUserByEmail)
3.3 Admin endpoint split       (after 1.3 — builds on cleaned-up queries)
```

### What this does NOT cover

- **Real authentication:** The `x-demo-user-email` header must be replaced with a proper
  auth provider before production. UK uses Shibboleth SSO / Azure AD. See the Azure
  migration plan (`Blueprints/azure-migration-plan.md`) for that work.
- **RAG / vector store hardening:** Covered separately in `Blueprints/rag-gradebook-architecture.md`.
- **LTI integration:** Covered in `Blueprints/lti-bridge-blueprint.md`.
- **Database migrations:** Schema additions for idempotency keys and unique constraints
  (section 2.3) require `prisma migrate dev` + corresponding seed data updates.
