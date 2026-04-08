# Friction Audit & Implementation Plan
### The Sandbox — University of Kentucky
### Roles: Master Software Architect + Head of UX Strategy & Campus Culture
### Generated: 2026-03-19

---

## How to Use This Document

This plan is designed for **guided, incremental execution** by Claude Code.

**Execution protocol:**
- Execute tasks one at a time in the order listed
- After every task, run: `npm run lint && npx tsc --noEmit && npm run build`
- If the build passes, mark the task done and continue
- Stop and request human review after every **2 tasks**
- After every **Phase boundary**, output the [Context Handoff Prompt](#context-handoff-prompt-template) for the next Claude session

**Instruction format for Claude:**
> "Execute Task [N] from `Blueprints/friction-audit-implementation-plan.md`. Once complete, run `npm run lint && npx tsc --noEmit && npm run build`. If it passes, report status and stop for review."

---

## Friction Report — Codebase Audit

The following 10 friction points were identified by auditing `prisma/schema.prisma`, `app/api/`, `app/lib/`, `app/components/`, CLAUDE.md, TOOLS-REGISTRY.md, and BLUEPRINT-STATUS.md. No external user research was required — the gaps are visible in the code itself.

---

## Dual-Role Evaluation

---

### F-01 — Synthetic Analytics Wall

**Finding:** `EDUCATOR_PROFILES_FALLBACK` in `app/page.tsx` contains hardcoded `courseHealth` and `atRisk` arrays. The faculty analytics page (`/analytics/faculty/page.tsx`) renders amber-bannered demo data. Educators see fake numbers about their own students.

**Architect's Solution:**
The root issue is that `ToolSession` has no `score` field, so there is no quality signal to aggregate. The fix is a two-layer pipeline:
1. Add `score Float?` and `qualitySignal String?` (`"strong" | "partial" | "minimal"`) to `ToolSession` via migration.
2. Build `app/lib/session-analytics-service.ts` — after a session ends, call Claude Haiku with the last N `ChatMessage` records and score the session against the tool's `learningObjectives`. Store the result back on the session.
3. Replace `EDUCATOR_PROFILES_FALLBACK.courseHealth` with a real aggregation query: `GROUP BY courseId, AVG(score)` over `ToolSession` records for each educator's courses.
4. Replace `atRisk` with `StudentObjectiveProgress` records where `masteryLevel = "struggling"` and `flaggedForReview = true` — the schema model already exists and has all required fields.
This is fully compatible with Prisma v7 driver adapters. Migration name: `add-session-score`.

**Strategist's UX Impact:**
This is the single highest-leverage fix for educator retention. A faculty member who sees fake data will disengage within one week — they'll treat the platform as a toy. When the numbers are real, the platform becomes irreplaceable. The `atRisk` feed is especially high-stakes: if an advisor or educator acts on a fabricated flag, trust collapses. Priority: **Critical**.

---

### F-02 — Assignment Loop Disconnect

**Finding:** The `Assignment` model (with `AI_EXPERIENCE` type, `toolId`, `dueAt`, `rubricId`) and `Submission` model (with `sessionId` link to `ToolSession`) are fully wired in the schema. But there is no student-facing UI to see assignments, no due-date banner in the tool launcher, and no auto-submission trigger when a session ends.

**Architect's Solution:**
Three surgical additions — no schema changes needed:
1. **Student home widget** (`app/page.tsx` student branch): Query `Assignment` records for enrolled courses (`CourseEnrollment`) where `isPublished = true` and `dueAt > now()`. Render a "Due Soon" card sorted by `dueAt`.
2. **Tool launcher context detection** (`app/tools/[id]/page.tsx`): Accept `?assignmentId=` query param. If present, fetch the assignment and render a `DueDateBanner` component (amber bar at top of chat). Pass `assignmentId` into the session start payload.
3. **Auto-submission** (`app/api/sessions/[id]/end/route.ts`): When a session ends and the session has an `assignmentId` in its metadata, create a `Submission` record linking `sessionId` to the assignment. Prevent duplicate submissions via `@@unique([assignmentId, studentId])` — already in schema.

**Strategist's UX Impact:**
This closes the most critical adoption gap for educators. Right now, assigning a Sandbox tool as homework is aspirational — students don't know they have homework and faculty can't confirm completion. Closing this loop transforms The Sandbox from an optional enrichment tool into a required course component. That is the difference between "nice to have" and "can't teach without it." Priority: **Critical**.

---

### F-03 — Flat Marketplace Discovery (Cold Start Problem)

**Finding:** `/tools` renders a flat grid. Students new to the platform have no path — no "start here," no sequencing by difficulty, no recommendation based on enrollment. `CourseToolLink` already has `weekLabel` and `displayOrder` fields. `LibraryEntry` tracks past usage. Neither is surfaced as a learning path.

**Architect's Solution:**
Two-phase fix:
1. **Course-contextualized tool sequence** in `/courses/[id]`: Query `CourseToolLink` ordered by `displayOrder`, grouped by `weekLabel`. Render a timeline-style list (e.g., "Week 3 — Socratic Debate Partner → Short Answer Assessment"). Tools a student has already used (from `LibraryEntry`) get a checkmark.
2. **Sandy "What's Next" proactive suggestion**: In `ConciergePanel`'s `ProactiveConfig` for the `/tools` page, pass enrolled course IDs. Sandy queries the student's `LibraryEntry` records, finds tools in their enrolled courses they haven't used, and recommends the next one by `displayOrder`. This uses the existing concierge architecture — no new routes needed, only a new `ProactiveConfig` shape.

**Strategist's UX Impact:**
Discovery friction is where most student churn happens. If a student lands on `/tools` and sees 30 options with no guidance, they pick nothing. The weekly sequence view maps onto how students already think — "what do I need for week 4?" — which is natural, familiar, and non-intimidating. Priority: **High**.

---

### F-04 — Sandy Concierge Overreach / No Persistent Dismiss

**Finding:** `ProactiveConfig` was wired across multiple pages in the ARCHITECT_PLAN sprint. There is no mechanism for a user to say "don't suggest this again." `UserMemory` exists with flexible `category` and `content` fields that could store dismissal state, but it's currently only used for student learning context, not UI preferences.

**Architect's Solution:**
1. Add a `DISMISSED_SUGGESTIONS` memory category to `MemoryCategory` enum via migration — or store dismissals in `PERSONAL` category with a structured `content` prefix like `dismiss:tool-recommendation` to avoid a schema change.
2. Add `POST /api/user/memory/dismiss` route: writes a `UserMemory` record of category `PERSONAL` with content `"dismiss:{suggestionKey}"`.
3. In `ConciergePanel`, before firing a `ProactiveConfig` prompt, fetch the user's `PERSONAL` memories and filter against dismissed keys. If the suggestion key is dismissed, suppress it silently.
4. Render a small "✕ Don't suggest this" link below Sandy's proactive message — one click, no confirmation modal.

**Strategist's UX Impact:**
An AI assistant that won't stop suggesting something you've already dismissed feels controlling, not helpful. For the "Professional" UI mode (the only active mode per `ui-mode.ts`), this is especially important — university users expect to be in control of their environment. The fix is lightweight but has outsized psychological impact: users trust tools they can configure. Priority: **Medium-High**.

---

### F-05 — Onboarding SSE Reveal Gap

**Finding:** `onboarding-magic-signup-core.md` is marked `🟡 Partial` — the enrichment pipeline runs server-side and completes, but the SSE streaming UI reveal isn't built. The `/onboard` page shows a result after a full server round-trip, which feels like a generic loading screen rather than a personalized reveal.

**Architect's Solution:**
1. Add `GET /api/onboarding/stream` route — streams enrichment progress as SSE events: `{"event":"analyzing","field":"department"}`, `{"event":"inferred","field":"college","value":"Arts & Sciences"}`, `{"event":"complete","profile":{...}}`. Uses native `ReadableStream` (Next.js App Router compatible, no additional packages).
2. In `/app/onboard/page.tsx`, replace the current fetch-and-wait pattern with an `EventSource` connection. Render each `inferred` event as a card that animates in using Tailwind's `transition-all` and `opacity-0 → opacity-100` classes (no extra animation library — pure Tailwind v4 utilities).
3. The `enrichmentSource` and `enrichmentConfidence` fields already exist on `User` — surface them as a subtle "AI inferred with high confidence" badge on the completed profile.

**Strategist's UX Impact:**
The onboarding moment is the platform's only chance to demonstrate its intelligence before a student has used a single tool. A loading spinner followed by a result says "I'm a form." An animated reveal that shows the AI inferring your college, major, and interests in real time says "I know you." This is a disproportionately high-value moment for a modest engineering effort. Priority: **High**.

---

### F-06 — Interest Tags Never Normalized

**Finding:** `interest-taxonomy.ts` exists with a structured taxonomy. `UserInterest` model stores `tag`, `source`, and `accepted`. But there is no autocomplete UI component in the onboarding flow — interests are either inferred or entered as free-form text that doesn't resolve to taxonomy tags. This makes the `accepted/rejected` flow irrelevant.

**Architect's Solution:**
1. Build `app/components/InterestTagInput.tsx` — a controlled input that calls `GET /api/interests/suggest?q=...` as the user types. The API queries `interest-taxonomy.ts` for fuzzy matches and returns up to 8 suggestions.
2. Selected tags render as removable pills. On removal, call `PATCH /api/user/interests/[tag]` with `{ accepted: false }` — this uses the existing `accepted` field on `UserInterest`.
3. Wire into the `/onboard` page after the SSE reveal (F-05). Present inferred tags as pre-selected pills the user can remove, and the input for adding more.
4. Store accepted tags via existing `POST /api/user/interests` route (or create if not present).

**Strategist's UX Impact:**
Free-form interest entry is a dead end — "English Literature" vs "english-lit" vs "Lit" produce three different tags that don't match. Without taxonomy normalization, interest-based recommendations are noise. This fix makes the data useful. It also gives students a satisfying micro-interaction (accepting/rejecting inferred tags) that reinforces the "the platform understands me" feeling from F-05. Priority: **Medium**.

---

### F-07 — Class-Wide Insight Blindspot

**Finding:** Educators can view individual `ToolSession` records but have no aggregate view of what the whole class asked, where students struggled, or which concepts came up repeatedly. `ChatMessage` has `flagged` and `flagCategory` for moderation but no semantic clustering. `MetricEvent` and `CustomMetricDefinition` are built but used only for custom tool metrics, not platform-wide insight.

**Architect's Solution:**
1. Build `app/lib/insight-service.ts`: accepts `toolId` + `courseId` + `dateRange`, fetches all `ChatMessage` records for matching sessions, groups by `role = 'user'`, and calls Claude Sonnet to cluster messages into: top 5 questions, top 3 misconceptions, avg messages per session, completion rate. Returns structured JSON.
2. Add `GET /api/tools/[id]/insights?courseId=&since=` route — thin wrapper over `insight-service.ts`, guarded by `requireEducatorUser` + `requireToolOwner`.
3. Add an **Insights tab** to the educator tool detail page (`/tools/[id]` when `user.role === 'EDUCATOR'`): renders the cluster results as a simple list with counts. Cached in-memory for 1 hour (avoid re-calling Sonnet on every page load).
4. Surface top insight on the educator dashboard home — a "Your students are asking about..." card using the same API.

**Strategist's UX Impact:**
This is the killer educator feature that no LMS offers. Canvas tells faculty how many students submitted. The Sandbox tells faculty what students are confused about. This is the "office hours at scale" value proposition made visible. When an educator sees "14 of 22 students asked about mens rea" before class, they know exactly what to review. This drives word-of-mouth adoption faster than any marketing. Priority: **High**.

---

### F-08 — Portfolio Dead End (No Export / No Shareable URL)

**Finding:** `PortfolioItem` model has `isVerified`, `metadata`, `skills`, `url`. The student portfolio page exists. But there is no PDF export and no public-facing shareable URL. Students cannot send their Sandbox portfolio to an employer. This removes the most powerful student-retention hook — proof of learning they can use outside the university.

**Architect's Solution:**
1. **Shareable URL**: Add `isPublic Boolean @default(false)` to `PortfolioItem` (or at the portfolio level — a `User.portfolioPublic Boolean` flag). Add `GET /app/portfolio/[userId]/page.tsx` as a public route that requires no auth (or an `x-demo-user-email` bypass for demo mode). Render a read-only version of the portfolio.
2. **PDF Export**: Use `@react-pdf/renderer` (already evaluatable — add as a dependency) or a simpler approach: a `GET /api/portfolio/export` route that renders the portfolio data as structured HTML and uses Vercel's built-in browser-rendering via a `playwright` edge function. Simplest viable approach: generate a clean HTML string server-side and respond with `Content-Type: text/html` + `Content-Disposition: attachment; filename=portfolio.html`. The student opens it in browser and prints to PDF. Zero new dependencies.
3. Add a "Share Portfolio" button to the student portfolio page that copies the public URL to clipboard and toggles `portfolioPublic = true`.

**Strategist's UX Impact:**
Students who can share their Sandbox portfolio with employers become involuntary ambassadors for the platform. Every shared portfolio is a conversation-starter: "What is this?" → "It's an AI learning platform at UK." This is organic institutional marketing that no admin budget can buy. FERPA note: the public portfolio must only show tool names, session counts, and AI-verified skills — never raw chat transcripts. Priority: **High**.

---

### F-09 — LTI 1.3 Incomplete (Canvas Bridge Half-Built)

**Finding:** `canvas-client.ts` exists. `canvasCourseId` on `Course`, `canvasAssignmentId` on `Assignment`, `canvasPushedAt`/`canvasPushStatus` on `GradebookEntry` are all schema-ready. But the OIDC launch flow (student clicks a link in Canvas and lands authenticated in The Sandbox) and grade passback (Gradebook approved → push score to Canvas) are not built.

**Architect's Solution:**
1. **OIDC Launch Flow** (`/api/lti/launch/route.ts`): Implement LTI 1.3 Platform-initiated OIDC. On `POST /api/lti/launch`, validate the `id_token` JWT (signed by Canvas's JWK endpoint), extract `custom_user_email` or `email` claim, and set `x-demo-user-email` equivalent session. Redirect to the tool's URL with the Canvas course context injected as a query param.
2. **Grade Passback** (`app/lib/canvas-grade-service.ts`): After `GradebookEntry.status` transitions to `APPROVED`, call `canvas-client.ts`'s grade submission endpoint with `canvasAssignmentId`, `studentId`, and `facultyScore`. Update `canvasPushedAt` and `canvasPushStatus` on success/failure.
3. Wire the grade push call into the `PATCH /api/gradebook/[entryId]` route when `status` transitions to `APPROVED` — only if `assignment.canvasAssignmentId` is non-null.

**Strategist's UX Impact:**
Without LTI, Canvas-primary educators must context-switch between two systems, maintain two gradebooks, and manually copy scores. That friction is a non-starter for adoption at a Canvas-first institution like UK. With LTI, The Sandbox becomes a Canvas module — students never know they left. This is the platform's institutional legitimacy unlock. Priority: **Critical** (blocks broad faculty adoption).

---

### F-10 — `ToolSession` Has No Normalized Score Field

**Finding:** `ToolSession.summary` stores an AI-generated text wrap-up but there is no numeric `score` field. `GradebookEntry` has `aiScore` and `facultyScore` but only for graded assignments. For the majority of sessions (exploratory, non-graded), there is no quality signal. This is the upstream root cause of F-01 — without session scores, `courseHealth` cannot be computed.

**Architect's Solution:**
Migration `add-session-score`:
```prisma
// Add to ToolSession model:
score          Float?    // 0.0–1.0 AI-assessed quality score
qualitySignal  String?   // "strong" | "partial" | "minimal" | "incomplete"
scoredAt       DateTime? // Timestamp of last scoring
```
After migration, update `app/lib/session-analytics-service.ts` (to be created in F-01 task) to write these fields after each session ends. The `score` field becomes the foundation for:
- `courseHealth` (average score per course)
- `atRisk` (students with consistently low scores)
- Class insight analytics (F-07)
- Portfolio quality signals (F-08)

**Strategist's UX Impact:**
This is foundational plumbing, invisible to users but load-bearing for every analytics surface. Without a score, every dashboard metric remains fake. With it, the platform can honestly tell an educator "your students are performing at 72% on average in this tool" — and that number means something. Priority: **Critical** (prerequisite for F-01, F-07, F-08).

---

## Implementation Plan

Tasks are ordered by dependency. F-10 and F-01 (data foundation) come first, then the workflow loop (F-02), then discovery (F-03), then experience polish (F-04, F-05, F-06), then insight intelligence (F-07), then export/sharing (F-08), then institutional integration (F-09).

---

## Phase 1 — Data Foundation
> Prerequisite for all analytics surfaces. No UI changes — pure schema + service layer.

### Task 1 — Add `score` to `ToolSession` (F-10)

**Files to modify:**
- `prisma/schema.prisma` — add `score Float?`, `qualitySignal String?`, `scoredAt DateTime?` to `ToolSession`

**Steps:**
1. Edit `prisma/schema.prisma` — add three fields to `ToolSession`
2. Run `npx prisma migrate dev --name add-session-score`
3. Run `npx prisma generate`
4. Run build

**Acceptance criteria:** Migration runs clean. `ToolSession` in generated client has `score`, `qualitySignal`, `scoredAt`. Build passes.

---

### Task 2 — Build `session-analytics-service.ts` (F-01 + F-10)

**Files to create:**
- `app/lib/session-analytics-service.ts`

**Files to modify:**
- `app/api/sessions/[id]/end/route.ts` — call scoring after session close

**Logic:**
```typescript
// app/lib/session-analytics-service.ts
export async function scoreSession(sessionId: string): Promise<void>
// 1. Fetch ToolSession with tool.learningObjectives and last 20 ChatMessages
// 2. Call Claude Haiku with a structured scoring prompt:
//    "Given these learning objectives and this conversation, score 0.0–1.0 and classify as strong/partial/minimal/incomplete"
// 3. Parse response, update ToolSession: { score, qualitySignal, scoredAt: new Date() }
// 4. If StudentObjectiveProgress records exist for this student+course, update masteryLevel
```

**Constraints:**
- Business logic goes in `session-analytics-service.ts`, NOT in the route
- Route stays thin: `await scoreSession(session.id)` — one line call
- Use `requireRequestUser` guard already on the end route — do not re-add
- Import Prisma client from `../generated/prisma`

**Acceptance criteria:** Sessions that end get a score written to DB. Build passes.

> **⏸ STOP — Request human review of Tasks 1–2 before continuing.**

---

### Task 3 — Replace Synthetic `courseHealth` with Real Data (F-01)

**Files to modify:**
- `app/api/dashboard/route.ts` — replace fake `courseHealth` with real aggregation

**Query logic:**
```typescript
// For each course the educator owns:
const courseHealth = await prisma.toolSession.groupBy({
  by: ['courseId'],
  where: { courseId: { in: courseIds }, score: { not: null } },
  _avg: { score: true },
  _count: { id: true },
})
```
Map result to `{ courseId, avgScore, sessionCount }`.

**Files to modify:**
- `app/page.tsx` — educator branch: consume `courseHealth` from API instead of `EDUCATOR_PROFILES_FALLBACK`

**Constraints:**
- Do NOT touch `EDUCATOR_PROFILES_FALLBACK` definition — it is a fallback for when API fails
- Only replace the consumption site — the educator branch of the dashboard render

**Acceptance criteria:** Educator home shows real average scores. If no sessions exist, `courseHealth` is empty array (not null). Build passes.

---

### Task 4 — Replace Synthetic `atRisk` with Real `StudentObjectiveProgress` Data (F-01)

**Files to modify:**
- `app/api/dashboard/route.ts` — query `StudentObjectiveProgress` for educator's courses

**Query logic:**
```typescript
const atRisk = await prisma.studentObjectiveProgress.findMany({
  where: {
    courseId: { in: courseIds },
    OR: [{ masteryLevel: 'struggling' }, { flaggedForReview: true }],
  },
  include: { student: { select: { name: true, email: true } }, objective: true },
  orderBy: { updatedAt: 'desc' },
  take: 10,
})
```

**Files to modify:**
- `app/page.tsx` — educator branch: consume `atRisk` from API. Render as a simple list: student name, objective title, mastery level badge.

**Acceptance criteria:** At-risk panel shows real DB data. Empty state renders gracefully ("No students flagged"). Build passes.

> **⏸ STOP — Request human review of Tasks 3–4 before continuing.**

---

## Phase 2 — The Assignment Loop

### Task 5 — Student "Due Soon" Assignment Widget (F-02)

**Files to modify:**
- `app/api/dashboard/route.ts` — student branch: add `assignments` query
- `app/page.tsx` — student branch: render "Due Soon" card

**Query logic (in `dashboard/route.ts` student branch):**
```typescript
const assignments = await prisma.assignment.findMany({
  where: {
    isPublished: true,
    course: { enrollments: { some: { studentId: user.id } } },
    dueAt: { gte: new Date() },
  },
  include: { tool: { select: { name: true, id: true } }, course: { select: { title: true } } },
  orderBy: { dueAt: 'asc' },
  take: 5,
})
```

**Component:** Render as a card beneath the student's recent sessions. Each item: tool name, course title, due date formatted with `date-fns`. Link to `/tools/[toolId]?assignmentId=[assignmentId]`.

**Acceptance criteria:** Student home shows upcoming assignments from enrolled courses. Build passes.

---

### Task 6 — Tool Launcher Assignment Context + Auto-Submit (F-02)

**Files to modify:**
- `app/tools/[id]/page.tsx` — detect `?assignmentId=` param, fetch assignment, pass to chat interface
- `app/components/ChatInterface.tsx` — accept `assignmentId` prop; render `DueDateBanner` if present
- `app/api/sessions/[id]/end/route.ts` — if session has `assignmentId` in notes/metadata, create `Submission`

**New component:** `app/components/DueDateBanner.tsx`
- Amber bar at top of chat: "This session counts as your submission for [Assignment Title] — due [date]"
- Uses lucide-react `AlertCircle` icon
- Tailwind v4 only, no `@apply`

**Auto-submit logic (in `end` route):**
```typescript
// After session ends, check if assignmentId was stored on the session (via notes JSON)
// If yes, upsert Submission: { assignmentId, studentId, type: 'AI_EXPERIENCE', sessionId }
// @@unique([assignmentId, studentId]) prevents duplicates — let Prisma throw and catch gracefully
```

**Acceptance criteria:** Student clicking an assignment link sees the banner. Ending the session creates a `Submission`. Second attempt at same assignment does not create a duplicate. Build passes.

> **⏸ STOP — Request human review of Tasks 5–6 before continuing.**

---

## Phase 3 — Discovery & Learning Paths

### Task 7 — Course Tool Sequence View (F-03)

**Files to modify:**
- `app/courses/[id]/page.tsx` — add "Learning Path" section below course info

**Query logic:**
```typescript
const toolLinks = await prisma.courseToolLink.findMany({
  where: { courseId },
  include: { tool: { select: { id: true, name: true, toolType: true, estimatedMinutes: true } } },
  orderBy: [{ weekLabel: 'asc' }, { displayOrder: 'asc' }],
})
// Group by weekLabel for rendering
```

**Render:** Week-grouped list. For each tool, show: name, type badge, estimated minutes, and a checkmark if student has a `LibraryEntry` for it. Link each tool to `/tools/[id]`.

**Acceptance criteria:** Course page shows tools organized by week. Visited tools are visually marked. Empty state ("No tools added yet") renders for courses without linked tools. Build passes.

---

### Task 8 — Sandy "What's Next" Recommendation (F-03)

**Files to modify:**
- `app/components/ConciergePanel.tsx` — update `ProactiveConfig` for the `/tools` page

**Logic change:** In the `/tools` ProactiveConfig, pass enrolled course tool links and the student's `LibraryEntry` tool IDs to Sandy's system prompt context. Sandy's prompt: "The student is enrolled in these courses with these tools. They have already used [X]. Suggest the most logical next tool and explain why in one sentence."

**Constraints:** This is a prompt/context change, not an API route change. All logic stays in the concierge config, not in a new route. Sandy uses existing `/api/concierge` endpoint.

**Acceptance criteria:** Students on `/tools` who have incomplete course tool sequences receive a relevant Sandy suggestion. Build passes.

> **⏸ STOP — Request human review of Tasks 7–8 before continuing.**

---

## Phase 4 — Onboarding & Interest Quality

### Task 9 — SSE Streaming Onboarding Reveal (F-05)

**Files to create:**
- `app/api/onboarding/stream/route.ts` — SSE endpoint

**Files to modify:**
- `app/onboard/page.tsx` — replace fetch-and-wait with `EventSource` pattern

**SSE event sequence:**
```
data: {"event":"start"}
data: {"event":"analyzing","field":"college"}
data: {"event":"inferred","field":"college","value":"Arts & Sciences","confidence":"high"}
data: {"event":"analyzing","field":"department"}
data: {"event":"inferred","field":"department","value":"English","confidence":"high"}
data: {"event":"complete","profile":{...enrichedUser}}
```

**Render:** Each `inferred` event animates a profile card into view using `transition-all duration-300 opacity-0 → opacity-100` Tailwind classes. The complete event renders the final confirm/edit screen.

**Constraints:** Use `ReadableStream` with `TextEncoder` — no additional streaming packages. Route must be in App Router format. No `@apply` in any CSS.

**Acceptance criteria:** Onboarding page shows animated field-by-field reveal. Final profile appears after stream closes. Build passes.

---

### Task 10 — Interest Tag Autocomplete UI (F-06)

**Files to create:**
- `app/components/InterestTagInput.tsx`
- `app/api/interests/suggest/route.ts`

**API logic (`suggest/route.ts`):**
- Accept `?q=` query param
- Import and fuzzy-search against `interest-taxonomy.ts`
- Return top 8 matches as `{ tag: string, category: string }[]`
- Auth guard: `requireRequestUser` (any role)

**Component (`InterestTagInput.tsx`):**
- Controlled input with debounced calls to `/api/interests/suggest`
- Renders suggestions as a dropdown (absolute positioned, Tailwind v4)
- Selected tags appear as pills with a remove button
- On remove: call `PATCH /api/user/interests/[tag]` setting `accepted: false`
- Uses lucide-react `X` and `Tag` icons

**Wire into `/app/onboard/page.tsx`:** After SSE reveal, render `InterestTagInput` with pre-selected inferred tags.

**Acceptance criteria:** Typing in the interest field shows taxonomy suggestions. Selecting adds a pill. Removing a pill updates DB. Build passes.

> **⏸ STOP — Request human review of Tasks 9–10 before continuing.**

---

## Phase 5 — Class Intelligence

### Task 11 — Build `insight-service.ts` (F-07)

**Files to create:**
- `app/lib/insight-service.ts`

**Interface:**
```typescript
export interface ToolInsight {
  topQuestions: { question: string; count: number }[]
  misconceptions: { topic: string; frequency: string }[]
  avgMessageCount: number
  completionRate: number // sessions with score > 0.5 / total sessions
  generatedAt: Date
}

export async function generateToolInsights(
  toolId: string,
  courseId: string | null,
  since: Date
): Promise<ToolInsight>
```

**Logic:**
1. Query `ChatMessage` records for sessions matching `toolId` + optional `courseId` + `startedAt > since`
2. Filter to `role = 'user'` messages
3. Sample up to 200 messages (avoid token overflow)
4. Call Claude Sonnet with structured extraction prompt
5. Parse response into `ToolInsight` shape
6. Return result (caller decides caching strategy)

**Constraints:** Business logic in `insight-service.ts`, not in route. Import Prisma from `../generated/prisma`. Use `claude-sonnet-4-6` for this analysis (Haiku is insufficient for semantic clustering).

**Acceptance criteria:** Service can be imported and called. Returns valid `ToolInsight` JSON. Build passes.

---

### Task 12 — Educator Tool Insights Panel (F-07)

**Files to create:**
- `app/api/tools/[id]/insights/route.ts`

**Files to modify:**
- `app/tools/[id]/page.tsx` — add "Insights" tab visible to tool owner/EDUCATOR

**Route logic:**
- `requireRequestUser` → `requireToolOwner` (or verify educator is course instructor)
- Accept `?courseId=&since=` params
- Call `generateToolInsights(toolId, courseId, since)`
- Simple in-memory cache: store result in `Map<string, { data: ToolInsight; expiresAt: number }>` keyed by `toolId:courseId`; expire after 1 hour
- Return `ToolInsight` JSON

**UI (in tool detail page educator view):**
- Tab: "Insights" (lucide-react `BarChart2` icon)
- Renders: top 5 questions as a ranked list, top 3 misconceptions as warning cards, completion rate as a progress bar, avg message count as a stat badge

**Acceptance criteria:** Educator sees real class-wide insights on their tool's detail page. Cache prevents repeated Sonnet calls within 1 hour. Build passes.

> **⏸ STOP — Request human review of Tasks 11–12 before continuing.**

---

## Phase 6 — Sandy Boundaries

### Task 13 — Persistent Sandy Dismiss (F-04)

**Files to modify:**
- `app/api/user/memory/route.ts` (or create `app/api/user/memory/dismiss/route.ts`)
- `app/components/ConciergePanel.tsx`

**Dismiss API (`POST /api/user/memory/dismiss`):**
```typescript
// Body: { suggestionKey: string }
// Creates UserMemory: { category: 'PERSONAL', content: `dismiss:${suggestionKey}`, source: 'concierge' }
// requireRequestUser guard
```

**ConciergePanel changes:**
1. On mount, fetch user's `PERSONAL` memories
2. Filter `ProactiveConfig.suggestionKey` against dismissed keys
3. If dismissed, render nothing (no empty container, no flash)
4. Add `DismissButton` rendered below Sandy's proactive message: "✕ Don't show again" — small, muted, lucide-react `X` icon

**Constraints:** The `MemoryCategory` enum already has `PERSONAL` — no schema change needed. Do not add new enum values to avoid a migration for this task.

**Acceptance criteria:** Clicking dismiss stores the key and suppresses the suggestion on next page load. Build passes.

---

### Task 14 — Sandy Relevance Filter (F-04)

**Files to modify:**
- `app/components/ConciergePanel.tsx` — add enrollment-based relevance check to ProactiveConfig

**Logic:** Before rendering a proactive suggestion, check if the `ProactiveConfig` includes a `requiresEnrollment: courseId[]` field. If the current user is not enrolled in any of those courses, suppress the suggestion entirely. Enrollment data is already available from the dashboard API response — pass it as a prop or context.

**This prevents:** A Law student receiving "Try the CS Python Tutor" suggestion on the `/tools` page when they have no CS enrollment.

**Acceptance criteria:** Students only receive Sandy suggestions relevant to their enrolled courses. Build passes.

> **⏸ STOP — Request human review of Tasks 13–14 before continuing.**

---

## Phase 7 — Portfolio Export

### Task 15 — Public Shareable Portfolio URL (F-08)

**Files to modify:**
- `prisma/schema.prisma` — add `portfolioPublic Boolean @default(false)` to `User`
- Migration: `add-portfolio-public-flag`

**Files to create:**
- `app/portfolio/[userId]/page.tsx` — public read-only portfolio page (no auth required)

**Files to modify:**
- Student portfolio page — add "Share Portfolio" button (lucide-react `Share2` icon)
- `app/api/user/portfolio/route.ts` — add `PATCH` handler to toggle `portfolioPublic`

**Public page constraints:**
- Must NOT show raw chat transcripts — only tool names, session counts, AI-verified skills, portfolio items
- If `user.portfolioPublic === false`, return a 404-style "This portfolio is private" page
- No auth guard on the public page route itself — it's intentionally public
- FERPA note: verified skills and tool completion counts are safe to share; personal data (email, SIS ID) must not appear

**Acceptance criteria:** Sharing the portfolio URL shows a clean public page for public profiles. Private profiles show "private" state. Build passes.

---

### Task 16 — Portfolio HTML Export (F-08)

**Files to create:**
- `app/api/portfolio/export/route.ts`

**Approach (zero new dependencies):**
- `requireRequestUser` guard
- Fetch the requesting user's `PortfolioItem` records + tool session stats
- Render a clean HTML string (server-side template literal) with inline styles (no Tailwind in export — needs to be self-contained)
- Respond with `Content-Type: text/html`, `Content-Disposition: attachment; filename="sandbox-portfolio.html"`
- Student opens in browser, File → Print → Save as PDF

**UI change:** Add "Export PDF" button (lucide-react `Download` icon) to student portfolio page that navigates to `/api/portfolio/export`.

**Acceptance criteria:** Clicking Export downloads a self-contained HTML file. Opening in browser and printing renders a clean portfolio. Build passes.

> **⏸ STOP — Request human review of Tasks 15–16 before continuing.**

---

## Phase 8 — Canvas LTI Completion

### Task 17 — LTI 1.3 OIDC Launch Flow (F-09)

**Files to create:**
- `app/api/lti/launch/route.ts`
- `app/api/lti/jwks/route.ts` (JWK Set endpoint — required by Canvas for key exchange)
- `app/lib/lti-service.ts`

**Flow:**
1. Canvas sends `POST /api/lti/launch` with `id_token` (JWT signed by Canvas's JWK set)
2. `lti-service.ts` fetches Canvas JWK set from `CANVAS_BASE_URL/api/lti/security/jwks`
3. Verify JWT signature, extract claims: `email`, `https://purl.imsglobal.org/spec/lti/claim/context` (course), `https://purl.imsglobal.org/spec/lti/claim/custom` (tool slug)
4. Look up or create `User` by email, look up `Course` by `canvasCourseId`
5. Set session (in demo mode: set localStorage `demoUser` equivalent via redirect with signed token)
6. Redirect to `/tools/[toolId]?courseId=[courseId]&lti=true`

**Environment variables required:** `LTI_CLIENT_ID`, `LTI_DEPLOYMENT_ID` (add to CLAUDE.md env var list)

**Constraints:** All JWT verification logic in `lti-service.ts`. Route stays thin. Use `jsonwebtoken` (already in deps) for verification.

**Acceptance criteria:** A valid Canvas LTI launch redirects to the correct tool page. Invalid tokens return 401. Build passes.

---

### Task 18 — Canvas Grade Passback (F-09)

**Files to create:**
- `app/lib/canvas-grade-service.ts`

**Files to modify:**
- `app/api/gradebook/[entryId]/route.ts` — call grade passback after status → `APPROVED`

**`canvas-grade-service.ts` interface:**
```typescript
export async function pushGradeToCanvas(
  canvasAssignmentId: string,
  studentEmail: string,
  score: number,
  pointsPossible: number
): Promise<{ success: boolean; error?: string }>
```

Uses `canvas-client.ts` (already exists). After push, update `GradebookEntry`: `{ canvasPushedAt: new Date(), canvasPushStatus: 'success' | 'error' }`.

**Trigger:** In `gradebook/[entryId]/route.ts`, after status is set to `APPROVED`, check if `submission.assignment.canvasAssignmentId` is non-null. If yes, call `pushGradeToCanvas`. Do not block the response on this — fire and update status asynchronously (or use `waitUntil` in edge runtime).

**Acceptance criteria:** Approving a submission with a `canvasAssignmentId` pushes the grade to Canvas. `canvasPushStatus` is updated. Build passes.

> **⏸ STOP — Request human review of Tasks 17–18 before continuing.**

---

## Architectural Refinements

### Brittleness Identified in Current Code

| Location | Issue | Fix |
|---|---|---|
| `app/page.tsx` `EDUCATOR_PROFILES_FALLBACK` | Synthetic data mixed with real data in same component — hard to audit which is which | After Phase 1 tasks: delete the hardcoded profile data; keep only the fallback shape as a TypeScript interface for type safety |
| `app/api/dashboard/route.ts` | Single route handles ADMIN, EDUCATOR, STUDENT, REGISTRAR paths — growing to 200+ lines | Extract each role's data assembly into `dashboard-service.ts` functions: `buildStudentDashboard()`, `buildEducatorDashboard()`, `buildAdminDashboard()` |
| `app/components/ConciergePanel.tsx` | `ProactiveConfig` is a flat object — no schema validation, easy to misconfigure | Add a `z.object()` Zod schema (or simple TS interface with required fields) for `ProactiveConfig`. Throw at config time, not at render time. |
| `ToolSession.notes` field | Used as a catch-all JSON blob (including `assignmentId`) — untyped and fragile | Add `assignmentId String?` directly to `ToolSession` schema. Migrate existing data. Avoids JSON parsing bugs. |

---

## Context Handoff Prompt Template

Use this prompt to hand off to a new Claude Code session after completing each Phase. Fill in `[COMPLETED]` and `[NEXT]` before sending.

---

```
You are continuing implementation of the Friction Audit Implementation Plan for "The Sandbox" — an AI-powered educational marketplace for the University of Kentucky.

**Always read first:**
- `c:\AA Code\Educator marketplace\the-sandbox\CLAUDE.md` — critical constraints (Tailwind v4, Prisma v7, auth guards, route thinness)
- `c:\AA Code\Educator marketplace\Blueprints\friction-audit-implementation-plan.md` — this plan

**Work completed so far:**
[COMPLETED: e.g., "Tasks 1–8 (Phase 1 Data Foundation + Phase 2 Assignment Loop) are complete and build-passing."]

**Current state:**
- Schema migrations run: [LIST MIGRATION NAMES, e.g., add-session-score, add-portfolio-public-flag]
- New lib files created: [LIST, e.g., session-analytics-service.ts, insight-service.ts]
- New routes created: [LIST]
- Known issues or deferred items: [ANY NOTES]

**Your next task:**
Execute Task [N] from the plan. Once complete, run `npm run lint && npx tsc --noEmit && npm run build`. If it passes, report the result and stop. Do not proceed to the next task without confirmation.

**Non-negotiable constraints:**
- No `@apply` in CSS — Tailwind v4 utility classes in JSX only
- All Prisma imports from `../generated/prisma`
- Every new `route.ts` must call `requireRequestUser` (or appropriate guard) before any DB access
- Business logic goes in `app/lib/`, not inline in route handlers
- lucide-react only for icons
- Schema changes require: edit schema → `npx prisma migrate dev --name <name>` → `npx prisma generate` → build
```

---

## Priority Matrix

| Task | Friction Point | Effort | Adoption Impact | Do First? |
|---|---|---|---|---|
| 1–2 | F-10: Session scoring foundation | Low | Critical | ✅ Yes |
| 3–4 | F-01: Real analytics | Medium | Critical | ✅ Yes |
| 5–6 | F-02: Assignment loop | Medium | Critical | ✅ Yes |
| 7–8 | F-03: Discovery paths | Low | High | ✅ Yes |
| 9–10 | F-05, F-06: Onboarding quality | Medium | High | After Phase 2 |
| 11–12 | F-07: Class insights | High | High | After Phase 3 |
| 13–14 | F-04: Sandy boundaries | Low | Medium | Anytime |
| 15–16 | F-08: Portfolio export | Medium | High | After Phase 5 |
| 17–18 | F-09: Canvas LTI | High | Critical (institutional) | Dedicated sprint |

---

*Blueprint Status: 🔵 Designing — move to 🟡 Partial when first task lands, ✅ Complete when Task 18 passes build.*
