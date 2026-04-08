# Security & Reliability Hardening Plan
### University of Kentucky — CATS-AI / University of Kentucky
### Written: 2026-03-18

This document describes the architecture for hardening the codebase against the issues identified in the March 2026 review. Changes are organized into three phases by effort and impact. Each item includes the problem, the fix, and the files affected.

---

## Phase 1 — Quick Wins (< 1 hour total)

These are small, isolated changes with high safety impact. Do these first.

---

### 1.1 Harden Cron Endpoint Security

**Problem:** In all cron digest routes, if `CRON_SECRET` is not set in the environment the secret check is silently skipped. Any unauthenticated HTTP request can trigger a digest send.

**Affected files:**
- `app/api/brackets/digest/route.ts`
- `app/api/book-recommender/digest/route.ts`
- `app/api/leagues/cron/monday/route.ts`
- Any future cron route

**Fix:** Replace the current pattern:
```typescript
// BEFORE — insecure: skips check if env var missing
if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```
With a fail-closed pattern:
```typescript
// AFTER — secure: rejects all requests if secret not configured
const cronSecret = process.env.CRON_SECRET
if (!cronSecret) {
  console.error('[CRON] CRON_SECRET is not set — rejecting request')
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
if (authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Action:** Extract a shared `verifyCronSecret(request)` helper in `app/lib/server-auth.ts` and call it at the top of every cron handler.

---

### 1.2 Remove JWT Dev Fallback Secret

**Problem:** `app/lib/playground-storage.ts` falls back to the hardcoded string `"sandbox-storage-dev-secret"` when `STORAGE_JWT_SECRET` is not set. If this app is deployed to production without the variable, all tokens are signed with a publicly known secret — anyone can forge a valid token.

**Affected files:**
- `app/lib/playground-storage.ts`

**Fix:**
```typescript
// BEFORE
const secret = process.env.STORAGE_JWT_SECRET ?? 'sandbox-storage-dev-secret'

// AFTER — throws at first request if not configured
function getStorageSecret(): string {
  const secret = process.env.STORAGE_JWT_SECRET
  if (!secret) throw new Error('STORAGE_JWT_SECRET environment variable is required')
  return secret
}
```

**Action:** Update `.env.example` (or equivalent docs) to document this variable as required.

---

### 1.3 Safe Request Body Parsing

**Problem:** Several API routes call `await req.json()` outside of a try-catch. A malformed or empty request body throws an unhandled parse error that can bypass the route's error handler and return a raw 500 with no context.

**Affected files:** Most `POST`/`PATCH` routes that don't wrap `req.json()` in their own try-catch.

**Fix:** Add a shared helper to `app/lib/server-auth.ts` or a new `app/lib/request.ts`:
```typescript
export async function parseRequestBody<T = unknown>(
  req: NextRequest
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const data = await req.json() as T
    return { data }
  } catch {
    return {
      error: NextResponse.json(
        { error: 'Invalid or missing request body' },
        { status: 400 }
      )
    }
  }
}
```

Usage in any route:
```typescript
const parsed = await parseRequestBody(req)
if ('error' in parsed) return parsed.error
const { name, description } = parsed.data
```

---

## Phase 2 — Validation Layer (2–4 hours)

These changes introduce Zod as a single, consistent validation layer across all API routes.

---

### 2.1 Install and Configure Zod

**Install:**
```bash
npm install zod
```

No configuration needed — Zod works out of the box with TypeScript.

---

### 2.2 Create a Shared Validation Helper

**New file: `app/lib/validate.ts`**

```typescript
import { ZodSchema, ZodError } from 'zod'
import { NextResponse } from 'next/server'

export function validateBody<T>(
  schema: ZodSchema<T>,
  data: unknown
): { value: T } | { error: NextResponse } {
  const result = schema.safeParse(data)
  if (!result.success) {
    const message = result.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ')
    return {
      error: NextResponse.json({ error: `Validation failed: ${message}` }, { status: 400 })
    }
  }
  return { value: result.data }
}
```

---

### 2.3 Define Schemas for Each Domain

**New file: `app/lib/schemas.ts`**

Define one Zod schema per major input shape. Derive TypeScript types from the schemas so they stay in sync automatically.

```typescript
import { z } from 'zod'

// --- Enums (kept in sync with prisma/schema.prisma) ---
export const ToolTypeSchema = z.enum([
  'CHATBOT', 'QUIZ', 'FLASHCARD', 'ESSAY', 'SIMULATION',
  'DEBATE', 'CASE_STUDY', 'WORKSHEET', 'CUSTOM'
])
export const DifficultySchema = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
export const CategorySchema = z.enum([
  'STEM', 'HUMANITIES', 'BUSINESS', 'LAW', 'MEDICINE',
  'ARTS', 'SOCIAL_SCIENCES', 'EDUCATION', 'OTHER'
])
export const UserRoleSchema = z.enum(['ADMIN', 'EDUCATOR', 'STUDENT'])
export const ApprovalStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'])

// --- Tool schemas ---
export const CreateToolSchema = z.object({
  name: z.string().min(1).max(100),
  shortDescription: z.string().min(1).max(280),
  fullDescription: z.string().min(1),
  category: CategorySchema,
  toolType: ToolTypeSchema,
  difficulty: DifficultySchema.optional(),
  personaName: z.string().max(50).optional(),
  systemPrompt: z.string().max(8000).optional(),
  starterQuestions: z.array(z.string().max(200)).max(10).optional(),
  audioEnabled: z.boolean().optional(),
  customMetrics: z.array(z.object({
    label: z.string().max(100),
    description: z.string().max(500).optional(),
  })).max(20).optional(),
})
export type CreateToolInput = z.infer<typeof CreateToolSchema>

// --- Bounty schemas ---
export const CreateBountySchema = z.object({
  title: z.string().min(1).max(150),
  description: z.string().min(1).max(2000),
  rewardSand: z.number().int().min(25).max(100000),
  deadline: z.string().datetime().optional(),
  toolTypeRequested: ToolTypeSchema.optional(),
})
export type CreateBountyInput = z.infer<typeof CreateBountySchema>

// --- User update schemas ---
export const UpdateUserSchema = z.object({
  role: UserRoleSchema.optional(),
  suspended: z.boolean().optional(),
  suspendedReason: z.string().max(500).optional(),
}).refine(
  (data) => !data.suspended || data.suspendedReason,
  { message: 'suspendedReason is required when suspending a user', path: ['suspendedReason'] }
)
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>

// --- Chat schemas ---
export const ChatMessageSchema = z.object({
  message: z.string().min(1).max(4000),
  toolId: z.string().cuid(),
  sessionId: z.string().cuid().optional(),
  audioEnabled: z.boolean().optional(),
  audioSpeed: z.number().min(0.25).max(4).optional(),
})
export type ChatMessageInput = z.infer<typeof ChatMessageSchema>

// --- Query string schemas ---
export const ToolsQuerySchema = z.object({
  search: z.string().max(200).optional(),
  category: CategorySchema.optional(),
  toolType: ToolTypeSchema.optional(),
  difficulty: DifficultySchema.optional(),
  approvalStatus: ApprovalStatusSchema.optional(),
  audioEnabled: z.enum(['true', 'false']).optional(),
  sort: z.enum(['newest', 'popular', 'rating', 'trending']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  since: z.string().datetime().optional(),  // fixes unvalidated date parsing
})
export type ToolsQueryInput = z.infer<typeof ToolsQuerySchema>
```

---

### 2.4 Apply Validation in High-Traffic Routes (Priority Order)

Apply schemas in this order — highest traffic / highest risk first:

1. `app/api/tools/route.ts` — Use `CreateToolSchema` (POST) and `ToolsQuerySchema` (GET)
2. `app/api/chat/route.ts` — Use `ChatMessageSchema`
3. `app/api/bounties/route.ts` — Use `CreateBountySchema`
4. `app/api/admin/users/[id]/route.ts` — Use `UpdateUserSchema`
5. `app/api/builder/route.ts` — Add schema for builder spec input
6. All remaining `POST`/`PATCH` routes

---

## Phase 3 — Reliability Improvements (4–8 hours)

These changes improve uptime and observability.

---

### 3.1 Replace In-Memory Rate Limiting with Upstash Redis

**Problem:** The rate limiter in `app/api/chat/route.ts` uses a module-level `Map`. On Vercel serverless, each cold start resets the Map — a user can exceed their message limit by waiting for a cold start. It also doesn't work across multiple function instances.

**Install:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

**Add to `.env`:**
```
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
```

**New file: `app/lib/rate-limit.ts`**
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Only instantiate if env vars are present — falls back to no-op in dev
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

export const chatRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '60 s'),
      analytics: true,
    })
  : null

export async function checkRateLimit(
  identifier: string
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  if (!chatRateLimit) return { allowed: true, remaining: 999, reset: 0 }
  const result = await chatRateLimit.limit(identifier)
  return {
    allowed: result.success,
    remaining: result.remaining,
    reset: result.reset,
  }
}
```

Usage in `app/api/chat/route.ts`:
```typescript
const { allowed, remaining } = await checkRateLimit(user.email)
if (!allowed) {
  return NextResponse.json(
    { error: 'Too many messages. Please wait a moment before continuing.' },
    { status: 429, headers: { 'X-RateLimit-Remaining': String(remaining) } }
  )
}
```

---

### 3.2 Fault-Tolerant Admin Dashboard Queries

**Problem:** `app/api/admin/route.ts` runs 15+ Prisma queries inside `Promise.all()`. One failing query (e.g., a timeout) returns a 500 for the entire dashboard.

**Fix:** Use `Promise.allSettled()` and substitute `null` for failed queries:

```typescript
// BEFORE
const [tools, users, sessions, ...] = await Promise.all([
  prisma.tool.count(),
  prisma.user.count(),
  prisma.toolSession.count(),
  // ...
])

// AFTER
const results = await Promise.allSettled([
  prisma.tool.count(),
  prisma.user.count(),
  prisma.toolSession.count(),
  // ...
])

function settled<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === 'fulfilled' ? result.value : fallback
}

const [toolCount, userCount, sessionCount] = [
  settled(results[0], 0),
  settled(results[1], 0),
  settled(results[2], 0),
]
```

---

### 3.3 Standardize Auth Pattern

**Problem:** Some routes use `'response' in auth` and others use `isAuthFailure(auth)`. Copy-pasted routes sometimes use the wrong check.

**Fix:** Deprecate the raw `'response' in auth` check. Update `app/lib/server-auth.ts` to export `isAuthFailure` prominently, add a JSDoc comment, and do a codebase-wide find-and-replace to standardize on the type guard.

```typescript
// app/lib/server-auth.ts — make this the canonical pattern
/**
 * Type guard for failed auth results.
 * Always use this instead of `'response' in auth`.
 * @example
 * const auth = await requireRequestUser(req)
 * if (isAuthFailure(auth)) return auth.response
 * const { user } = auth
 */
export function isAuthFailure(
  result: { user: User } | { response: NextResponse }
): result is { response: NextResponse } {
  return 'response' in result
}
```

---

### 3.4 Extract Repeated Prisma Include Shapes

**Problem:** Large `include` objects for tools and users are copy-pasted across multiple handlers. When the schema changes, only some are updated.

**Fix:** Extract to named constants at the top of the route file or in a shared `app/lib/prisma-includes.ts`:

```typescript
// app/lib/prisma-includes.ts
export const TOOL_CARD_INCLUDE = {
  creator: { select: { id: true, name: true, email: true } },
  _count: { select: { sessions: true, upvotes: true, favorites: true } },
  ratings: { select: { score: true } },
} as const

export const TOOL_FULL_INCLUDE = {
  ...TOOL_CARD_INCLUDE,
  documents: true,
  customMetrics: true,
  courseMaterialEmbeds: { include: { courseMaterial: { include: { course: true } } } },
} as const
```

---

## Environment Variables — Required vs Optional

After these changes, update your `.env.example` to clearly mark which variables are required:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | **Yes** | Neon connection string |
| `ANTHROPIC_API_KEY` | **Yes** | AI features disabled without it |
| `CRON_SECRET` | **Yes** | All cron endpoints fail closed without it |
| `STORAGE_JWT_SECRET` | **Yes** | Playground storage throws without it |
| `RESEND_API_KEY` | No | Emails fall back to `console.log` |
| `OPENAI_API_KEY` | No | Audio Mode disabled if missing |
| `UPSTASH_REDIS_REST_URL` | No | Rate limiting falls back to no-op in dev |
| `UPSTASH_REDIS_REST_TOKEN` | No | Required if URL is set |

---

## Implementation Order

```
Week 1
  ├── Phase 1.1  Harden cron secret check           (~15 min)
  ├── Phase 1.2  Remove JWT dev fallback             (~5 min)
  ├── Phase 1.3  Safe request body parsing           (~30 min)
  └── Phase 2.1  Install Zod                        (~5 min)

Week 2
  ├── Phase 2.2  Create app/lib/validate.ts          (~30 min)
  ├── Phase 2.3  Create app/lib/schemas.ts           (~1 hr)
  └── Phase 2.4  Apply schemas to top 4 routes      (~2 hrs)

Week 3
  ├── Phase 2.4  Apply schemas to remaining routes  (~2 hrs)
  ├── Phase 3.1  Upstash rate limiting              (~45 min)
  ├── Phase 3.2  Promise.allSettled in admin        (~30 min)
  ├── Phase 3.3  Standardize auth pattern           (~30 min)
  └── Phase 3.4  Extract Prisma include constants   (~1 hr)
```

---

## What This Does NOT Change

- The demo auth model (`x-demo-user-email` header) — this is intentional for the demo
- The Prisma v7 / Neon / PrismaPg setup — already correct
- The streaming AI response pattern — already well-structured
- The audit logging system — already production-ready
- Any UI or product behavior — all changes are server-side only
