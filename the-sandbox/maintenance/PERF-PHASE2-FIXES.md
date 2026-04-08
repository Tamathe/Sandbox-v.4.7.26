# Performance Optimization — Phase 2 Fix Plan

> **Context**: A full performance audit was completed. This document is a self-contained
> instruction set for a new Claude Code session to execute all fixes.
> Run `CLAUDE.md` first for project conventions, then follow this file top-to-bottom.

**Ground rules**:
- Read each file before editing it.
- Don't add comments, docstrings, or type annotations beyond what's needed for the fix.
- Don't refactor surrounding code — surgical fixes only.
- Run `npx tsc --noEmit` after each category to catch type errors before moving on.
- Run `npm run build` once at the very end.

---

## Category 1 — Lucide Wildcard Imports (5 files, ~200 KB savings)

**Problem**: `import * as LucideIcons from 'lucide-react'` pulls in the entire icon
library (~500 icons, ~200 KB). These files use dynamic icon lookup by name string.

**Fix pattern**: Replace the namespace import with an explicit icon map containing
only the icons actually referenced in the file's data/props. Example:

```tsx
// BEFORE
import * as LucideIcons from 'lucide-react'
const Icon = LucideIcons[tool.icon as keyof typeof LucideIcons] as LucideIcons.LucideIcon

// AFTER
import { BookOpen, Zap, Brain, type LucideIcon } from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen, Zap, Brain, /* ...only icons actually used */
}
const Icon = ICON_MAP[tool.icon] ?? BookOpen  // fallback to a sensible default
```

**Files to fix** (read each first to find which icon names are used):

| File | Notes |
|------|-------|
| `app/components/CollectionGallery.tsx` | Icons come from collection items' `icon` field. Check what icons the seed/creation code assigns. |
| `app/write-room/[slug]/page.tsx` | Icons from tool config. |
| `app/data-desk/[slug]/page.tsx` | Icons from tool config. |
| `app/wellness-hub/[slug]/page.tsx` | Icons from tool config. |
| `app/meeting-machine/[slug]/page.tsx` | Icons from tool config. |

**How to find which icons are needed**: For the `[slug]` pages, the icon names come
from the `tool.icon` field in the database. Search the seed scripts and any tool-creation
API routes/UI to find all possible icon values. Also grep for `icon:` in seed files
and tool-builder components. If the set is large or unbounded (user-chosen), use a
lazy-loading pattern instead:

```tsx
import dynamic from 'next/dynamic'
import { type LucideIcon } from 'lucide-react'
import { Sparkles } from 'lucide-react'  // fallback

// If truly dynamic/user-chosen icons, lazy-load from a curated set:
const ICON_LOADER: Record<string, () => Promise<{ default: LucideIcon }>> = {
  BookOpen: () => import('lucide-react').then(m => ({ default: m.BookOpen })),
  // ... enumerate all possible tool icons
}
```

But the explicit map is strongly preferred if the icon set is bounded (< 50 icons).

---

## Category 2 — Recharts Dynamic Imports (10 files, ~100 KB savings)

**Problem**: Recharts is imported statically in 10 components. It's ~100 KB gzipped
and only needed when charts are visible (often below fold, in collapsed panels, or
on admin-only pages).

**Fix pattern**: Extract the chart into its own file, then dynamically import it.

```tsx
// BEFORE — in SomeComponent.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export function SomeComponent({ data }) {
  return (
    <div>
      <h2>Analytics</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>...</BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// AFTER — split into two files:

// SomeComponentChart.tsx (new file, "use client" at top)
'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
export function SomeComponentChart({ data }: { data: DataType[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>...</BarChart>
    </ResponsiveContainer>
  )
}

// SomeComponent.tsx (import dynamically)
import dynamic from 'next/dynamic'
const SomeComponentChart = dynamic(
  () => import('./SomeComponentChart').then(m => m.SomeComponentChart),
  { ssr: false, loading: () => <div className="h-[300px] animate-pulse rounded-xl bg-sand-100" /> }
)
```

If the chart is small and inline (< 30 lines of JSX), you can keep it in the same
file and just wrap the recharts import:

```tsx
import dynamic from 'next/dynamic'

const LazyBarChart = dynamic(
  () => import('recharts').then(m => m.BarChart),
  { ssr: false }
)
// ... same for other recharts components
```

**Files to fix**:

| File | Chart type | Notes |
|------|-----------|-------|
| `app/admin/compliance-reports/page.tsx` | AreaChart | Admin page, low traffic |
| `app/components/admin-home/PlatformPulseCards.tsx` | AreaChart | Dashboard card |
| `app/components/courses/course-map/AnalyticsSummary.tsx` | BarChart | In course map tab |
| `app/components/courses/course-map/SidePanels.tsx` | BarChart | In collapsible side panel |
| `app/components/crisis-comms/reputation-pulse/SpreadTimeline.tsx` | AreaChart | Crisis comms feature |
| `app/components/exam-forge/ConceptBreakdown.tsx` | BarChart | Exam analysis |
| `app/components/StudyBuddyInterface.tsx` | BarChart | 3500-line file — extract chart section |
| `app/components/workshop/EngagementTrendCard.tsx` | AreaChart | Workshop analytics |
| `app/hub/s/[slug]/settings/analytics/page.tsx` | BarChart | Hub settings |
| `app/registrar/analytics/page.tsx` | BarChart + PieChart | Most complex — 10 recharts imports |

---

## Category 3 — Cache Headers on API GET Routes

**Problem**: 50+ GET API routes return responses with no `Cache-Control` header.
Every browser request hits the server and database, even for data that changes slowly.

**Fix**: Add cache headers to GET responses based on data volatility. The project
already uses `withErrorHandling` wrapper — you do NOT need to create a new wrapper.
Just add headers to the `NextResponse.json()` call.

**Cache tiers**:

| Tier | `Cache-Control` value | Applies to |
|------|----------------------|------------|
| **Stable** (changes rarely) | `public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400` | Programs, frameworks, campus buildings, competency definitions |
| **Moderate** (changes daily) | `public, max-age=300, s-maxage=600, stale-while-revalidate=3600` | Course lists, tool lists, enrollment lists, news/articles |
| **Fresh** (changes per-session) | `private, max-age=60, stale-while-revalidate=300` | User profile, dashboard, analytics, notifications |
| **No cache** | Don't add headers | All POST/PUT/PATCH/DELETE, real-time streams, Sandy chat |

**Example**:
```tsx
// In a GET handler:
return NextResponse.json(data, {
  headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' }
})
```

**Key routes to prioritize** (highest traffic):
- `app/api/courses/route.ts` (GET) → Moderate
- `app/api/user/me/route.ts` (GET) → Fresh
- `app/api/campus-map/buildings/route.ts` (GET) → Stable
- `app/api/news/sources/route.ts` (GET) → Moderate
- `app/api/registrar/programs/route.ts` (GET) → Stable
- `app/api/tools/route.ts` (GET) → Moderate
- `app/api/enrollments/route.ts` (GET) → Moderate

Scan all `app/api/**/route.ts` files for `export const GET` handlers and apply the
appropriate tier. Skip routes that return user-specific mutation results or streams.

---

## Category 4 — ISR (Incremental Static Regeneration)

**Problem**: Zero pages export `revalidate`. All pages are fully dynamic, even
stable/public pages.

**Fix**: Add `export const revalidate = N` to stable page files.

| Page file | `revalidate` value | Rationale |
|-----------|-------------------|-----------|
| `app/(public)/site/[slug]/page.tsx` | `3600` | Personal sites rarely change |
| `app/(public)/site/[slug]/layout.tsx` | `3600` | (if layout exists, set here too) |

**Note**: Most pages in this app are behind auth and use dynamic data, so ISR
applicability is limited. Only add it to genuinely public/stable pages. Do NOT
add revalidate to pages under `app/(main)/` or `app/(pages)/` — those are
authenticated and dynamic.

---

## Category 5 — N+1 Query Fixes (6 API routes)

### 5A. `app/api/cron/send-scheduled-communications/route.ts`

**Problem**: Loops over due communications, calling `update()` and `create()` per item.

**Fix**:
```tsx
// BEFORE: loop with individual updates
for (const comm of due) {
  await prisma.staffCommunication.update({ where: { id: comm.id }, data: { status: 'sent', sentAt: now } })
  await prisma.assistantActionLog.create({ data: { ... } })
}

// AFTER: batch operations in a transaction
await prisma.$transaction([
  prisma.staffCommunication.updateMany({
    where: { id: { in: due.map(c => c.id) } },
    data: { status: 'sent', sentAt: now },
  }),
  ...due.map(comm =>
    prisma.assistantActionLog.create({ data: { /* same as before, using comm */ } })
  ),
])
```

If `assistantActionLog` fields are identical per comm, use `createMany` instead.

### 5B. `app/api/cron/mei-refresh/route.ts`

**Problem**: Students within each assignment are processed sequentially.

**Fix**: Parallelize the inner loop:
```tsx
// BEFORE
for (const enrollment of enrollments) {
  await computeMEI(enrollment, assignment)
}

// AFTER
await Promise.all(enrollments.map(enrollment => computeMEI(enrollment, assignment)))
```

Keep the outer chunking (3 assignments at a time) to avoid overwhelming the DB.

### 5C. `app/api/avatar/deploy/route.ts`

**Problem**: Loop over docs with `create()` + `update()` per doc.

**Fix**: Batch `createMany()` for course materials, then batch vector upserts.
Read the file first — the exact structure depends on how the vector store works.

### 5D. `app/api/courses/[id]/seed-misconceptions/route.ts`

**Problem**: Per misconception: 2x `findFirst()` + 1x `executeRawUnsafe()` = 3N queries.

**Fix**:
1. Batch-fetch all concept entities upfront: `findMany({ where: { courseId, type: 'concept' } })`
2. Build a lookup map: `Map<name, entity>`
3. Batch-create missing entities with `createMany()`
4. Batch raw SQL for edge insertions (single `INSERT ... VALUES (...), (...), ...`)

### 5E. `app/api/staff/survey-intelligence/projects/route.ts`

**Problem**: Template questions created one-by-one in a loop, then redundant refetch.

**Fix**:
```tsx
// BEFORE
for (const q of template.questions) {
  await prisma.surveyQuestion.create({ data: { ... } })
}
const result = await prisma.surveyProject.findUniqueOrThrow({ ... })

// AFTER
await prisma.surveyQuestion.createMany({
  data: template.questions.map((q, i) => ({
    projectId: project.id,
    questionNumber: i + 1,
    questionText: q.text,
    questionType: q.type,
  })),
})
// Return project directly — no refetch needed
// Or if you need questions included, use a single findUnique with include
```

### 5F. `app/api/cron/process-sandy-tasks/route.ts`

**Problem**: 5 tasks updated and processed sequentially.

**Fix**: `updateMany()` for initial status change, then `Promise.all()` for AI processing.

---

## Category 6 — Prisma `select` Optimizations (4 routes)

Read each file, identify which fields the route handler actually uses from the
query result, then add a `select` clause with only those fields.

| File | Model | Fields likely needed |
|------|-------|---------------------|
| `app/api/courses/route.ts` | `Course` | `id, courseCode, title, instructorId, isPublic, createdAt` (exclude `description` and other text blobs for list view) |
| `app/api/analytics/student/route.ts` | `StudentProfile` | `riskScore, learningVelocity, preferredModality, peakEngagementHour, topConceptsThisWeek, avgSessionLength, lastSessionAt` |
| `app/api/registrar/degree-audit/route.ts` | `DegreeAuditResult` | Exclude heavy `auditResults` JSON on list view — only include on detail view |
| `app/api/cron/send-scheduled-communications/route.ts` | `StaffCommunication` | Only fields needed for sending: `id, status, scheduledFor, authorId, subject, type, audienceDesc` |

**Important**: When adding `select`, you must include any field that the code
accesses after the query. Read the full handler to be sure. Missing a field will
cause a runtime error.

---

## Category 7 — `<img>` to `<Image>` Conversion (6 instances)

**Problem**: Native `<img>` tags bypass Next.js image optimization (no WebP, no
lazy loading, no responsive sizing).

**Fix pattern**:
```tsx
// BEFORE
<img src={user.avatarUrl} alt={user.name} className="size-full rounded-full object-cover" />

// AFTER
import Image from 'next/image'
<Image
  src={user.avatarUrl || '/default-avatar.png'}
  alt={user.name}
  width={40}
  height={40}
  className="size-full rounded-full object-cover"
/>
```

For avatar URLs that come from external sources, you may need to add the domain
to `next.config.ts` under `images.remotePatterns`. Check the existing config first.

**Files**:
| File | Line(s) | Element |
|------|---------|---------|
| `app/components/messages/GroupSettingsModal.tsx` | 398, 437 | User avatars |
| `app/components/messages/ConversationList.tsx` | 44 | Contact avatar |
| `app/components/hub/DepartmentCard.tsx` | 30 | Department logo |
| `app/messages/[groupId]/page.tsx` | 114, 1593 | Message author avatars |

**Note**: If avatars are base64 data URIs or blob URLs, keep `<img>` — `next/image`
doesn't optimize those. Read the file to check the `src` value pattern.

---

## Category 8 — Remove Unnecessary `"use client"` (2 confirmed files)

| File | Reason it's unnecessary |
|------|------------------------|
| `app/components/PageHeader.tsx` | Pure presentational — just renders props (title, subtitle, action, children). No hooks, no event handlers, no browser APIs. |
| `app/components/Button.tsx` | Renders icon + text from props with conditional logic. No hooks. If it accepts `onClick` as a prop, that's fine — server components can pass event handler props to client children. **However**: verify it doesn't use `useRouter` or `usePathname` before removing. |

**Verify before removing**: Read the file, confirm zero use of `useState`, `useEffect`,
`useRef`, `useCallback`, `useMemo`, `useReducer`, `useContext`, `useRouter`,
`usePathname`, `useSearchParams`, `window`, `document`, `localStorage`, or any
custom hook. If clean, delete the `'use client'` line.

---

## Category 9 — React.memo on Heavy Components

**Problem**: Zero components in the codebase use `React.memo`. This means every
parent re-render cascades through the entire subtree.

**Target**: Only memoize components that are:
1. Expensive to render (charts, large lists, complex layouts), AND
2. Receive props that don't change on most parent re-renders

**Do NOT blanket-memo everything** — that adds overhead. Target these specific
components:

| Component file | Why |
|---------------|-----|
| `app/components/admin-home/PlatformPulseCards.tsx` | Contains charts, re-renders on any admin dashboard state change |
| `app/components/admin-home/ComplianceRadar.tsx` | Complex compliance viz |
| `app/components/admin-home/ActionPriorityQueue.tsx` | List of action items |
| `app/components/courses/course-map/AnalyticsSummary.tsx` | Chart in course map |
| `app/components/courses/course-map/SidePanels.tsx` | 856-line panel with charts |

**Fix pattern**:
```tsx
// BEFORE
export function PlatformPulseCards({ data }: Props) { ... }

// AFTER
import { memo } from 'react'
export const PlatformPulseCards = memo(function PlatformPulseCards({ data }: Props) { ... })
```

---

## Verification Checklist

After all fixes, run in order:

```bash
npx tsc --noEmit          # Must pass with zero errors
npm run lint              # Must pass
npm run build             # Must succeed — this is the final gate
```

If `npm run build` fails on an image domain issue (from Category 7), add the
domain to `images.remotePatterns` in `next.config.ts`.
