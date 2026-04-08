# Intelligence Surfaces Sprint
## The Sandbox · University of Kentucky
### Lead Engineer Document — Living Spec
**Created:** 2026-03-20
**Goal:** Surface the Year 1 Data Foundation intelligence in the UI. The pipeline is running and computing rich signals — none of it is visible to students or educators. This sprint closes the gap.

---

## Context-Handoff Protocol

**What was just completed:**
- Year 1 Data Foundation Sprint — `StudentProfile` model computing `riskScore`, `learningVelocity`, `preferredModality`, `peakEngagementHour`, `topConceptsThisWeek`, `avgSessionLength`. Session enrichment fields (`durationSeconds`, `hintCount`, `exitReason`, `conceptsTouched`) populated by `session-analytics-service.ts` post-session.
- GraphRAG sprint — `GraphEntity`, `GraphEdge`, `GraphCommunity` populated at avatar deploy time; `graph-rag-service.ts` augments complex chat queries.
- Sandy ProactiveConfig Enhancement — `student-context-service.ts` injects StudentProfile signals into Sandy's system prompt (STUDENT-only, FERPA-safe).

**The gap:**
Sandy is the only consumer of this intelligence. Students and educators see none of it. The `StudentProfile` is computed and stored after every session but never rendered. The `/api/analytics/student/concepts` route exists but no component calls it. `hintCount`, `durationSeconds`, and `exitReason` are stored on every scored session but never surfaced.

**What this sprint builds:**
Seven tasks to surface computed intelligence across three surfaces (student analytics, educator analytics, student home).

---

## Why This Sprint Exists

The strategy document states:
> "The Sandbox sees every interaction, scores every session, remembers every concept gap, and is available at 3am before the exam."

Right now, the platform *knows* all of this but shows none of it. A student in `/analytics/student` sees hardcoded fake data. An educator has no visibility into per-student risk scores or learning velocity. The personalized tool recommendation engine is described in the roadmap but not yet built.

This sprint makes the platform *feel* like an intelligence platform — not just a tool launcher.

---

## What Already Exists (Do Not Rebuild)

| Component | File | What It Provides |
|---|---|---|
| `StudentProfile` model | `prisma/schema.prisma` | riskScore, learningVelocity, preferredModality, peakEngagementHour, topConceptsThisWeek, avgSessionLength |
| Session enrichment | `ToolSession` fields | durationSeconds, hintCount, exitReason, conceptsTouched |
| `student-profile-service.ts` | `app/lib/` | Upserts StudentProfile after each scored session |
| `student-context-service.ts` | `app/lib/` | Reads StudentProfile for Sandy's context (FERPA-safe) |
| Concept coverage API | `/api/analytics/student/concepts` | Covered concepts vs uncovered objectives per course |
| `/api/analytics/student` | route | weeklyProgress, toolBreakdown, recentSessions — **does not include StudentProfile** |
| `/api/analytics/faculty` | route | studentBreakdown — **does not include StudentProfile per student** |
| `insight-service.ts` | `app/lib/` | Generates tool-level insights for educator tool detail |

---

## Scope

| ID | Task | Phase | Schema? | Priority |
|---|---|---|---|---|
| IS-01 | Extend `/api/analytics/student` to return `studentProfile` block | 1 | No | P0 |
| IS-02 | Student Intelligence Card on `/analytics/student` Progress tab | 1 | No | P0 |
| IS-03 | Concept Coverage section on `/analytics/student` Progress tab | 1 | No | P0 |
| IS-04 | Extend `/api/analytics/faculty` with `studentProfile` per student | 2 | No | P1 |
| IS-05 | Student Pulse rows in educator analytics (risk band + velocity) | 2 | No | P1 |
| IS-06 | `/api/recommendations` — personalized tool recommendation engine | 3 | No | P1 |
| IS-07 | "Recommended for You" widget on student home page | 3 | No | P1 |
| IS-08 | Session quality metadata in existing `ToolInsightsPanel` | 4 | No | P2 |

**Total: 8 tasks, 4 phases, zero schema changes.**

---

## Guardrails & Constraints

- **FERPA**: StudentProfile fields MUST NOT be exposed to educators for individual students without aggregation. IS-04/IS-05 may show `riskScore` (aggregate signal) and `learningVelocity` (trend direction only) — no raw concept content from sensitive sessions.
- **Tailwind v4**: No `@apply`. Utility classes only. `size-4` not `w-4 h-4`.
- **Icons**: lucide-react only.
- **Auth**: Every new API route calls `requireRequestUser` before any DB access.
- **Build**: `npm run lint && npx tsc --noEmit && npm run build` must pass at end of each phase.
- **Do not**: Rebuild gamification. Do not extend `EDUCATOR_PROFILES_FALLBACK`.

---

## Phase 1 — Student Intelligence Visibility (IS-01, IS-02, IS-03)

### IS-01 — Extend `/api/analytics/student`

Add a `studentProfile` block to the existing GET response. Read from `prisma.studentProfile.findUnique({ where: { userId: user.id } })` in parallel with the existing queries.

Return shape:
```ts
studentProfile: {
  riskScore: number | null          // 0.0–1.0
  riskBand: 'low' | 'medium' | 'high' | null  // derived: <0.3 low, <0.6 medium, ≥0.6 high
  learningVelocity: number | null   // week-over-week score delta
  velocityLabel: 'improving' | 'stable' | 'declining' | null
  preferredModality: string | null  // "dialogue" | "quiz" | "simulation" | "document"
  peakEngagementHour: number | null // 0–23
  peakEngagementLabel: string | null // "2pm" etc.
  topConceptsThisWeek: string[]
  avgSessionLength: number | null   // seconds
  lastSessionAt: string | null      // ISO
} | null
```

**Checklist:**
- [x] **IS-01** — Add `studentProfile` block to `GET /api/analytics/student` response (parallel Prisma query, derive `riskBand` and `velocityLabel` server-side, format `peakEngagementLabel`)

---

### IS-02 — Student Intelligence Card

On `/analytics/student` `'progress'` tab, render a new card below the stats grid (and above the weekly trend chart).

**Card anatomy:**
- Header: "Your Learning Profile" with `Brain` icon, `text-sm text-gray-500` subtitle "Updated after each session"
- 3-column grid of signal chips:
  - **Risk band** — green chip if low, amber if medium, red if high. Label: "On Track" / "Watch" / "Needs Attention". Only show if `riskBand` is not null.
  - **Learning velocity** — `TrendingUp` green if improving, `TrendingDown` red if declining, `Minus` gray if stable. Show delta `+12%` / `-5%` etc.
  - **Preferred modality** — map to readable label ("Prefers conversation", "Prefers quizzes", etc.) with `MessageSquare`/`ClipboardList`/`Monitor`/`FileText` icon.
  - **Peak hour** — `Clock` icon. "Best at 2pm". Only show if `peakEngagementHour` not null.
  - **Avg session length** — `Timer` icon. Format as "23 min avg". Only show if `avgSessionLength` not null.
  - **Concepts this week** — show count. "5 concepts covered". Links to concept section.
- If `studentProfile` is null (no scored sessions yet): show a subtle "Complete your first tool session to unlock your learning profile" placeholder.
- Card: `border-2 border-gray-200 rounded-2xl p-5 bg-white`

**Checklist:**
- [x] **IS-02a** — Add `studentProfile` to `AnalyticsData` type in `analytics/student/page.tsx`
- [x] **IS-02b** — Render Student Intelligence Card on `'progress'` tab
- [x] **IS-02c** — Null/empty state when no scored sessions exist

---

### IS-03 — Concept Coverage Section

Below the Intelligence Card on the `'progress'` tab, add a Concept Coverage section. This calls the existing `/api/analytics/student/concepts` endpoint (with the first enrolled courseId if available, else no courseId).

**Section anatomy:**
- Header: "Concepts Covered" with `Layers` icon
- Show covered concepts as `bg-blue-50 text-blue-800 border border-blue-200 rounded-full px-2 py-0.5 text-xs` pills (up to 12, then "+N more")
- If `courseId` provided: show uncovered objectives in a separate row with `bg-amber-50 text-amber-700` pills labeled "Not yet touched"
- By-tool breakdown: small `text-xs text-gray-500` sub-rows showing which tool surfaced which concepts
- Empty state: "No concept data yet — start a tool session to see what you've covered"
- Data is fetched in a separate `useEffect` on mount; loading state uses skeleton pills

**Checklist:**
- [x] **IS-03a** — Add `conceptData` state + `useEffect` fetch in `analytics/student/page.tsx`
- [x] **IS-03b** — Render Concept Coverage section with covered pills, uncovered objectives, and by-tool breakdown

---

## Phase 2 — Educator Student Pulse (IS-04, IS-05)

### IS-04 — Extend `/api/analytics/faculty`

Batch-fetch `StudentProfile` for all students in `studentBreakdown`. Add to each student entry:
```ts
riskScore: number | null
riskBand: 'low' | 'medium' | 'high' | null
velocityLabel: 'improving' | 'stable' | 'declining' | null
```

Use `prisma.studentProfile.findMany({ where: { userId: { in: studentIds } } })` — one additional query.

**FERPA note:** `riskScore` is a composite behavioral signal derived from non-sensitive sessions only. Safe for educator view.

**Checklist:**
- [x] **IS-04** — Batch-fetch StudentProfile for all students in faculty analytics; add `riskBand` + `velocityLabel` to each student entry

---

### IS-05 — Student Pulse in Educator Analytics

On `/analytics/faculty`, extend the student breakdown table to show:
- A `riskBand` badge column: green dot "On Track" / amber dot "Watch" / red dot "At Risk"
- A `velocityLabel` indicator: small arrow icon (▲ green / ▼ red / — gray) next to the student name or score

This is additive — the existing table rows gain two new visual indicators.

**Checklist:**
- [x] **IS-05a** — Add `riskBand` / `velocityLabel` to `StudentEntry` type in faculty analytics page
- [x] **IS-05b** — Render risk band badge + velocity arrow in student breakdown table

---

## Phase 3 — Personalized Recommendations (IS-06, IS-07)

### IS-06 — `/api/recommendations`

New route: `GET /api/recommendations`

Logic:
1. `requireRequestUser` — students only (403 for educator/admin)
2. Fetch `StudentProfile` for the user
3. Fetch the user's `topConceptsThisWeek` and `preferredModality`
4. Fetch `ToolSession` history (last 30 days) to get tool IDs already used recently
5. Query published tools NOT recently used:
   - If `preferredModality` is set: bias toward tools whose `toolType` matches (e.g. `preferredModality = 'dialogue'` → prefer `toolType = 'TUTOR'` or `'ROLEPLAY'`)
   - If `topConceptsThisWeek` is set: prefer tools whose `learningObjectives` or `name` contain any concept keyword (simple `contains` filter or client-side filter)
   - Always return up to 4 recommendations
6. For each recommendation, include a `reason` string explaining why (e.g. "Matches your preferred conversation style" / "Covers concepts you're studying this week")

Return shape:
```ts
{ recommendations: { toolId: string; toolName: string; category: string; reason: string; score: number }[] }
```

**Checklist:**
- [x] **IS-06a** — Create `app/api/recommendations/route.ts` with `requireRequestUser` guard, StudentProfile fetch, tool scoring logic, reason generation
- [x] **IS-06b** — Return up to 4 ranked tools with reason strings; never return tools with `published: false`

---

### IS-07 — "Recommended for You" Widget on Student Home

On `app/page.tsx` (student home), add a "Recommended for You" section. Position: after the "Suggested Tools" section, before "Coming Up".

- Fetch `/api/recommendations` on mount (STUDENT role only)
- Render up to 3 tool cards in a horizontal row (or vertical list on mobile)
- Each card: tool name, category badge, reason chip (`text-xs italic text-gray-500`)
- If no recommendations (empty array or error): render nothing (no empty state — just omit the section)
- Cards link to `/tools/[id]` with the tool launch modal

**Checklist:**
- [x] **IS-07a** — Add `recommendations` state + `useEffect` fetch in `app/page.tsx` (STUDENT only)
- [x] **IS-07b** — Render "Recommended for You" section with tool cards + reason chips

---

## Phase 4 — Session Quality in Tool Insights (IS-08)

### IS-08 — Session Quality Metadata in ToolInsightsPanel

The existing `ToolInsightsPanel` on educator tool detail shows AI-generated narrative insights from `insight-service.ts`. Extend it to show a small data strip with aggregate session quality signals.

Extend `/api/tools/[id]/insights` to also return:
```ts
sessionQuality: {
  avgDurationMinutes: number | null   // mean of durationSeconds / 60
  avgHintCount: number | null          // mean of hintCount
  completionRate: number | null        // % sessions with exitReason === 'completed'
  abandonRate: number | null           // % sessions with exitReason === 'abandoned'
  topConcepts: string[]                // union of top 5 conceptsTouched across all sessions
}
```

In `ToolInsightsPanel.tsx`, render a "Session Quality" row above the AI narrative:
- `Timer` icon + "Avg 18 min"
- `HelpCircle` icon + "2.3 hints/session" (only show if avgHintCount > 0)
- `CheckCircle2` icon + "74% completed"
- `XCircle` icon + "26% abandoned" (only show if abandonRate > 15%)
- `Tag` icon + top 3 concept pills

**Checklist:**
- [x] **IS-08a** — Extend `/api/tools/[id]/insights` to compute and return `sessionQuality` from `ToolSession` fields
- [x] **IS-08b** — Render Session Quality row in `ToolInsightsPanel.tsx`

---

## Build Checklist

After each phase:
- [x] `npm run lint` — 0 warnings
- [x] `npx tsc --noEmit` — 0 errors
- [x] `npm run build` — 158 pages, 0 TS errors (2026-03-20)

---

## Context Handoff Prompt (for next session)

> **Sprint in progress:** Intelligence Surfaces Sprint (`intelligence-surfaces-sprint.md`). Year 1 Data Foundation pipeline is fully built — `StudentProfile`, session enrichment fields (`durationSeconds`, `hintCount`, `exitReason`, `conceptsTouched`), GraphRAG. None of it was surfaced in the UI before this sprint.
>
> **What's been implemented so far:** ALL 8 tasks complete (2026-03-20). IS-01 through IS-08 were already implemented before this session; IS-06 (`/api/recommendations/route.ts`) had an HTML entity bug fixed. Build clean at 158 pages, 0 TS errors.
>
> **Next task:** Sprint COMPLETE — proceed to A/B Outcome Measurement Dashboard (`/analytics/ab-outcomes`, ADMIN only)
>
> **Key files:**
> - `app/api/analytics/student/route.ts` — extend this to return `studentProfile` block
> - `app/analytics/student/page.tsx` — render Intelligence Card + Concept Coverage section
> - `app/api/analytics/faculty/route.ts` — extend with StudentProfile per student
> - `app/analytics/faculty/page.tsx` — Student Pulse rendering
> - `app/lib/student-profile-service.ts` — DO NOT modify; just read from `StudentProfile` model
> - `app/lib/student-context-service.ts` — DO NOT modify; Sandy's FERPA-safe reader
