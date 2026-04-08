# Code Quality Review — Architectural Refinement Plan
> **Status:** ✅ Complete
> **Scope:** The Sandbox codebase (`app/api/`, `app/lib/`, `app/components/`)
> **Goal:** Identify and fix correctness bugs, security vulnerabilities, performance issues, and over-engineering across every function in the codebase.
> **Last updated:** 2026-03-19

---

## How to Execute This Plan

**Execution rule:** Work through tasks in order. After each task:
1. Run `npm run build` — fix any TypeScript or build errors before proceeding.
2. Run `npx next lint` — fix any lint errors before proceeding.
3. Mark the task complete in this document.

**Review checkpoint rule:** Stop and ask the user for review **after every 2 tasks complete**. Do not proceed to the next pair until the user approves.

**Handoff rule:** After any task that touches more than 3 files OR removes/rewrites a function, output a **Context Handoff Prompt** (see template at the bottom of this document). This lets a new Claude session pick up exactly where you left off.

**Never skip a build check.** If `npm run build` fails after a change, fix it before marking the task done. Do not proceed to the next task with a broken build.

---

## Phase 1 — Security & Auth Hardening (Tasks 1–4)

All API routes in this codebase use `x-demo-user-email` as the sole auth mechanism. This section ensures every route validates it correctly and consistently, and that no route exposes data it shouldn't.

### Task 1 — Auth header audit across all API routes

**Goal:** Find every `route.ts` file that reads `x-demo-user-email` from headers and verify it:
- Returns 401 (not 400, not 500) if the header is missing or empty
- Looks up the user in the DB and returns 401 if the user is not found (not just trusts the email string)
- Returns 403 if the authenticated user's role is insufficient for the action

**Files to audit:**
- All 168 `app/api/**/route.ts` files
- Pay special attention to: `/api/admin/**`, `/api/analytics/**`, `/api/gradebook/**`, `/api/registrar/**`, `/api/playground/**`

**What to fix:**
- Routes that skip the DB lookup and trust the email string directly
- Routes that return wrong status codes on auth failure
- Routes that expose other users' data without checking the requesting user's role

**Output:** A list of every violation found, with file path + line number, then apply fixes.

---

### Task 2 — Input validation on mutation routes (POST/PUT/DELETE)

**Goal:** Every mutation route must validate its request body before touching the database. Find all routes that either have no validation or do a bare `JSON.parse` / direct destructuring with no type check.

**Files to audit:** All `route.ts` files that export `POST`, `PUT`, `PATCH`, or `DELETE` handlers.

**What to fix:**
- Missing null/undefined checks on required fields
- Missing type coercion (e.g., treating a string as a number)
- Routes that pass raw user input directly into Prisma `create` or `update` calls without whitelisting fields (mass assignment)
- Any route that constructs a raw SQL string with user input

**Output:** Fix each violation. Add inline validation (no external library needed — plain TypeScript guards are fine).

---

*→ REVIEW CHECKPOINT: Stop here. Ask user to review Tasks 1–2 before continuing.*

---

### Task 3 — CRON route secret validation

**Goal:** The cron routes (`/api/brackets/digest`, `/api/book-recommender/digest`) must check `CRON_SECRET` before executing. Verify this is correctly implemented on every cron-triggered route.

**Files to audit:**
- `app/api/brackets/digest/route.ts`
- `app/api/book-recommender/digest/route.ts`
- Any other route referenced in `vercel.json` cron config

**What to fix:**
- Missing or incorrect secret check (should compare `Authorization: Bearer <secret>` header)
- Secret compared with `==` instead of a timing-safe comparison (use `crypto.timingSafeEqual`)
- Routes that fail open (execute the job) if `CRON_SECRET` env var is not set

---

### Task 4 — Playground JWT validation hardening

**Goal:** The Playground storage API uses `STORAGE_JWT_SECRET` to sign tokens. Audit the full token issuance and verification flow.

**Files to audit:**
- `app/lib/playground-storage.ts`
- `app/api/playground/store/**/route.ts`
- Any route that issues or verifies Playground tokens

**What to fix:**
- `jwt.verify()` called without algorithm pinning (should pass `{ algorithms: ['HS256'] }`)
- Token expiry not checked or set too long
- `STORAGE_JWT_SECRET` not validated on startup (the 503 behavior documented in CLAUDE.md — confirm it's actually implemented)
- Token payload fields used without type narrowing after verification

---

*→ REVIEW CHECKPOINT: Stop here. Ask user to review Tasks 3–4 before continuing.*

---

## Phase 2 — Database & Prisma Correctness (Tasks 5–8)

### Task 5 — N+1 query audit in API routes

**Goal:** Find every route that runs a Prisma query inside a loop (for-of, forEach, map, etc.) and replace with a batched query using `where: { id: { in: [...] } }` or `include`/`select`.

**Files to audit:** All `route.ts` files that use `prisma.*` inside any iteration construct.

**What to fix:**
- `for (const x of items) { await prisma.something.findUnique(...) }` → replace with a single `findMany` + Map lookup
- `Promise.all(items.map(x => prisma...))` — acceptable for small batches but flag if the array can be unbounded

---

### Task 6 — Missing error handling on Prisma calls

**Goal:** Every `await prisma.*` call in a route handler should be wrapped in try/catch. Unhandled Prisma errors currently produce 500s with raw stack traces that leak schema info.

**Files to audit:** All `route.ts` files and `app/lib/*.ts` files that call Prisma.

**What to fix:**
- Bare `await prisma.*` calls with no surrounding try/catch
- Catch blocks that re-throw without sanitizing the error message
- `prisma.X.findUniqueOrThrow` / `findFirstOrThrow` — verify the thrown error is caught

---

*→ REVIEW CHECKPOINT: Stop here. Ask user to review Tasks 5–6 before continuing.*

---

### Task 7 — Prisma client instantiation audit

**Goal:** Confirm every file that creates a Prisma client uses the PrismaPg adapter pattern. Any file using `new PrismaClient()` without the adapter will fail in production on Neon.

**Files to audit:** `app/lib/prisma.ts` and any file that imports or instantiates `PrismaClient` directly.

**Pattern to enforce:**
```typescript
import { PrismaPg } from '@prisma/adapter-pg'
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })
```

**What to fix:**
- Any `new PrismaClient()` without adapter
- Files that create their own Prisma instance instead of importing the shared singleton from `app/lib/prisma.ts`

---

### Task 8 — Gamification schema migration (pending from sprint)

**Goal:** Execute the pending Task 8 from the Gamification Removal Sprint.

**Steps:**
1. Run `npx prisma migrate dev --name remove-gamification-system`
2. Run `npx prisma generate`
3. Run `npm run build`
4. Fix any TypeScript errors surfaced by the schema change
5. Update `BLUEPRINT-STATUS.md` sprint entry to reflect migration complete

**Note:** This was deferred from the 2026-03-19 gamification removal sprint. The schema models (XPEvent, UserBadge, Quest, etc.) are already removed from `schema.prisma` — this task just runs the migration.

---

*→ REVIEW CHECKPOINT: Stop here. Ask user to review Tasks 7–8 before continuing.*

---

## Phase 3 — Performance & Over-Engineering (Tasks 9–12)

### Task 9 — Unused imports and dead code removal in `app/lib/`

**Goal:** After the gamification removal sprint, several lib files may still import deleted modules or contain dead branches. Find and remove them.

**Files to audit:** All `app/lib/*.ts` files.

**What to look for:**
- Imports from deleted files (`app/lib/xp.ts`, `app/lib/sand.ts`, etc.)
- Functions that are exported but never imported anywhere
- `if (false)` or constant-condition branches
- Re-exports of types that no longer exist

**Tool to use:** Run `npx tsc --noEmit` first to surface dead import errors, then trace each one.

---

### Task 10 — AI route streaming correctness

**Goal:** Routes that stream Claude responses to the client must correctly handle errors mid-stream and close the stream properly. Find any that silently drop errors.

**Files to audit:**
- `app/api/concierge/route.ts`
- `app/api/builder/route.ts`
- `app/api/build-tool/route.ts`
- `app/api/build-gamification/route.ts`
- Any other route that uses `new ReadableStream` or Anthropic `stream()`

**What to fix:**
- Missing `controller.error()` call when the Anthropic API throws
- `finally` block missing — stream not closed on error
- Anthropic API key not checked before making the call (should return 503 early if `ANTHROPIC_API_KEY` is missing)
- Model IDs hardcoded as strings instead of using a constants file (flag for future, don't refactor unless trivial)

---

*→ REVIEW CHECKPOINT: Stop here. Ask user to review Tasks 9–10 before continuing.*

---

### Task 11 — Dashboard route: replace `EDUCATOR_PROFILES` with real data

**Goal:** `app/page.tsx` (and the admin home) still uses a hardcoded `EDUCATOR_PROFILES` object instead of calling `/api/dashboard`. Wire up the real route.

**Context:** `/api/dashboard/route.ts` already exists and returns real data. The page just hasn't been updated to call it (per `BLUEPRINT-STATUS.md` divergence note).

**Files to change:**
- `app/page.tsx` — replace hardcoded data with `fetch('/api/dashboard')` call
- Verify `/api/dashboard/route.ts` returns all fields the page consumes
- Add loading state to the page if not present

---

### Task 12 — Collab bus: replace polling with Redis pub/sub

**Goal:** `app/lib/collab-bus.ts` currently uses polling. Wire it to `app/lib/redis.ts` for real pub/sub using Upstash.

**Context:** Per `BLUEPRINT-STATUS.md`, `redis.ts` + `rate-limit.ts` are implemented but collab pub/sub is not wired. This is the remaining work from `platform-hardening-architecture.md`.

**Files to change:**
- `app/lib/collab-bus.ts`
- `app/lib/collab.ts`
- Any SSE route that feeds collab updates to the client

**Guard:** Only wire this if `UPSTASH_REDIS_REST_URL` is set. Fall back to existing polling if env var is absent (keeps local dev working).

---

*→ REVIEW CHECKPOINT: Stop here. Ask user to review Tasks 11–12 before continuing.*

---

## Phase 4 — Function-Level Code Review (Tasks 13–16)

These tasks are the deep function-by-function review. Execute them as a reading + annotation pass first, then apply fixes.

### Task 13 — Deep review: `app/lib/` utility functions

For every function in every file under `app/lib/`, evaluate:

| Check | What to look for |
|---|---|
| **Correctness** | Off-by-one, null/undefined not handled, async without await |
| **Performance** | Redundant DB calls, unbounded loops, large object copies |
| **Security** | User input passed to shell, path traversal in file ops, secret logged |
| **Simplicity** | Functions longer than 60 lines that do 2+ unrelated things |
| **TypeScript** | `any` types, missing return types, non-null assertions on values that could be null |

Output format per issue:
```
[file:line] functionName — CATEGORY — one-sentence description
Fix: <corrected snippet>
```

---

### Task 14 — Deep review: `app/api/analytics/**` and `app/api/admin/**`

Same evaluation criteria as Task 13, focused on:
- Analytics routes returning data for the wrong user (privacy leak)
- Admin routes accessible by non-admin roles
- Aggregate queries that could be slow without indexes
- Synthetic/hardcoded data mixed with real DB results

---

*→ REVIEW CHECKPOINT: Stop here. Ask user to review Tasks 13–14 before continuing.*

---

### Task 15 — Deep review: `app/api/registrar/**` and `app/api/gradebook/**`

These routes handle sensitive academic data. Evaluate with extra scrutiny:
- Every mutation must verify the requesting user has the REGISTRAR or ADMIN role
- No student can read another student's records
- Degree audit and articulation functions must handle missing data gracefully (student not enrolled, no transcript, etc.)
- Grading service must not allow a student to submit grades for another student

---

### Task 16 — Deep review: `app/api/playground/**` and `app/api/avatar/**`

Playground and Avatar are the most complex surfaces. Evaluate:
- JWT token flow (issuance → storage → verification) — no token reuse across users
- Avatar PDF extraction — no path traversal, file size limits enforced
- Playground export (jszip) — no zip-slip vulnerability
- Monaco editor content saved to DB — sanitized before storage? (XSS risk if rendered as HTML anywhere)

---

*→ REVIEW CHECKPOINT: Stop here. Ask user to review Tasks 15–16 before continuing.*

---

## Completion Checklist

- [x] Task 1 — Auth header audit
- [x] Task 2 — Input validation on mutations
- [x] Task 3 — CRON secret validation
- [x] Task 4 — Playground JWT hardening
- [x] Task 5 — N+1 query audit
- [x] Task 6 — Missing Prisma error handling
- [x] Task 7 — Prisma client instantiation audit
- [x] Task 8 — Gamification schema migration
- [x] Task 9 — Dead code removal in lib/
- [x] Task 10 — AI route streaming correctness
- [x] Task 11 — Dashboard: replace EDUCATOR_PROFILES
- [x] Task 12 — Collab bus Redis wiring
- [x] Task 13 — Deep review: lib/ functions
- [x] Task 14 — Deep review: analytics + admin routes
- [x] Task 15 — Deep review: registrar + gradebook routes
- [x] Task 16 — Deep review: playground + avatar routes

---

## Context Handoff Template

After any task that touches more than 3 files or rewrites a function, output this prompt so a new Claude session can resume:

---

```
You are continuing a code quality review of The Sandbox — an AI-powered educational tool marketplace for the University of Kentucky. The codebase is at `c:\AA Code\Educator marketplace\the-sandbox\`.

**Before doing anything else:**
1. Read `c:\AA Code\Educator marketplace\the-sandbox\CLAUDE.md` — the living architecture doc.
2. Read `c:\AA Code\Educator marketplace\Blueprints\code-quality-review-architecture.md` — the task plan you are executing. The completion checklist shows which tasks are done.
3. Read `c:\AA Code\Educator marketplace\Blueprints\BLUEPRINT-STATUS.md` — active feature status.

**Where we left off:**
[FILL IN: "Tasks 1–N are complete and checked off. The last build passed. Resuming at Task N+1."]

**What was changed in the last session:**
[FILL IN: bullet list of files modified and what was done]

**Known issues to carry forward:**
[FILL IN: any issues found but not yet fixed, or deferred decisions]

**Execution rules (do not skip these):**
- After each task: run `npm run build` and `npx next lint`. Fix all errors before marking done.
- Stop and ask for user review after every 2 tasks.
- After any task touching more than 3 files, output this handoff prompt again with updated fields.
- Never proceed to the next task with a broken build.
- Work directory: `c:\AA Code\Educator marketplace\the-sandbox\`
- Auth pattern: all API routes use `x-demo-user-email` header (no session cookies).
- Prisma pattern: always use PrismaPg adapter — see CLAUDE.md Critical Prisma v7 Notes.
```

---

## How to Invoke This Plan

To start a fresh Claude Code session on this plan, use this prompt:

```
Instruction: Read `c:\AA Code\Educator marketplace\Blueprints\code-quality-review-architecture.md`.

This is an architectural review plan for The Sandbox codebase. Execute Task 1. Once completed, run `npm run build` and `npx next lint` to ensure no regressions. If both pass, move to Task 2 and run the same checks. Stop and ask for my review after every 2 tasks complete. After any task that modifies more than 3 files, output the Context Handoff Prompt from the bottom of the plan document so this work can be resumed in a new session.

Start by reading CLAUDE.md first, then begin Task 1.
```
