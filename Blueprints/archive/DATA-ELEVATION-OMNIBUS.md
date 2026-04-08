# Data Elevation Omnibus — Architecture & Deployment Strategy
## The Sandbox · University of Kentucky
### Lead Engineer Document — Three-Phase Deployment Plan

---

## 1. Executive Summary

This document governs a three-phase initiative to surface existing data that is already returned by live API routes but never rendered in the UI. No schema changes are required. No new API routes are built (with one exception: a missing page is created for an already-implemented API). Every change wires existing DB fields into existing components.

**Audit finding:** Of the 58 brainstormed features, several top-ranked items were already implemented prior to this initiative (chat transcript in GradingPanel, petition detail richness, per-course avgScore on educator dashboard, real student assignments on home). The six features below represent the true remaining high-ROI gaps.

### The Six Features

| Phase | # | Feature | Type | Files Touched |
|---|---|---|---|---|
| 1 | A | Build `/analytics/platform/page.tsx` (page is missing; API is complete) | New page | `app/analytics/platform/page.tsx` (new) | ✅ Complete (2026-03-19) |
| 1 | B | Email quick-action on educator at-risk rows | UI wire | `app/page.tsx` | ✅ Complete (2026-03-19) |
| 2 | C | Assignment urgency color-coding (red/amber by due date) | UI change | `app/page.tsx` | ✅ Complete (2026-03-19) |
| 2 | D | "Not started" count + top/bottom tool signal on educator dashboard | UI change | `app/page.tsx` | ✅ Complete (2026-03-19) |
| 3 | E | Data-grounded Sandy proactives on `/` (role-aware, live dashboard data) | ProactiveConfig | `app/components/ClientProviders.tsx` | ✅ Complete (2026-03-19) |
| 3 | F | Faculty analytics sub-badges, session/score columns, last active | UI change | `app/analytics/faculty/page.tsx` | ✅ Complete (2026-03-19) |

---

## 2. Global Rules

These rules apply to every task in every phase. Treat them as hard constraints.

| Rule | Enforcement |
|---|---|
| **No schema changes** | Zero `npx prisma migrate dev` calls in this initiative. All data is already in the DB. |
| **Protect EDUCATOR_PROFILES_FALLBACK** | Never add new fields to the synthetic fallback object in `app/page.tsx`. Only add to the real-data path (dashboardData merge). |
| **FERPA sensitiveSession filter** | Any new Prisma query touching `ToolSession` must include `sensitiveSession: false`. This initiative adds no direct Prisma queries, but the rule stands. |
| **Zero TypeScript errors** | `npx tsc --noEmit` must pass before marking any feature complete. |
| **Zero lint errors** | `npm run lint` must pass. |
| **lucide-react icons only** | No heroicons, react-icons, or other icon libraries. |
| **Tailwind v4 — no @apply** | Inline utility classes in JSX only. |
| **Thin routes** | No business logic in route files. This initiative touches only pages and components — no route changes. |
| **Auth guards untouched** | Do not remove or bypass any `require*User` guard. |
| **Synthetic watermark** | Faculty analytics (`/analytics/faculty`) renders simulated STUDENTS data with an amber disclosure banner. Do NOT remove the banner. Improvements in Phase 3 are additive to the simulated data layer only — do not attempt to wire real API data to this page. |

---

## 3. Phase 1: Features A & B

### Feature A — Build `/analytics/platform/page.tsx`

**Problem:** The route `/analytics/platform` renders nothing. The API (`GET /api/analytics/platform`) is fully implemented and returns:
```
totalUsers, totalTools, totalSessions, sessionsLast30Days,
avgSessionScore, adoptionByDepartment[{ department, users, sessions }],
topTools[{ id, name, sessions, avgScore }],
costEstimate: { totalTokensEstimate, costUsd, costPerSession }
```

**Technical approach:**

Create `app/analytics/platform/page.tsx` as `'use client'`.

```
auth guard  → redirect to '/' if currentUser.role !== 'ADMIN'
fetch       → GET /api/analytics/platform with x-demo-user-email header
layout      → max-w-6xl mx-auto px-6 py-8
```

**Page structure:**

1. **PageHeader** — `h1` "Platform Analytics", subtitle "Institution-wide view · {sessionsLast30Days} sessions in the last 30 days"
2. **KPI row (4 tiles):**
   - Total Users (totalUsers)
   - Published Tools (totalTools)
   - Total Sessions (totalSessions)
   - Cost Per Session (`$${costEstimate.costPerSession.toFixed(4)}`)
3. **Left column (2/3 width):**
   - "Top Tools by Usage" — table: tool name, session count, avgScore (or "—" if null)
   - Limit to top 5 rows; "—" for null avgScore
4. **Right column (1/3 width):**
   - "Users by Department" — list of up to 8 departments; user count shown as text (sessions are all 0 from the API — omit sessions column for now)
   - Note below: "Session attribution by department is pending the analytics pipeline."

**Loading state:** Skeleton tiles (animate-pulse bg-gray-100 rounded-xl) while fetch is in flight.

**Error state:** If fetch fails or returns non-200, show a simple amber callout: "Could not load platform analytics."

**Sandy proactive config:** Wire into `ClientProviders.tsx` — on pathname `/analytics/platform`, trigger: `"Platform analytics loaded — {totalSessions} total sessions across {totalTools} published tools. Want a summary of adoption trends?"`

**Files touched:**
- `app/analytics/platform/page.tsx` — CREATE (new file, ~120 lines)
- `app/components/ClientProviders.tsx` — ADD one ProactiveConfig entry

---

### Feature B — Email quick-action on educator at-risk rows

**Problem:** `FacultyAtRisk` type has `studentEmail` returned from the API, but the property is dropped during the profile merge at `page.tsx:675-681`, so it never reaches the render layer. The at-risk list at `page.tsx:1397+` shows only student names with no action.

**Technical approach:**

Three surgical edits to `app/page.tsx`:

1. **Type extension** — add `email?: string` to the `FacultyAtRisk` interface (~line 113).
2. **Merge fix** — in the `atRisk` array map (~line 675), add `email: r.studentEmail` alongside the other mapped properties.
3. **Render** — in the at-risk render loop (~line 1397), add a `mailto:` icon link after the student name. Use `Mail` from lucide-react. Only render if `student.email` is truthy.

```tsx
{student.email && (
  <a
    href={`mailto:${student.email}`}
    className="ml-auto text-[#0033A0] hover:text-blue-700 flex-shrink-0"
    title={`Email ${student.studentName}`}
  >
    <Mail className="size-3.5" />
  </a>
)}
```

Add `Mail` to the lucide-react import at the top of `app/page.tsx`.

**Files touched:**
- `app/page.tsx` — 3 edits (type, merge, render + import)

---

### Phase 1 Testing Checklist

| Step | Action | Expected |
|---|---|---|
| 1. Build | `npm run lint && npx tsc --noEmit` | 0 errors |
| 2. Admin — platform page | Log in as `admin@uky.edu`, navigate to `/analytics/platform` | Page renders with 4 KPI tiles, top tools table, department list; no 401/404 |
| 3. Admin — platform page | Log in as `bob.dipaola@uky.edu`, navigate to `/analytics/platform` | Same — both admin users can access |
| 4. Non-admin redirect | Log in as `heath.price@uky.edu`, navigate to `/analytics/platform` | Redirected to `/` |
| 5. Sandy proactive | As admin on `/analytics/platform`, open Sandy | Proactive message fires with session/tool counts |
| 6. Email quick-action | As `heath.price@uky.edu`, go to `/` | At-risk rows show mail icon |
| 7. Email click | Click mail icon on an at-risk student row | Browser opens `mailto:` with student email pre-filled |
| 8. EDUCATOR_PROFILES_FALLBACK | Verify synthetic fallback values are unchanged | `courseHealth.avgScore: 83`, atRisk names unchanged |

---

### Phase 1 Handoff Prompt

```
You are the lead engineer on The Sandbox — an AI-powered educational tool marketplace for the University of Kentucky. Do not write architecture documents or ask clarifying questions. Execute the following two features exactly as specified, then verify the build.

## Context

- Project root: `c:\AA Code\Educator marketplace\the-sandbox\`
- Always read CLAUDE.md first at the project root for hard constraints (Tailwind v4 no @apply, Prisma v7 imports, lucide-react icons only, thin routes, auth guards).
- This is a Next.js 16 App Router project with TypeScript, Tailwind CSS v4, Prisma v7, and Anthropic SDK.
- Auth is demo-mode: `x-demo-user-email` header passed on all API calls.
- Demo admin users: `admin@uky.edu`, `bob.dipaola@uky.edu`, `eric.monday@uky.edu`.
- Demo educator: `heath.price@uky.edu`. Demo students: `ian.mcclure.student@uky.edu`, `tiana.the@uky.edu`.

## Global Rules (non-negotiable)

1. No schema changes (no `prisma migrate dev`).
2. Never add fields to EDUCATOR_PROFILES_FALLBACK in `app/page.tsx` — fallback is synthetic, extend only the real-data path.
3. Any new Prisma query touching ToolSession must include `sensitiveSession: false`.
4. `npm run lint && npx tsc --noEmit` must pass with 0 errors before you are done.
5. lucide-react icons only. Tailwind v4 only (no @apply). Thin routes.

## Feature A — Build `/analytics/platform/page.tsx`

The route `/analytics/platform` currently renders nothing. The API `GET /api/analytics/platform` is fully implemented. Read it first at `app/api/analytics/platform/route.ts` to understand the exact response shape, then create the page.

**Response shape:**
```
totalUsers: number
totalTools: number
totalSessions: number
sessionsLast30Days: number
avgSessionScore: number | null
adoptionByDepartment: { department: string, users: number, sessions: number }[]
topTools: { id: string, name: string, sessions: number, avgScore: number | null }[]
costEstimate: { totalTokensEstimate: number, costUsd: number, costPerSession: number }
```

**Build `app/analytics/platform/page.tsx`:**
- `'use client'` component
- Auth guard: if `currentUser.role !== 'ADMIN'`, redirect to `/` using `useRouter`
- Single `fetch('/api/analytics/platform', { headers: { 'x-demo-user-email': currentUser.email } })` on mount with `useEffect`
- Show animate-pulse skeleton tiles while loading
- Show amber error callout if fetch fails

**Page layout (max-w-6xl mx-auto px-6 py-8):**
1. `<h1>` "Platform Analytics" + subtitle: "{sessionsLast30Days} sessions in the last 30 days"
2. KPI row — 4 white rounded-2xl border tiles: Total Users, Published Tools, Total Sessions, Cost Per Session (`$${costEstimate.costPerSession.toFixed(4)}`)
3. Two-column layout (2/3 + 1/3):
   - Left: "Top Tools by Usage" — simple table (tool name | sessions | avg score). Show top 5 rows. Render null avgScore as "—".
   - Right: "Users by Department" — list up to 8 departments with user counts. Add note: "Session attribution by department is pending the analytics pipeline."

**Also:** In `app/components/ClientProviders.tsx`, find the `getProactiveConfig` function or the proactive config logic. Add a new entry: on pathname `/analytics/platform`, set a static proactive message: `"Platform analytics loaded — want a summary of adoption trends or cost efficiency?"`. Use `trigger: 'badge'` and a `sessionKey: 'sandy-platform-analytics'`.

## Feature B — Email quick-action on educator at-risk rows

Read `app/page.tsx` before making any edits. Then make exactly 3 edits:

1. Find the `FacultyAtRisk` type/interface (around line 113). Add `email?: string` to it.
2. Find the `atRisk` array map in the dashboard data merge (around line 675). Add `email: r.studentEmail` to the mapped object.
3. Find the at-risk render loop (around line 1397). After the student name span, add:
   ```tsx
   {student.email && (
     <a href={`mailto:${student.email}`} className="ml-auto text-[#0033A0] hover:text-blue-700 flex-shrink-0" title={`Email ${student.studentName}`}>
       <Mail className="size-3.5" />
     </a>
   )}
   ```
   Add `Mail` to the lucide-react import at the top of the file.

## Verification (run in this order)

1. `cd "c:/AA Code/Educator marketplace/the-sandbox" && npm run lint`
2. `npx tsc --noEmit`
3. Confirm both pass with 0 errors.
4. Report: "Phase 1 complete — [list of files changed]"

Do not move on to any other features. Do not refactor surrounding code. Do not add comments unless logic is non-obvious.
```

---

## 4. Phase 2: Features C & D

### Feature C — Assignment urgency color-coding

**Problem:** The student home dashboard's "Due Soon" section renders all assignments with flat amber styling regardless of how urgent they are. `dueAt` timestamps are already returned by `/api/dashboard` and are already used to render the due date label.

**Technical approach:**

One edit to the assignment render loop in `app/page.tsx`. The section is around line 927-962. `differenceInHours` is already imported from `date-fns` (or can be added to the existing import).

Inside the `.map((a) =>` call, compute urgency inline:

```tsx
const hoursLeft = a.dueAt ? differenceInHours(new Date(a.dueAt), new Date()) : 999
const cardStyle = hoursLeft < 24
  ? 'border-red-200 bg-red-50/40 hover:border-red-300'
  : hoursLeft < 72
  ? 'border-amber-200 bg-amber-50/30 hover:border-amber-300'
  : 'border-gray-100 hover:border-gray-200'
const labelStyle = hoursLeft < 24
  ? 'text-red-600'
  : hoursLeft < 72
  ? 'text-amber-600'
  : 'text-gray-400'
```

Apply `cardStyle` to the card container's `className` (replace current flat border/bg).
Apply `labelStyle` to the due date text span.

Add `differenceInHours` to the date-fns import if it is not already present.

**Files touched:**
- `app/page.tsx` — 1 edit region (~10 lines changed inside the map)

---

### Feature D — "Not started" count + top/bottom tool signal

**Problem (D1 — not started count):** Educator course health rows show enrolled count and engagement %, but no "how many haven't started" signal. This is trivially computable: `enrolled - round(enrolled * engagementPct / 100)`.

**Problem (D2 — top/bottom tool):** The educator's recent activity feed is a chronological list with no performance lens. `recentActivity` is returned by `/api/dashboard` with `toolName` and `score` fields.

**Technical approach for D1:**

Inside the course health row render loop (~line 1319), after the existing engaged/at-risk chips, compute and render:

```tsx
const notStarted = course.enrolled - Math.round(course.enrolled * course.engagementPct / 100)
```

Then render a small chip if `notStarted > 0`:

```tsx
{notStarted > 0 && (
  <span className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
    {notStarted} not started
  </span>
)}
```

**Technical approach for D2:**

Above the activity feed render (find where `educatorProfile.recentActivity` is mapped, around line 1420+), compute the best and worst tool from `dashboardData?.recentActivity`:

```tsx
const toolScoreMap = new Map<string, number[]>()
dashboardData?.recentActivity?.forEach(a => {
  if (typeof a.score === 'number') {
    toolScoreMap.set(a.toolName, [...(toolScoreMap.get(a.toolName) ?? []), a.score])
  }
})
const toolAvgs = [...toolScoreMap.entries()]
  .map(([name, scores]) => ({ name, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) }))
  .sort((a, b) => b.avg - a.avg)
const topTool = toolAvgs[0]
const lowTool = toolAvgs.length > 1 ? toolAvgs[toolAvgs.length - 1] : null
```

Render a 2-chip row above the activity feed (only when `toolAvgs.length >= 1`):

```tsx
{toolAvgs.length >= 1 && (
  <div className="flex gap-2 mb-3 flex-wrap">
    {topTool && (
      <span className="text-xs bg-green-50 border border-green-200 text-green-700 rounded-full px-2.5 py-1">
        ↑ Top: {topTool.name} ({topTool.avg}%)
      </span>
    )}
    {lowTool && (
      <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-2.5 py-1">
        ↓ Watch: {lowTool.name} ({lowTool.avg}%)
      </span>
    )}
  </div>
)}
```

**Files touched:**
- `app/page.tsx` — 2 edit regions (one in course health loop, one above activity feed)

---

### Phase 2 Testing Checklist

| Step | Action | Expected |
|---|---|---|
| 1. Build | `npm run lint && npx tsc --noEmit` | 0 errors |
| 2. Urgency — no due dates | Log in as any student with no upcoming assignments | No red/amber cards; "Due Soon" section may be empty or show default gray |
| 3. Urgency — due within 24h | Check if any seeded assignment has a dueAt within 24h of today | Card border/bg is red-tinted; date label is red |
| 4. Urgency — due within 72h | Check if any seeded assignment has a dueAt 1–3 days out | Card border/bg is amber-tinted |
| 5. Not started count | Log in as `heath.price@uky.edu`, go to `/` | Course health rows show "X not started" chip when applicable |
| 6. Top/bottom tool | As educator with recentActivity, check activity feed header | Two chips appear: "↑ Top: [tool] (X%)" and "↓ Watch: [tool] (X%)" |
| 7. Top/bottom — single tool | Verify behavior when only one tool is in recentActivity | Only the "↑ Top" chip appears; no "↓ Watch" |
| 8. EDUCATOR_PROFILES_FALLBACK | Verify synthetic values unchanged | avgScore: 83, enrolled: 47, engagementPct: 72 in TEK-100 row |

---

### Phase 2 Handoff Prompt

```
You are the lead engineer on The Sandbox — an AI-powered educational tool marketplace for the University of Kentucky. Phase 1 of the Data Elevation initiative is complete (platform analytics page built, email quick-action on at-risk rows wired). Now execute Phase 2.

## Context

- Project root: `c:\AA Code\Educator marketplace\the-sandbox\`
- Always read CLAUDE.md at the project root before making changes.
- Phase 1 already done: `app/analytics/platform/page.tsx` (created), `app/page.tsx` (FacultyAtRisk.email wired, Mail icon on at-risk rows), `app/components/ClientProviders.tsx` (Sandy proactive on /analytics/platform).
- Do not re-read or re-implement Phase 1 work.

## Global Rules (non-negotiable)

1. No schema changes.
2. Never add fields to EDUCATOR_PROFILES_FALLBACK in `app/page.tsx`.
3. `npm run lint && npx tsc --noEmit` must pass with 0 errors before you are done.
4. lucide-react icons only. Tailwind v4 only (no @apply).
5. Do not remove or modify the synthetic data watermark banner on `/analytics/faculty`.

## Feature C — Assignment urgency color-coding

Read `app/page.tsx` first. Find the student "Due Soon" section where `dashboardData.assignments` is mapped (around line 927–962).

Inside the map callback, compute urgency using `differenceInHours` from date-fns:
```
const hoursLeft = a.dueAt ? differenceInHours(new Date(a.dueAt), new Date()) : 999
```

Then apply conditional styles:
- `hoursLeft < 24`: card gets red border/bg; date label gets `text-red-600`
- `hoursLeft < 72`: card gets amber border/bg; date label gets `text-amber-600`
- Otherwise: card gets gray border/bg; date label gets `text-gray-400`

Replace the existing static card border/bg/label styles with these computed values. Add `differenceInHours` to the date-fns import if not already there.

## Feature D — "Not started" count + top/bottom tool signal

Read `app/page.tsx` first, then make 2 edit regions:

**D1 — Not started count in course health rows:**
Find the course health `.map()` loop (around line 1319). Inside it, after the existing engaged/at-risk chips, compute `notStarted = course.enrolled - Math.round(course.enrolled * course.engagementPct / 100)` and render a gray chip "X not started" when `notStarted > 0`.

**D2 — Top/bottom tool chips above activity feed:**
Find where `educatorProfile.recentActivity` is rendered (around line 1420+). Before the activity list, compute tool averages from `dashboardData?.recentActivity` — group scores by toolName, compute avg per tool, sort. Render two chips ("↑ Top: [tool] (X%)" in green, "↓ Watch: [tool] (X%)" in amber) only when at least 2 tools exist in the data. Show only "↑ Top" if exactly 1 tool exists.

## Verification (run in this order)

1. `cd "c:/AA Code/Educator marketplace/the-sandbox" && npm run lint`
2. `npx tsc --noEmit`
3. Confirm both pass with 0 errors.
4. Report: "Phase 2 complete — [list of files changed and line ranges]"

Do not touch any other files. Do not refactor surrounding code.
```

---

## 5. Phase 3: Features E & F

### Feature E — Data-grounded Sandy proactives on `/` (role-aware)

**Problem:** The Sandy concierge on `/` fires a generic static message for all users. The home page already fetches `/api/dashboard` on mount (inside `app/page.tsx`). `ClientProviders.tsx` holds the `getProactiveConfig` function that returns static configs per route.

**Technical approach:**

The current `getProactiveConfig(pathname, role)` function in `ClientProviders.tsx` is synchronous and returns a static message. Extend `AppShell` (the component inside `ClientProviders.tsx`) to do a lightweight async fetch of dashboard summary when `pathname === '/'`.

Add state: `const [homeProactive, setHomeProactive] = useState<ProactiveConfig | undefined>(undefined)`

Add effect:
```tsx
useEffect(() => {
  if (pathname !== '/' || isGuest) return
  fetch('/api/dashboard', { headers: { 'x-demo-user-email': currentUser.email } })
    .then(r => r.ok ? r.json() : null)
    .then(d => {
      if (!d) return
      if (currentUser.role === 'STUDENT') {
        const now = new Date()
        const dueThisWeek = (d.assignments ?? []).filter(
          (a: { dueAt: string | null }) =>
            a.dueAt && differenceInDays(new Date(a.dueAt), now) >= 0 && differenceInDays(new Date(a.dueAt), now) <= 7
        ).length
        if (dueThisWeek > 0) {
          setHomeProactive({
            message: `You have ${dueThisWeek} assignment${dueThisWeek !== 1 ? 's' : ''} due this week — want help prioritizing or finding the right tools?`,
            trigger: 'badge',
            sessionKey: 'sandy-home-assignments'
          })
        }
      } else if (currentUser.role === 'EDUCATOR') {
        const atRiskCount = (d.atRisk ?? []).length
        if (atRiskCount > 0) {
          const courseName = d.courseHealth?.[0]?.title ?? 'your course'
          setHomeProactive({
            message: `You have ${atRiskCount} student${atRiskCount !== 1 ? 's' : ''} showing signs of struggle in ${courseName} — want me to help draft outreach or check their recent sessions?`,
            trigger: 'badge',
            sessionKey: 'sandy-home-at-risk'
          })
        }
      }
    })
    .catch(() => {})
}, [pathname, currentUser.email, currentUser.role, isGuest])
```

Add `differenceInDays` to the date-fns import in `ClientProviders.tsx`.

Pass `homeProactive ?? getProactiveConfig(pathname, currentUser.role)` to `ConciergePanel` instead of just `getProactiveConfig(...)`.

**Important:** The `ProactiveConfig` interface must have a `sessionKey?: string` field (check if it already does; add if not). `ConciergePanel` uses `sessionKey` to avoid firing the same proactive twice. Review the existing interface before editing.

**Files touched:**
- `app/components/ClientProviders.tsx` — 2 edits (import, AppShell state/effect/prop pass)

---

### Feature F — Faculty analytics sub-badges, session/score columns, last active

**Problem:** `/analytics/faculty/page.tsx` uses a hardcoded `STUDENTS` array with rich data (flags[], sessions, current score, lastActive) but only renders a subset of it. The simulated `STUDENTS` data already contains:
- `flags: ['grade_drop', 'disengagement', 'short_sessions']` per student
- `sessions: 24` — session count
- `current: 85` — current average score
- `lastActive: '2 hours ago'` — pre-formatted string

**This page uses simulated data. Do not attempt to wire it to the real API. Do not remove the amber disclosure banner.**

**Technical approach — 3 localized edits to `app/analytics/faculty/page.tsx`:**

**F1 — Sub-badges on at-risk status:**
Find where the student `status` badge is rendered (the "at_risk" / "on_track" / "exceeding" badge). After it, add two conditional chips:
```tsx
{student.flags.includes('disengagement') && (
  <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-2 py-0.5">
    Engagement ↓
  </span>
)}
{student.flags.includes('grade_drop') && (
  <span className="text-xs bg-red-50 border border-red-200 text-red-700 rounded-full px-2 py-0.5">
    Grade ↓
  </span>
)}
```

**F2 — Sessions and score columns in student breakdown table:**
Find the student breakdown table or list (likely inside the expandable detail panel or the main student row). Add two data points inline with existing stats:
```tsx
<span className="text-xs text-gray-500">{student.sessions} sessions</span>
<span className="text-xs text-gray-500">Avg: {student.current}%</span>
```

**F3 — Last active label:**
Find where student detail is rendered. Add:
```tsx
<span className="text-xs text-gray-400">Last active: {student.lastActive}</span>
```
The `lastActive` field is already a pre-formatted string (e.g., "2 hours ago", "5 days ago") — render it directly.

**Files touched:**
- `app/analytics/faculty/page.tsx` — 3 localized edits

---

### Phase 3 Testing Checklist

| Step | Action | Expected |
|---|---|---|
| 1. Build | `npm run lint && npx tsc --noEmit` | 0 errors |
| 2. Sandy — student with assignments | Log in as `ian.mcclure.student@uky.edu`, go to `/` | Sandy badge fires "You have N assignments due this week" |
| 3. Sandy — student no assignments | Log in as `tiana.the@uky.edu` if she has no upcoming due dates, go to `/` | Sandy falls back to default static proactive (no error) |
| 4. Sandy — educator with at-risk | Log in as `heath.price@uky.edu`, go to `/` | Sandy badge fires "You have N students showing signs of struggle in TEK-100..." |
| 5. Sandy — admin | Log in as `admin@uky.edu`, go to `/` | Admin users get no data-grounded home proactive (undefined → static fallback) |
| 6. Sandy — session key | Dismiss Sandy badge, navigate away, return to `/` | Badge does not re-fire within same session (sessionKey deduplication) |
| 7. Sub-badges — at-risk student | Log in as educator, go to `/analytics/faculty`, expand Devon Carter (at_risk) | "Engagement ↓" and "Grade ↓" chips appear beside status badge |
| 8. Sub-badges — on-track student | Expand Ian McClure (on_track, flags: []) | No sub-badges rendered |
| 9. Sessions + score columns | Expand any student detail panel | Sessions count and avg score are visible |
| 10. Last active | Expand any student | "Last active: X" label shows |
| 11. Simulated banner | Confirm amber disclosure banner still present on `/analytics/faculty` | Banner not removed |

---

### Phase 3 Handoff Prompt

```
You are the lead engineer on The Sandbox — an AI-powered educational tool marketplace for the University of Kentucky. Phases 1 and 2 of the Data Elevation initiative are complete. Now execute Phase 3 (the final phase).

## Context

- Project root: `c:\AA Code\Educator marketplace\the-sandbox\`
- Always read CLAUDE.md at the project root before making changes.
- Phase 1 done: `app/analytics/platform/page.tsx` (created), `app/page.tsx` (at-risk email), `app/components/ClientProviders.tsx` (Sandy on /analytics/platform).
- Phase 2 done: `app/page.tsx` (assignment urgency colors, not-started count, top/bottom tool chips).
- Do not re-read or re-implement any Phase 1 or 2 work.

## Global Rules (non-negotiable)

1. No schema changes.
2. Never add fields to EDUCATOR_PROFILES_FALLBACK in `app/page.tsx`.
3. `npm run lint && npx tsc --noEmit` must pass with 0 errors before you are done.
4. lucide-react icons only. Tailwind v4 only (no @apply).
5. `/analytics/faculty` uses SIMULATED data (hardcoded STUDENTS array). Do NOT wire it to a real API. Do NOT remove the amber "simulated data" banner. Phase 3 improvements are additive to the simulated data layer only.

## Feature E — Data-grounded Sandy proactives on `/`

Read `app/components/ClientProviders.tsx` first. Find the `ProactiveConfig` interface and confirm whether it already has a `sessionKey?: string` field — add it if not.

Find the `AppShell` component. Add:
1. `useState<ProactiveConfig | undefined>(undefined)` for `homeProactive`
2. A `useEffect` that fires when `pathname === '/'` and `!isGuest` — it fetches `/api/dashboard` with the `x-demo-user-email` header, then:
   - **STUDENT**: counts `d.assignments` with `dueAt` within the next 7 days. If count > 0, sets homeProactive to: `"You have N assignment(s) due this week — want help prioritizing or finding the right tools?"` with `trigger: 'badge'`, `sessionKey: 'sandy-home-assignments'`.
   - **EDUCATOR**: checks `(d.atRisk ?? []).length`. If > 0, sets homeProactive to: `"You have N student(s) showing signs of struggle in [d.courseHealth[0].title ?? 'your course'] — want me to help draft outreach or check their recent sessions?"` with `trigger: 'badge'`, `sessionKey: 'sandy-home-at-risk'`.
   - All other roles: do nothing (falls back to static config).
   - `.catch(() => {})` — silently ignore failures.

3. Change the `proactiveConfig` prop passed to `ConciergePanel` from `getProactiveConfig(pathname, currentUser.role)` to `homeProactive ?? getProactiveConfig(pathname, currentUser.role)`.

Add `differenceInDays` to the date-fns import (or use a manual `(new Date(a.dueAt) - new Date()) / 86400000 < 7` check if date-fns import causes issues).

## Feature F — Faculty analytics sub-badges, session/score columns, last active

Read `app/analytics/faculty/page.tsx` first. The file uses a hardcoded `STUDENTS` array. Each student has:
- `flags: string[]` — may include `'disengagement'` and `'grade_drop'`
- `sessions: number` — session count
- `current: number` — current avg score
- `lastActive: string` — pre-formatted string like "2 hours ago"

Make 3 localized edits:

**F1 — Sub-badges:** Find where the student status badge (`at_risk` / `on_track` / `exceeding`) is rendered. Add two conditional chips immediately after it: amber "Engagement ↓" chip when `flags.includes('disengagement')`, red "Grade ↓" chip when `flags.includes('grade_drop')`.

**F2 — Sessions + score:** In the student row or expanded detail panel, add two small text items alongside existing stats: "{student.sessions} sessions" and "Avg: {student.current}%".

**F3 — Last active:** In the student detail section, add "Last active: {student.lastActive}" as a small gray label. The value is already a formatted string — render it directly.

Do NOT modify the amber simulated-data disclosure banner. Do NOT change any STUDENTS data values. Do NOT wire this page to any API.

## Verification (run in this order)

1. `cd "c:/AA Code/Educator marketplace/the-sandbox" && npm run lint`
2. `npx tsc --noEmit`
3. Confirm both pass with 0 errors.
4. Report: "Phase 3 complete — Data Elevation initiative fully deployed. Files changed: [list]"

This is the final phase. Do not suggest additional features or refactors. Do not touch any file not listed above.
```

---

## 6. Post-Initiative Verification

After all three phases are deployed, run the full build and do a final role-matrix walkthrough:

```bash
cd "c:/AA Code/Educator marketplace/the-sandbox"
npm run lint && npx tsc --noEmit && npm run build
```

**Final role-matrix spot check:**

| Role | User | Page | What to verify |
|---|---|---|---|
| ADMIN | bob.dipaola@uky.edu | `/analytics/platform` | Platform analytics page loads with real data |
| ADMIN | admin@uky.edu | `/` | No data-grounded Sandy proactive (admin path has no handler) — static fallback only |
| EDUCATOR | heath.price@uky.edu | `/` | Sandy fires at-risk message; at-risk rows have mail icons; course health rows show "not started"; activity feed shows top/bottom tool chips |
| EDUCATOR | heath.price@uky.edu | `/analytics/faculty` | Sub-badges on Devon Carter; session/score columns visible; last active shown; amber banner present |
| STUDENT | ian.mcclure.student@uky.edu | `/` | Sandy fires assignments-due message if he has due-this-week assignments; urgency colors on Due Soon cards |
| STUDENT | ian.mcclure.student@uky.edu | `/analytics/platform` | Redirected to `/` (not an admin) |

**Update CLAUDE.md sprint history** after all phases pass with this entry:

```
| 2026-03-XX | **Data Elevation Sprint (6 features, 3 phases)** — Wired existing API data to UI with zero schema changes. Built missing `/analytics/platform` page (API was complete). Added email quick-action to at-risk rows. Assignment urgency color-coding (red/amber by dueAt). Not-started count + top/bottom tool chips on educator dashboard. Data-grounded Sandy proactives on `/` (student assignments-due, educator at-risk). Faculty analytics sub-badges (Engagement ↓, Grade ↓), sessions/score columns, last-active labels. Build clean, 0 TS errors. | ✅ Complete |
```
