# Student Intelligence Sprint — Implementation Plan
### The Sandbox — University of Kentucky
### Generated: 2026-03-19

---

## Overview

Pure data-wiring sprint — zero schema changes, zero new API routes. All data sources exist and are already fetched; this sprint completes the UI layer that was never finished. Eight tasks across three phases.

**What this fixes:**
- `analyticsData.toolBreakdown` is fetched, typed, and stored in state on every visit to `/analytics/student` — and never rendered anywhere
- The Skills Radar shows hardcoded Law-school content (`SKILLS` constant) for every student regardless of their actual program
- The Portfolio tab is entirely hardcoded ("LAW 756: Evidence Rules", 24 sessions, 7.2 hrs, 85 score) — every student sees the same fictional Law student's record
- The Export PDF button calls `window.print()` despite `/api/portfolio/export` existing and returning proper self-contained HTML
- The page header subtitle is hardcoded `ENGL 301 · Dr. Diana Brooks` for every user
- Sandy has no presence in the GradingPanel despite the ProactiveConfig infrastructure being in place
- The SSE enrichment stream has a complete backend (`/api/onboarding/stream`, `useEnrichmentStream` hook) but the UI never shows fields arriving one-by-one

**Sprint stats:**
- 8 tasks, 3 phases
- 0 schema changes
- 0 new API routes
- All data sources: `/api/analytics/student`, `/api/objectives/progress`, `/api/portfolio`, `/api/portfolio/export`, existing concierge hooks, existing `/api/onboarding/stream`

---

## Execution Protocol

**Before every task:** Read the task's "Files to edit" list. Read each file before touching it.

**After every task:** Run `npm run build` from `the-sandbox/`. A clean build (0 TS errors) is required before proceeding.

**Stopping points:** Stop and output the [Context Handoff Prompt](#context-handoff-prompts) after every 2 tasks. Do not batch tasks.

**Working directory:** `c:\AA Code\Educator marketplace\the-sandbox\`

---

## Phase 1 — Student Analytics Dashboard Completion

### Task 1 — Render Tool Breakdown Section

**File to edit:** `app/analytics/student/page.tsx`

**What exists:**
- `analyticsData` state is typed with `toolBreakdown: { toolName: string; sessions: number; avgScore: number | null }[]`
- `/api/analytics/student` already returns `toolBreakdown` — top 8 tools by session count with avg scores
- The data is fetched, stored, and sitting unused

**What to build:**
Add a "Tool Usage" section to the Progress tab, positioned between the Skills Radar and the Learning Objective Mastery block. Render when `analyticsData?.toolBreakdown?.length > 0`.

Display as a vertical list of rows. Each row:
- Tool name (left, truncated with `truncate max-w-[60%]`)
- Session count chip (e.g., `3 sessions`) in gray-100
- Avg score badge: green-600 if ≥ 80, blue-600 if ≥ 65, yellow-600 otherwise — omit if null
- A thin horizontal bar showing relative session count (normalize to max sessions in the list, render as a blue-200 bar with a blue-600 fill, `h-1 rounded-full mt-1`)

Container: `bg-white rounded-2xl border-2 border-gray-200 p-5`. Header: `font-semibold text-gray-900 mb-3` "Tool Usage". If `analyticsData` is null (loading), render nothing (the section simply doesn't appear).

Do not remove or change the SKILLS constant or radar — that is Task 2.

**Build check:** `npm run build` — must pass with 0 TS errors.

---

### Task 2 — Derive Skills Radar from Real Objective Data

**File to edit:** `app/analytics/student/page.tsx`

**What exists:**
- `objectiveProgress: ObjectiveProgressEntry[]` is fetched from `/api/objectives/progress` and stored in state
- Each entry has `attempts`, `correct`, and `objective?.course?.courseCode`
- The Skills Radar at line 210 uses the hardcoded `SKILLS` constant (`[{ skill: 'Legal Reasoning', score: 88 }, ...]`) — Law-specific for every user

**What to build:**
Derive a `displaySkills` variable above the return statement:

```ts
const displaySkills: { skill: string; score: number }[] = (() => {
  if (objectiveProgress.length === 0) return SKILLS // fallback if no data
  // Group by course code, compute mastery per group
  const byGroup = new Map<string, { correct: number; attempts: number }>()
  for (const p of objectiveProgress) {
    const key = p.objective?.course?.courseCode ?? p.courseId
    const existing = byGroup.get(key) ?? { correct: 0, attempts: 0 }
    byGroup.set(key, { correct: existing.correct + p.correct, attempts: existing.attempts + p.attempts })
  }
  const derived = [...byGroup.entries()]
    .filter(([, v]) => v.attempts > 0)
    .map(([skill, v]) => ({ skill, score: Math.round((v.correct / v.attempts) * 100) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
  return derived.length >= 2 ? derived : SKILLS // need at least 2 axes for radar to render
})()
```

Replace `data={SKILLS}` in the RadarChart with `data={displaySkills}`.

Update the section header from "Skill Profile" to "Skill Profile" with a sub-label `text-xs text-gray-400` reading: when using real data, `${objectiveProgress.length} objectives tracked`; when using fallback, `Sample data — complete coursework to see your profile`.

**Build check:** `npm run build` — must pass with 0 TS errors.

---

### ✋ Stop — Output Context Handoff Prompt A (after Tasks 1 & 2)

See [Context Handoff Prompt A](#context-handoff-prompt-a) below.

---

## Phase 2 — Portfolio Tab Real Data

### Task 3 — Wire Portfolio Items to `/api/portfolio`

**File to edit:** `app/analytics/student/page.tsx`

**What exists:**
- Portfolio tab renders 100% hardcoded content: "LAW 756: Evidence Rules", hardcoded learning outcomes, hardcoded tool names — identical for every user
- `/api/portfolio` (GET) returns the current user's portfolio items with fields: `id`, `type`, `title`, `body`, `aiBullets`, `tags`, `tool.name`, `course.courseCode`, `course.title`, `createdAt`
- The auth header pattern used on all other fetches in this file: `{ 'x-demo-user-email': currentUser.email }`

**What to build:**

1. Add a new state variable and type:
```ts
type PortfolioItem = {
  id: string
  type: string
  title: string
  body: string | null
  aiBullets: string[]
  tags: string[]
  tool?: { name: string } | null
  course?: { courseCode: string; title: string } | null
  createdAt: string
}
const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
```

2. Add a `useEffect` to fetch portfolio data (same pattern as the other two effects in this file):
```ts
useEffect(() => {
  fetch('/api/portfolio', { headers: { 'x-demo-user-email': currentUser.email } })
    .then(r => r.json())
    .then((data: { items?: PortfolioItem[] }) => { if (data.items) setPortfolioItems(data.items) })
    .catch(() => {})
}, [currentUser.email])
```

3. Replace the hardcoded portfolio tab content with real data:
- If `portfolioItems.length === 0`: show an empty state — centered icon (BookOpen from lucide), "No portfolio items yet", sub-text "Your graded work, AI sessions, and notes will appear here", and a Link to `/portfolio` styled as a blue button "Go to Portfolio".
- If items exist: render a list of portfolio items. Each item: title in `font-semibold text-gray-900`, type badge (`text-[10px] uppercase tracking-wider font-semibold` in blue-50/blue-600), course code if present (`text-xs text-gray-400`), and the first 2 `aiBullets` as small check-list items (CheckCircle icon, `text-sm text-gray-700`). Container per item: `border-l-4 border-[#0033A0] pl-4 py-1`.

Do not change the stats grid (24 sessions, 7.2 hrs, 85 score) — that is Task 4.
Do not change the Export PDF button — that is Task 5.

**Build check:** `npm run build` — must pass with 0 TS errors.

---

### Task 4 — Real Stats Grid + Trend Label

**File to edit:** `app/analytics/student/page.tsx`

**What exists:**
- Stats grid shows hardcoded `{ label: 'Sessions Completed', value: '24' }`, `{ label: 'Hours Invested', value: '7.2' }`, `{ label: 'Final Avg Score', value: '85' }`
- `analyticsData` already has `recentSessions` (up to 20 sessions with `duration` in minutes and `score`)
- `weeklyProgress` has per-week session counts and scores
- The "+7 pts since start" label in the score trend header is hardcoded

**What to build:**

1. Compute real stats above the return statement:
```ts
const realStats = (() => {
  if (!analyticsData) return null
  const allSessions = analyticsData.recentSessions
  const totalSessions = analyticsData.weeklyProgress.reduce((s, w) => s + (w.sessions ?? 0), 0)
  const totalMinutes = allSessions.reduce((s, sess) => s + (sess.duration ?? 0), 0)
  const scores = allSessions.map(s => s.score).filter((v): v is number => v != null)
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  return { totalSessions, totalHours: (totalMinutes / 60).toFixed(1), avgScore }
})()
```

2. Replace the hardcoded stats grid array with computed values:
```ts
const statsDisplay = realStats
  ? [
      { label: 'Sessions Completed', value: String(realStats.totalSessions) },
      { label: 'Hours Invested', value: realStats.totalHours },
      { label: 'Avg Score', value: realStats.avgScore != null ? String(realStats.avgScore) : '—' },
    ]
  : [
      { label: 'Sessions Completed', value: '24' },
      { label: 'Hours Invested', value: '7.2' },
      { label: 'Final Avg Score', value: '85' },
    ]
```
Pass `statsDisplay` into the `.map()` rendering the grid.

3. Compute the score trend delta:
```ts
const scoreTrend = (() => {
  const weeks = analyticsData?.weeklyProgress ?? []
  const scored = weeks.filter(w => w.score != null)
  if (scored.length < 2) return null
  return (scored[scored.length - 1].score ?? 0) - (scored[0].score ?? 0)
})()
```
Replace the hardcoded `+7 pts since start` label with:
```tsx
{scoreTrend != null
  ? `${scoreTrend >= 0 ? '+' : ''}${scoreTrend} pts since start`
  : 'Score trend'}
```

**Build check:** `npm run build` — must pass with 0 TS errors.

---

### ✋ Stop — Output Context Handoff Prompt B (after Tasks 3 & 4)

See [Context Handoff Prompt B](#context-handoff-prompt-b) below.

---

## Phase 3 — Educator Workflow + Onboarding

### Task 5 — Wire Export PDF to `/api/portfolio/export`

**File to edit:** `app/analytics/student/page.tsx`

**What exists:**
- Export PDF button: `onClick={() => window.print()}`
- `/api/portfolio/export` (GET) exists and returns a `Content-Type: text/html` response with a complete self-contained HTML document suitable for download
- Auth header: `x-demo-user-email`

**What to build:**

1. Add state for export loading: `const [exporting, setExporting] = useState(false)`

2. Add handler:
```ts
async function handleExportPdf() {
  setExporting(true)
  try {
    const res = await fetch('/api/portfolio/export', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
    if (!res.ok) throw new Error('Export failed')
    const html = await res.text()
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentUser.name ?? 'portfolio'}-portfolio.html`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    // silently fail — window.print() as fallback
    window.print()
  } finally {
    setExporting(false)
  }
}
```

3. Replace the Export PDF button:
```tsx
<button
  onClick={handleExportPdf}
  disabled={exporting}
  className="text-xs text-[#0033A0] font-semibold border border-[#0033A0]/30 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
>
  {exporting ? 'Exporting…' : 'Export Portfolio'}
</button>
```

**Build check:** `npm run build` — must pass with 0 TS errors.

---

### Task 6 — Wire Header Subtitle to Real Enrollment

**File to edit:** `app/analytics/student/page.tsx`

**What exists:**
- Header renders: `<p className="text-blue-200 text-sm">{STUDENT.course} · {STUDENT.instructor}</p>`
- `STUDENT.course = 'ENGL 301'`, `STUDENT.instructor = 'Dr. Diana Brooks'` — hardcoded for all users
- `objectiveProgress` is already fetched. Each entry has `objective?.course?.courseCode` and `objective?.course?.title`
- Alternatively, the first enrollment can be derived cheaply from `objectiveProgress` without a new API call

**What to build:**

Compute `headerCourse` above the return:
```ts
const headerCourse = (() => {
  for (const p of objectiveProgress) {
    const code = p.objective?.course?.courseCode
    if (code) return code
  }
  return null
})()
```

Replace the header subtitle with:
```tsx
{headerCourse
  ? <p className="text-blue-200 text-sm">{headerCourse}</p>
  : null}
```
(Remove the hardcoded instructor name — no reliable source for this without an additional fetch. Keep it clean rather than showing a wrong name.)

**Build check:** `npm run build` — must pass with 0 TS errors.

---

### ✋ Stop — Output Context Handoff Prompt C (after Tasks 5 & 6)

See [Context Handoff Prompt C](#context-handoff-prompt-c) below.

---

### Task 7 — Sandy ProactiveConfig in GradingPanel

**File to edit:** `app/components/courses/GradingPanel.tsx`

**What exists:**
- `GradingPanel` receives `entryId: string` and `courseHeaders` (the auth headers map)
- The concierge proactive system works via `ProactiveConfig` objects passed to `ConciergePanel`. Check how other pages use it — search for `ProactiveConfig` usages in `app/page.tsx` and `app/tools/[id]/page.tsx` for the pattern.
- The `useConcierge` hook or the `setConciergeConfig` pattern (whichever is used in sibling components) is the mechanism to fire a proactive message
- The grading panel is opened inside a course page that already has `ConciergePanel` in the layout

**What to build:**

1. Search for how other components trigger Sandy proactives. Look for `ProactiveConfig`, `setConciergeConfig`, or `useConcierge` in the codebase. Match that pattern exactly.

2. When the `GradingPanel` mounts (or when `entryId` changes to a new non-null value), fire a Sandy proactive with:
   - `message`: `"Ready to review this submission? I can help interpret the AI score, check rubric alignment, or draft feedback language — just ask."`
   - `delay`: 1500ms (short — the educator has just opened a specific entry, context is clear)

3. Only fire once per `entryId` — use a `useRef` to track the last `entryId` that triggered the proactive, and skip if it matches.

4. If the proactive system requires the config to be passed up to the page level (i.e., it's prop-drilled rather than a hook), trace how `AssignmentsTab.tsx` or other course tab components pass Sandy config upward, and follow the same pattern. Do not invent a new mechanism.

**Build check:** `npm run build` — must pass with 0 TS errors.

---

### Task 8 — SSE Streaming Profile Reveal in `/onboard`

**Files to read first:**
- `app/onboard/page.tsx` — find the `StreamingStep` component or phase
- `app/lib/useEnrichmentStream.ts` — understand what events it dispatches
- `app/api/onboarding/stream/route.ts` — confirm SSE event shape

**What exists:**
- `/api/onboarding/stream` (GET) is a full SSE route — it streams enrichment events as the Haiku model builds the profile. The `useEnrichmentStream` hook connects to it via `EventSource`.
- The `/onboard` page has a multi-phase flow. The enrichment currently runs server-side and the completed profile is revealed all at once in `ProfileConfirmation`. The streaming reveal UI was explicitly called out in `BLUEPRINT-STATUS.md` as "not built yet."

**What to build:**

In the `StreamingStep` phase of `/onboard/page.tsx`:

1. Start the SSE stream via `useEnrichmentStream` (or equivalent `EventSource` setup) when this phase renders.

2. Track partial profile fields as they arrive: `name`, `title`, `department`, `college`, `interests`. Store in local state as `partialProfile: Partial<EnrichedProfile>`.

3. Render each field as it arrives — use a staggered reveal pattern:
   - Show a pulsing skeleton placeholder for each field that hasn't arrived yet
   - When a field arrives, animate it in (simple fade — add a CSS class `animate-fade-in` if Tailwind supports it, or use `transition-opacity duration-500`)
   - Show a `Loader2` spinning icon next to the active/last-arrived field while stream is still open
   - Fields: Name, Title, Department, College, Interests (as chips)

4. When the stream closes (`onclose` / `done` event), transition to `ProfileConfirmation` phase automatically (same behavior as today, just with the reveal animation before the handoff).

5. If the stream errors or times out (> 15s), fall back to the existing behavior (show the completed profile without animation).

This is a UI-only change. Do not modify the SSE route or the enrichment lib.

**Build check:** `npm run build` — must pass with 0 TS errors.

---

### ✋ Stop — Output Context Handoff Prompt D (after Tasks 7 & 8)

See [Context Handoff Prompt D](#context-handoff-prompt-d) below.

---

## Context Handoff Prompts

These prompts are generated by Claude Code at each stopping point. Copy and paste the appropriate one into a fresh Claude Code session.

---

### Context Handoff Prompt A

> You are continuing the **Student Intelligence Sprint** on The Sandbox (AI-powered educational tool marketplace, University of Kentucky). This is a pure data-wiring sprint — zero schema changes, all data sources already exist.
>
> **Completed so far (Tasks 1 & 2 of 8):**
> - **T1 ✅** — Added "Tool Usage" section to `/analytics/student` Progress tab. Renders `analyticsData.toolBreakdown` (fetched from `/api/analytics/student`) as a session-count bar list with avg score badges. Section appears only when data is present.
> - **T2 ✅** — Replaced hardcoded `SKILLS` radar constant with `displaySkills` derived from `objectiveProgress` (grouped by course code, mastery = correct/attempts). Falls back to `SKILLS` if fewer than 2 groups. Sub-label shows objective count or "Sample data" note.
>
> **Build status:** Clean — 154+ pages, 0 TS errors.
>
> **Your next tasks are Tasks 3 and 4** from `Blueprints/student-intelligence-sprint.md`.
>
> Before starting, read:
> - `Blueprints/student-intelligence-sprint.md` (the full plan — focus on Tasks 3 and 4)
> - `app/analytics/student/page.tsx` (the file you will edit)
> - `app/api/portfolio/route.ts` (understand the response shape for Task 3)
>
> Execute Task 3, run `npm run build`, confirm 0 errors, then execute Task 4, run `npm run build`, confirm 0 errors. Then stop and output Context Handoff Prompt B from the blueprint.

---

### Context Handoff Prompt B

> You are continuing the **Student Intelligence Sprint** on The Sandbox (AI-powered educational tool marketplace, University of Kentucky). This is a pure data-wiring sprint — zero schema changes, all data sources already exist.
>
> **Completed so far (Tasks 1–4 of 8):**
> - **T1 ✅** — "Tool Usage" bar list section on student analytics Progress tab, wired to `analyticsData.toolBreakdown`.
> - **T2 ✅** — Skills Radar derives from `objectiveProgress` (grouped by course code), falls back to hardcoded SKILLS constant if insufficient data.
> - **T3 ✅** — Portfolio tab now fetches `/api/portfolio` and renders real portfolio items with AI bullets. Empty state with link to `/portfolio` when no items exist.
> - **T4 ✅** — Stats grid (sessions/hours/avg score) computed from `analyticsData.recentSessions` and `weeklyProgress`. Score trend delta computed from first vs last scored week.
>
> **Build status:** Clean — 0 TS errors.
>
> **Your next tasks are Tasks 5 and 6** from `Blueprints/student-intelligence-sprint.md`.
>
> Before starting, read:
> - `Blueprints/student-intelligence-sprint.md` (focus on Tasks 5 and 6)
> - `app/analytics/student/page.tsx` (the file you will edit for both tasks)
> - `app/api/portfolio/export/route.ts` (understand what it returns — text/html blob)
>
> Execute Task 5, run `npm run build`, confirm 0 errors, then execute Task 6, run `npm run build`, confirm 0 errors. Then stop and output Context Handoff Prompt C from the blueprint.

---

### Context Handoff Prompt C

> You are continuing the **Student Intelligence Sprint** on The Sandbox (AI-powered educational tool marketplace, University of Kentucky). This is a pure data-wiring sprint — zero schema changes, all data sources already exist.
>
> **Completed so far (Tasks 1–6 of 8):**
> - **T1 ✅** — Tool Usage section on student analytics Progress tab.
> - **T2 ✅** — Skills Radar derived from real objective progress data.
> - **T3 ✅** — Portfolio tab wired to real `/api/portfolio` items.
> - **T4 ✅** — Stats grid and score trend computed from real session data.
> - **T5 ✅** — Export PDF button calls `/api/portfolio/export`, downloads as `.html` file. Falls back to `window.print()` on error.
> - **T6 ✅** — Header subtitle shows real course code from `objectiveProgress` instead of hardcoded "ENGL 301 · Dr. Diana Brooks".
>
> **Build status:** Clean — 0 TS errors.
>
> **Your next tasks are Tasks 7 and 8** from `Blueprints/student-intelligence-sprint.md`.
>
> Before starting, read:
> - `Blueprints/student-intelligence-sprint.md` (focus on Tasks 7 and 8)
> - `app/components/courses/GradingPanel.tsx` (Task 7 — Sandy proactive)
> - Search the codebase for `ProactiveConfig` usages to understand the pattern before touching GradingPanel
> - `app/onboard/page.tsx` (Task 8 — SSE streaming reveal)
> - `app/lib/useEnrichmentStream.ts` (Task 8 — the hook that already exists)
> - `app/api/onboarding/stream/route.ts` (Task 8 — SSE route, understand event shape)
>
> Execute Task 7, run `npm run build`, confirm 0 errors, then execute Task 8, run `npm run build`, confirm 0 errors. Then stop and output Context Handoff Prompt D from the blueprint.

---

### Context Handoff Prompt D

> You are finishing the **Student Intelligence Sprint** on The Sandbox (AI-powered educational tool marketplace, University of Kentucky).
>
> **Sprint complete — all 8 tasks done:**
> - **T1 ✅** — Tool Usage section on student analytics Progress tab.
> - **T2 ✅** — Skills Radar derived from real objective progress data.
> - **T3 ✅** — Portfolio tab wired to real `/api/portfolio` items with AI bullets and empty state.
> - **T4 ✅** — Stats grid and score trend computed from real session data.
> - **T5 ✅** — Export Portfolio button downloads real HTML via `/api/portfolio/export`.
> - **T6 ✅** — Header subtitle shows real enrolled course code.
> - **T7 ✅** — Sandy fires a grading-assistance proactive when GradingPanel opens with a new entryId.
> - **T8 ✅** — SSE streaming profile reveal in `/onboard` — fields animate in one-by-one as enrichment stream delivers them.
>
> **Your task:** Update the project records.
>
> 1. Add this sprint to `Blueprints/BLUEPRINT-STATUS.md` — mark `student-intelligence-sprint.md` as ✅ Complete with today's date and a brief summary of what was built.
> 2. Update `CLAUDE.md` — in the "Features In Progress / Planned" section:
>    - Mark "Student Analytics (currently simulated)" as ✅ Done
>    - Mark "Onboarding SSE streaming profile reveal" as ✅ Done
>    - Remove all items from the "Next sprint (highest value, unblocked)" list that are now complete
>    - Update the "Next sprint" list with any remaining open items (Sandy in other pages, Shibboleth SSO, analytics data pipeline, onboarding course import)
>    - Update the "Ghost Code" section — the RAG lib files (`document-processor.ts`, `document-chunker.ts`, etc.) are wired; remove that stale note
> 3. Run a final `npm run build` and confirm 0 TS errors before updating docs.
