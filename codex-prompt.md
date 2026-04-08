# Codex Task — The Sandbox MVP Hardening
**Repo:** `the-sandbox/` (Next.js 16 App Router, TypeScript, Tailwind CSS v4, Prisma v7, PostgreSQL)

---

## Context

The Sandbox is an AI-powered educational tool marketplace for the University of Kentucky. Before reviewing the code, read `the-sandbox/CLAUDE.md` in full — it is the authoritative source of truth for architecture, file structure, data models, and patterns. Do not deviate from the patterns described there.

**Critical constraints:**
- Prisma client is always imported from `app/lib/prisma.ts` — never instantiate `PrismaClient` directly
- Auth is mock: the `x-demo-user-email` request header identifies the current user; look them up with `prisma.user.findUnique({ where: { email } })`
- No new npm packages unless absolutely required
- No new Prisma migrations unless a task explicitly requires a new DB column
- Do not refactor, restructure, or rename any existing files

---

## Task 1 — Rate Limiting on `/api/chat`

**File:** `the-sandbox/app/api/chat/route.ts`

**Problem:** The platform uses one shared `ANTHROPIC_API_KEY`. There is currently zero rate limiting. A single student can exhaust the institutional API quota.

**Implementation:** Add an in-memory sliding-window rate limiter at the very top of the `POST` handler, before any Prisma queries or Anthropic calls.

**Exact spec:**
- Use a module-scope `Map<string, { count: number; windowStart: number }>` named `rateLimitMap`
- Key: the `x-demo-user-email` header value; fall back to `req.headers.get('x-forwarded-for') ?? 'unknown'` if the header is absent
- Window: 60 seconds, limit: 20 requests per key per window
- On each request: if the key's `windowStart` is more than 60 000 ms ago, reset `count` to 0 and `windowStart` to `Date.now()`; then increment `count`; if `count > 20`, return:
  ```ts
  return NextResponse.json(
    { error: 'Rate limit exceeded. Please wait a moment before sending another message.' },
    { status: 429 }
  )
  ```
- After the rate limit check (and only when a request is not rejected), delete any entries from `rateLimitMap` where `Date.now() - windowStart > 60_000` to prevent unbounded memory growth

**Do not** add a separate file, a class, or a helper module for this — keep it inline in `route.ts`.

---

## Task 2 — Service Bot Audit Section in Admin Panel

**Files to read first:** `the-sandbox/app/admin/page.tsx`, and whatever API route it uses to fetch data

**What to build:** Add an "Active Service Bots" section to the admin panel at `/admin`. This gives admins an audit trail of who created each official bot and when.

**Data:** Query `prisma.tool.findMany({ where: { isOfficialService: true }, include: { creator: true }, orderBy: { createdAt: 'desc' } })`. Add this to the existing data-fetch logic in the admin page (server component or API route — match whatever pattern is already in use).

**UI spec:**
- Place the new section below the existing approval queue, separated by a full-width horizontal divider (`<hr className="my-12 border-gray-200" />`) and significant top margin (`mt-12`) so the section is visually distinct and not lost if the approval queue is long
- Section heading: "Active Service Bots" with a `ShieldCheck` icon (from `lucide-react`) in UK blue (`#0033A0`)
- If no service bots exist, show: `<p className="text-sm text-gray-400">No service bots have been added yet.</p>`
- For each bot, show a single row/card with:
  - Bot name (linked to `/tools/[id]`)
  - Protocol badge: map the raw `protocol` enum value to a user-friendly label using a small gray pill (`text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5`). Use this exact mapping — never display raw enum values:
    - `informational` → **"Informational"**
    - `regulatory` → **"Regulatory"**
    - `transactional` → **"Workflow"**
  - Created by: `creator.name` + `creator.email` in gray (label text: "Created by")
  - Date Added: formatted with `date-fns` `format(new Date(tool.createdAt), 'MMM d, yyyy')` (label text: "Date Added")
- Match the visual style (card shape, border, padding) of the existing sections on the admin page

**Do not** create a new API route if the admin page already fetches data server-side — extend the existing pattern.

---

## Task 3 — Transactional Protocol Safety Constraint

**File:** `the-sandbox/app/lib/service-bot-prompt.ts`

**Problem:** The "Transactional" protocol option implies the bot can take real actions (submit forms, process requests). It cannot — it is a read-only chatbot. Without a clear constraint in the system prompt, the bot may confuse or mislead students.

**What to add:** In `buildServiceBotSystemPrompt()` (or equivalent function), when `protocol === 'transactional'`, append the following two things:

1. To the **constraints block** of the system prompt (the section that tells the bot what it must not do), add:
   > You can guide students through processes step by step, but you cannot take any action on their behalf. You cannot access student accounts, submit applications, process requests, or modify any university records. Always conclude process guidance by directing the student to complete the final step themselves via the official website, in person, or by phone.

2. To the **welcome message guidance** in the prompt (the instruction telling the bot how to open the conversation), add a directive that the bot should briefly clarify its role on first contact, e.g.:
   > On your first response, briefly note that you can guide students through processes and answer questions, but cannot submit forms or take actions on their behalf.

3. To the **tone guidance** block of the system prompt (or append it if no such block exists), add:
   > Use simple, direct language. Avoid technical jargon or referring to underlying software concepts.

Read the existing `buildServiceBotSystemPrompt` function fully before making changes so you place these additions in the correct locations without disrupting the informational or regulatory protocol paths.

---

## Verification checklist (run before finishing)

- [ ] `the-sandbox` TypeScript build passes: `cd the-sandbox && npx tsc --noEmit`
- [ ] No new files created outside the three files listed above
- [ ] No existing API routes, pages, or components were modified except `app/api/chat/route.ts`, `app/admin/page.tsx` (and its co-located API route if applicable), and `app/lib/service-bot-prompt.ts`
- [ ] `rateLimitMap` is declared at module scope in `chat/route.ts`, not inside the handler
- [ ] The admin service bot section only appears when the user is an ADMIN (the admin page already enforces this — do not add new role checks, just don't break the existing ones)
