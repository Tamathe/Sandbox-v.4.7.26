# The Sandbox — Codex Implementation Blueprint
### Sprint: MVP Hardening + ELI5 Button
### Date: 2026-03-15

---

## READ THIS FIRST — What Is Already Built

Do **not** rebuild or restructure these features. They are complete and working:

- **Avatar Builder** (`/avatar`) — 3-step wizard, document upload, teaching style selection, system prompt generation, creates a `CHATBOT` tool as draft
- **Service Bot Builder** (`/service-bot`) — 3-step wizard, policy doc upload, protocol types, PII certification checkbox, auto-publishes with `isOfficialService: true`
- **Sandcastle** — 17 experiences defined in `app/lib/sandcastle.ts` (12 live, 5 coming-soon). Do not add more.
- **Header demo-user switcher** — already in `app/components/Header.tsx`
- **All 18 routes** — compile cleanly. Do not restructure the file tree.

The schema already has: `isOfficialService`, `serviceProtocol`, `escalationEmail`, `personaName`, `approvalStatus`. Do not add new migrations unless a task below explicitly requires one.

---

## Tech Stack Constraints (Non-Negotiable)

- **Next.js 16 App Router** — all new pages use `app/` directory, `'use client'` only where needed
- **Prisma v7.4.2** — NEVER write `prisma.user.findMany()` directly in a route; always import the singleton from `app/lib/prisma.ts` which uses the `PrismaPg` adapter
- **No `url` in `prisma/schema.prisma`** — connection string lives in `prisma.config.ts`
- **Auth via header** — `x-demo-user-email` header on all API calls; look up user with `prisma.user.findUnique({ where: { email } })`
- **Tailwind CSS v4** — use `className` strings, UK blue is `#0033A0`
- **lucide-react** for all icons — do not add a new icon library
- **Streaming chat** uses `ReadableStream` / `TextEncoder` in `/api/chat/route.ts` — preserve this pattern

---

## Task 1 — ELI5 "Explain Simpler" Button in ChatInterface

**File:** `app/components/ChatInterface.tsx`

**What to build:** A `Lightbulb` icon button that appears beneath the last assistant message only when:
- The last message in the conversation is from the assistant (`role === 'assistant'`)
- The chat is not currently loading/streaming

**Behavior on click:**
1. Append a new user message to the chat history: `"Can you explain that more simply? Use plain language and a concrete example."`
2. Submit this message through the existing streaming flow — no new API route
3. The button disappears while the response streams (loading state) and reappears on the new last assistant message

**Implementation notes:**
- Identify where the message list is rendered in `ChatInterface.tsx` and add the button inline after the last assistant bubble
- The button should be visually subtle: small, gray text, `text-xs`, with a `Lightbulb` icon from lucide-react
- Label: `"Explain simpler"` — no emoji
- The button must NOT appear on user messages, on any non-last assistant message, or while streaming

**Acceptance criteria:**
- [ ] Button appears only on the final assistant message
- [ ] Button disappears during streaming
- [ ] Clicking it injects the fixed prompt and triggers a new streaming response
- [ ] No new API routes, no new state management files

---

## Task 2 — Rate Limiting on `/api/chat`

**File:** `app/api/chat/route.ts`

**Problem:** The platform uses a single shared `ANTHROPIC_API_KEY`. Without rate limiting, one student (or a bad actor) can exhaust the API quota for all users.

**What to build:** In-memory sliding window rate limiter. This is a demo/MVP deployment; a Redis-backed solution is out of scope.

**Spec:**
- Rate limit by the value of the `x-demo-user-email` header (fall back to request IP if header absent)
- Limit: **20 requests per user per 60-second window**
- If limit exceeded, return `429 Too Many Requests` with JSON: `{ "error": "Rate limit exceeded. Please wait a moment before sending another message." }`
- The in-memory store should use a `Map<string, { count: number; windowStart: number }>` at module scope (acceptable for a single-instance deployment)
- Evict stale entries (older than 60s) on each request to prevent memory leaks

**Implementation notes:**
- Place the rate limit check at the very top of the `POST` handler, before any Prisma queries or Anthropic API calls
- The rate limiter logic should be a self-contained helper (a few lines inline or a small function at top of file) — do not create a new file for this
- Do not rate limit based on tool ID or session — user-level is sufficient

**Acceptance criteria:**
- [ ] 21st request from the same user within 60s returns 429
- [ ] After 60s the window resets and requests succeed again
- [ ] The error message is shown gracefully in the chat UI (ChatInterface already handles non-200 responses — verify it displays the error message from the JSON body)

---

## Task 3 — Verify Service Bot API Fields Persist

**Files to audit (read-only first, then fix if broken):**
- `app/api/tools/route.ts` (POST handler)

**Problem to verify:** The Service Bot page (`/service-bot/page.tsx`) sends these fields in its POST payload:
```json
{
  "isOfficialService": true,
  "serviceProtocol": "informational",
  "escalationEmail": "finaid@uky.edu",
  "personaName": "Financial Aid Office",
  "approvalStatus": "APPROVED"  (implied by isOfficialService)
}
```

Verify the `POST /api/tools` route:
1. Reads and persists `isOfficialService` (Boolean)
2. Reads and persists `serviceProtocol` (String)
3. Reads and persists `escalationEmail` (String | null)
4. Reads and persists `personaName` (String | null)
5. When `isOfficialService === true`, sets `approvalStatus: 'APPROVED'` automatically (admin bypass)
6. **Guards**: only a user with `role === 'ADMIN'` can set `isOfficialService: true` — if a non-admin sends this field, ignore it silently (do not 403, just strip the flag)

**Fix whatever is missing.** If all 6 points are already correct, leave the file untouched and document your finding as a comment in this blueprint.

**Acceptance criteria:**
- [ ] Service bot created via the wizard has `isOfficialService = true` in DB
- [ ] `approvalStatus` is `APPROVED` for service bots
- [ ] Non-admin cannot elevate a tool to `isOfficialService` via API

---

## Task 4 — Service Bot Audit Log in Admin Panel

**Files:** `app/admin/page.tsx`, `app/api/admin/route.ts` (or adjacent admin API route)

**What to build:** Add a "Service Bots" section to the Admin panel (`/admin`) that lists all tools where `isOfficialService === true`.

**Display per bot:**
- Tool name
- Department (from `shortDescription` or creator name)
- Protocol type (`serviceProtocol`)
- Created date (formatted with `date-fns` `format(date, 'MMM d, yyyy')`)
- Creator email (the admin who deployed it)
- A link to the tool detail page

**Data source:** Add a query to the existing admin API endpoint (or use a new fetch in the admin page if it's a client component) — `prisma.tool.findMany({ where: { isOfficialService: true }, include: { creator: true }, orderBy: { createdAt: 'desc' } })`

**UI:** Add this as a new card/section below the existing approval queue in `app/admin/page.tsx`. Use the same card styling already present on that page. Show a `ShieldCheck` icon (already imported in the service-bot page) next to the section title.

**Acceptance criteria:**
- [ ] Admin panel shows all deployed service bots
- [ ] Each row shows name, protocol, created date, deploying admin's email
- [ ] Link to `/tools/[id]` works

---

## Task 5 — Transactional Protocol Disclaimer in Welcome Message

**File:** `app/lib/service-bot-prompt.ts`

**Problem:** The "Transactional" protocol label implies the bot can take actions (submit forms, process requests). It cannot — it's a chatbot. Students may be confused or frustrated.

**Fix:** In `buildServiceBotSystemPrompt()`, when `protocol === 'transactional'`, append this sentence to the generated welcome message instruction (the part of the prompt that specifies the welcome):

> "Important: Always clarify at the start that you can guide students through processes and answer questions, but cannot submit forms, access their account, or take actions on their behalf. Direct them to the office website or phone number for actual transactions."

Also add a constraint line to the system prompt body for transactional bots:
> "You guide students through processes step by step but you cannot take any action on their behalf. You cannot access student accounts, submit applications, or process requests. Always end transactional guidance by directing the student to complete the final step themselves via the official website or in person."

**Acceptance criteria:**
- [ ] Transactional service bots include the cannot-act constraint in their system prompt
- [ ] Informational and regulatory bots are unaffected

---

## What NOT to Do

- Do not add new npm packages without strong justification
- Do not create a Redis integration — in-memory rate limiting is sufficient for demo
- Do not restructure the file tree or rename existing routes
- Do not add a new Prisma migration unless a task explicitly requires a new field (none above do)
- Do not add more Sandcastle experiences
- Do not rebuild or significantly refactor Avatar or Service Bot pages — they work
- Do not add RAG/embeddings — that is explicitly a Phase 2 item (see CLAUDE.md)
- Do not add error boundary components (React `ErrorBoundary`) in this sprint — that is also Phase 2
- Do not change the mock auth system — Shibboleth SSO is a production concern

---

## Architecture Notes for Reference

**Prisma client import pattern (always use this):**
```typescript
import { prisma } from '@/app/lib/prisma'
// prisma is a singleton PrismaClient with PrismaPg adapter
```

**Auth pattern in API routes:**
```typescript
const userEmail = request.headers.get('x-demo-user-email')
if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
const user = await prisma.user.findUnique({ where: { email: userEmail } })
if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 })
```

**Streaming response pattern (preserve in chat route):**
```typescript
const stream = new ReadableStream({ ... })
return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
```

**Tool approval status values:** `COMMUNITY | PENDING | APPROVED | REJECTED`
- Normal tools published by educators: `COMMUNITY`
- Tools submitted for official review: `PENDING`
- Admin-approved: `APPROVED`
- Service bots (isOfficialService): always `APPROVED`
