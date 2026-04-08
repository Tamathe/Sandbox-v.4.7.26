# The Sandbox — Next Sprint Plan
**Last updated:** 2026-03-19
**Status:** Sprint 1 partially complete — 1.1, 1.3, 1.4 already built; 1.2 is next. Sprint 2 partially complete — 2.3 already built.

---

## Sprint 1 — Quick Wins (< 1 day each)

### ✅ 1.1 ELI5 "Explain Simpler" Button — DONE
**File:** `app/components/ChatInterface.tsx`
**Effort:** ~30 min
**Value:** Immediately visible to every student on every tool

**What to build:**
- A `Lightbulb` (lucide) button rendered beneath the **last assistant message only**, hidden on all earlier messages
- Visible only when `messages.length > 0` and `!isLoading`
- On click, calls the existing `sendMessage` function with the fixed string:
  `"Can you explain that more simply? Use plain language and a concrete example."`
- No new API route — reuses the existing `/api/chat` stream
- Button styling: small, muted (e.g. `text-gray-400 hover:text-[#0033A0]`), with a tooltip "Explain simpler"
- Do NOT add to `BuilderChatPanel` — only `ChatInterface.tsx` (tool use context)

---

### 1.2 Real `/api/dashboard` Endpoint
**Files:** `app/api/dashboard/route.ts`, `app/page.tsx`
**Effort:** ~2 hours
**Value:** Replaces hardcoded `EDUCATOR_PROFILES` synthetic data; prerequisite for several other features

**What to build:**
- `GET /api/dashboard` returns real aggregates for the calling user:
  - **EDUCATOR:** `{ totalTools, publishedTools, draftTools, totalSessions, activeStudents, avgScore, recentActivity[] }`
    - `totalSessions` = count of `ToolSession` records across all their tools
    - `activeStudents` = count of distinct `userId` across those sessions in last 30 days
    - `avgScore` = mean of `MetricEvent` values where `eventType = 'score'` across their tools
    - `recentActivity` = last 10 `ToolSession` rows joined with tool name + student name
  - **STUDENT:** `{ streak, totalSessions, totalTime, avgScore, sandBalance, recentSessions[], upcomingAssignments[] }`
  - **ADMIN:** all educator aggregates + platform-wide totals (delegate to `/api/analytics/platform`)
- Replace the `EDUCATOR_PROFILES` hardcoded object in `app/page.tsx` with a `fetch('/api/dashboard')` call in the existing `useEffect`
- Keep the "Simulated data watermark" amber banner until this is wired end-to-end; remove it once real data is confirmed
- Mark synthetic fields clearly with a TODO comment if any can't yet be real

---

### ✅ 1.3 Gradebook — Undo Released Grade — DONE
**Files:** `app/api/gradebook/[entryId]/route.ts`, `app/components/GradingPanel.tsx`
**Effort:** ~1 hour

**What to build:**
- `PATCH /api/gradebook/[entryId]` already handles status changes; add validation to allow `RELEASED → APPROVED` transition (faculty only, own course)
- In `GradingPanel.tsx`, add an "Undo Release" button (amber, small) visible only when `entry.status === 'RELEASED'`
- On click: confirm dialog ("Return this grade to draft? The student will lose visibility.") → PATCH → refresh entry
- Write an audit note in `facultyFeedback` field: `"[Grade recalled by faculty on {date}]"` prepended

---

### ✅ 1.4 Gradebook — Bulk Release All AI Scores — DONE
**Files:** `app/api/courses/[courseId]/gradebook/bulk-release/route.ts`, `app/components/GradebookTab.tsx`
**Effort:** ~2 hours

**What to build:**
- New route `POST /api/courses/[courseId]/gradebook/bulk-release`
  - Body: `{ assignmentId?: string }` (optional — scope to one assignment or all)
  - Finds all `PENDING_REVIEW` + `AI_DRAFT` entries for the course (or assignment)
  - Sets `status = 'RELEASED'`, copies `aiScore → facultyScore`, `aiRawFeedback → facultyFeedback`
  - Returns `{ released: number }`
- In `GradebookTab.tsx`, add a "Release All AI Scores" button in the "To Grade" tab header
  - Only shown when `pendingCount > 0`
  - Confirmation modal: "Release AI scores for all {N} pending submissions? You can undo individual grades afterward."
  - Shows a spinner + success toast

---

## Sprint 2 — Provost Experience Tier 3

### 2.1 `/api/analytics/platform` + Institution Tab
**Files:** `app/api/analytics/platform/route.ts` (exists, may need data), `app/analytics/faculty/page.tsx`
**Effort:** ~3 hours

**What to build (API):**
- `GET /api/analytics/platform` — ADMIN only
- Returns:
  ```ts
  {
    totalUsers: number           // all active users
    totalTools: number           // all published tools
    totalSessions: number        // all ToolSession rows
    sessionsLast30Days: number
    avgSessionScore: number
    adoptionByDepartment: { department: string; users: number; sessions: number }[]
    topTools: { id: string; name: string; sessions: number; avgScore: number }[]
    costEstimate: {              // rough token cost estimate
      totalTokensEstimate: number
      costUsd: number
      costPerSession: number
    }
  }
  ```
- `costEstimate`: derive from `MetricEvent` count as a proxy (each event ≈ 1 turn ≈ ~400 input + ~200 output tokens at Haiku pricing: $1/M in, $5/M out)

**What to build (UI):**
- The Institution tab in `/analytics/faculty` already exists for ADMIN; wire it to real data from this endpoint
- Replace any hardcoded platform stats with the real API response
- Keep the "Simulated data watermark" until the API is confirmed live; then remove just the watermark

---

### 2.2 Admin Home Executive Briefing Layout
**File:** `app/page.tsx` (admin branch)
**Effort:** ~2 hours

**What to build:**
- When `currentUser.role === 'ADMIN'`, replace (or augment) the current admin home with a two-column executive layout:
  - **Left column (2/3):** Platform KPI strip (4 pills: Total Users, Total Sessions, Tools Published, Avg Score) + recent platform activity feed (last 10 sessions across all tools) + Pending Approvals alert (existing logic)
  - **Right column (1/3):** `LeadershipCard` (already built) + quick-link grid to Admin Panel, Analytics, Cost & Economics, Service Bots
- Pull KPIs from the new `/api/analytics/platform` endpoint (Sprint 2.1)
- Keep the "Simulated data watermark" if real data isn't wired yet

---

### ✅ 2.3 Sandcastle / Leagues Institutional Framing — DONE
**Files:** `app/sandcastle/page.tsx`, `app/components/leagues/LeagueShell.tsx`
**Effort:** ~1 hour

**What to build:**
- Sandcastle page already has an engagement/retention callout; verify it's prominent and correct:
  > *"Engagement & Retention Layer — voluntary, not graded. Students who engage with the platform socially return more frequently for academic work."*
- Add the same framing banner to `LeagueShell.tsx` header (any league page) if not already there
- Both banners: amber/blue callout box, dismissible per session (not permanent), positioned above the main content

---

## Sprint 3 — First-Login Onboarding

### 3.1 Onboarding Modal
**Files:** `prisma/schema.prisma`, `app/lib/auth-context.tsx`, `app/components/OnboardingModal.tsx` (new)
**Effort:** ~4 hours

**Schema change:**
```prisma
model User {
  // ... existing fields
  hasCompletedOnboarding Boolean @default(false)
}
```

**What to build:**
- `OnboardingModal.tsx` — 3-slide modal, full-screen overlay, rendered in `app/layout.tsx`
  - **Slide 1 — Welcome:** "You're in The Sandbox. Build AI learning tools. Use them with students. Measure what works." + role-specific copy
  - **Slide 2 — How it works:** Three icons: Describe → Preview → Publish (educator) / Browse → Learn → Track (student)
  - **Slide 3 — Your first step:** CTA button that deep-links to the most relevant page for their role:
    - EDUCATOR → `/build`
    - STUDENT → `/tools`
    - ADMIN → `/admin`
- On "Get Started" click: `PATCH /api/users/me` sets `hasCompletedOnboarding = true`; modal unmounts
- Trigger: `useEffect` in `ClientProviders.tsx` checks `currentUser.hasCompletedOnboarding`; if false, shows modal
- Skip link at bottom of every slide

---

## Sprint 4 — Enrollment-Driven Tool Recommendations

### 4.1 `/api/tools/recommended` Personalization
**Files:** `app/api/tools/recommended/route.ts` (new), `app/tools/page.tsx`, `app/page.tsx`
**Effort:** ~3 hours

**What to build (API):**
- `GET /api/tools/recommended?limit=6`
- For **STUDENT**: return published tools linked (via `CourseToolLink`) to courses the student is enrolled in, ordered by `ToolSession` count desc. If < 6 results, backfill with globally popular tools.
- For **EDUCATOR**: return tools in the same department/college, ordered by sessions desc.
- For **ADMIN**: return recently approved tools.
- Response: `{ tools: ToolWithDetails[], reason: string }` — `reason` is a short label like "From your enrolled courses" or "Popular in your department"

**What to build (UI):**
- On `/tools` marketplace page: add a "Recommended for You" horizontal scroll strip above the main grid (only shown if API returns results)
- On `/` home page (student): replace or augment the "Quick Access" section with recommended tools
- Card design: same `ToolCard` component, but with a small "Recommended" tag in the corner

---

## Sprint 5 — Faculty Avatar / Knowledge Base

### 5.1 RAG Knowledge Base Tool Type
**Effort:** ~2 days
**Architecture doc:** `Blueprints/rag-gradebook-architecture.md`

This is the largest feature gap. Full spec is in the blueprint. Summary of what to build:

**Schema additions:**
```prisma
model KnowledgeBase {
  id          String   @id @default(cuid())
  toolId      String   @unique
  tool        Tool     @relation(...)
  chunkCount  Int      @default(0)
  indexedAt   DateTime?
  createdAt   DateTime @default(now())
}

model KnowledgeChunk {
  id             String   @id @default(cuid())
  knowledgeBaseId String
  knowledgeBase  KnowledgeBase @relation(...)
  content        String
  embedding      Float[]        // pgvector
  sourceFile     String?
  chunkIndex     Int
}
```

**What to build:**
1. **Upload pipeline** — `POST /api/avatar/upload`
   - Accepts `.txt`, `.md`, `.pdf` (max 2MB)
   - Extracts text (existing `pdf-parse` for PDFs)
   - Chunks at ~500 tokens with 50-token overlap
   - Embeds each chunk via Voyage AI (`voyage-2` model, 1024 dims) — or OpenAI `text-embedding-3-small` as fallback
   - Stores in `KnowledgeChunk` with `embedding` column (pgvector)
2. **Retrieval** — `app/lib/rag.ts`
   - `retrieveRelevantChunks(query, knowledgeBaseId, topK=5)`: cosine similarity search via `SELECT ... ORDER BY embedding <=> $1`
   - Returns top-K chunks concatenated as context string (max 4000 chars)
3. **Chat integration** — `/api/chat` detects `tool.toolType === 'KNOWLEDGE_BASE'`, calls `retrieveRelevantChunks`, injects context into system prompt before streaming
4. **Avatar builder page** (`/avatar`) — existing page stub; add:
   - Document upload dropzone (reuse `FilesPanel` pattern)
   - Indexed chunk count + "Re-index" button
   - Live preview chat (same `ChatInterface` component)
5. **Tool creation** — when saving a Knowledge Base tool via `/publish`, automatically create a `KnowledgeBase` record

**Dependencies:**
- pgvector extension on Neon (run `CREATE EXTENSION IF NOT EXISTS vector;` in a migration)
- Voyage AI API key (`VOYAGE_API_KEY` env var) or OpenAI key already in env

---

## Backlog (post-Sprint 5)

| Item | Notes |
|---|---|
| Sandy grading context-awareness | Concierge detects active `GradingPanel` entry and offers grading help |
| Student analytics PDF export | `/analytics/student` page → downloadable report |
| LTI 1.3 Canvas integration | OIDC launch, deep linking, grade passback — requires Canvas dev credentials |
| Real authentication (Shibboleth) | Replace mock auth with UK's IdP — swap `auth-context.tsx` |
| Analytics data pipeline | Real session capture → async AI analysis (Inngest or Vercel cron) |
| Mobile optimization | `/build` panel behavior, `BuilderLayout` at small breakpoints |
| Platform hardening | Upstash Redis for collab pub/sub, rate limit middleware, auth caching |
| Magic signup / profile enrichment | Email → LLM enrichment → SSE streaming profile reveal |

---

## Done Criteria Checklist (cross-sprint)

- [ ] `npm run build` passes with zero TypeScript errors after every sprint
- [ ] No new `any` types introduced
- [ ] All new API routes pass `x-demo-user-email` header auth via `getServerUser()`
- [ ] No Prisma client instantiated outside `app/lib/prisma.ts`
- [ ] All AI calls use Haiku for chat, Sonnet for analysis/concierge
- [ ] UK blue `#0033A0` used consistently for primary interactive elements
- [ ] New pages/components added to `CLAUDE.md` Features Built section
