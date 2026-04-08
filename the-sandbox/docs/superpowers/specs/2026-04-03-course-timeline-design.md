# Course Timeline — Design Spec

**Date:** 2026-04-03
**Status:** Approved
**Location:** Course Overview tab (student view), top banner

---

## Overview

A horizontal course timeline embedded at the top of the Course Overview tab. Shows the full semester structure with assignment due dates, week boundaries, and a "today" marker. Students see where they are in the course at a glance, with status-aware markers indicating submitted, upcoming, due-soon, and overdue items. Clicking an item opens a slide-out detail panel with actions including "Ask Sandy."

## Goals

1. Give students immediate temporal context when they open a course ("Where am I?")
2. Surface assignment status at a glance without navigating to the Assignments tab
3. Enable contextual interaction — click a timeline item to view details, submit, or get Sandy help
4. Low cognitive overhead — single happy path, no configuration needed

## Non-Goals

- Cross-course semester timeline (this is per-course only)
- Educator/admin authoring view (they use Weekly Plan tab)
- Mastery gates, Commons sessions, or virtual clinic encounters on the timeline (future extension)
- Persistent XP/gamification of any kind

---

## Data Model

No new Prisma models. Reads from existing schema:

### Source Models

| Model | Fields Used | Purpose |
|---|---|---|
| `CourseWeek` | `weekNumber`, `title`, `startDate`, `endDate`, `orderIndex` | Week bands on the timeline track |
| `Assignment` | `id`, `title`, `category`, `type`, `dueAt`, `pointsPossible`, `isPublished`, `rubricId`, `weekId` | Items plotted on the timeline |
| `Submission` | `submittedAt`, `assignmentId`, `studentId` | Determines submitted/graded status |
| `GradebookEntry` | `aiScore`, `facultyScore`, `status` | Score display on graded items |

### Derived Types

```typescript
type TimelineItemStatus = 'submitted' | 'graded' | 'upcoming' | 'due-soon' | 'overdue'

interface TimelineItem {
  id: string
  title: string
  category: string          // homework | quiz | exam | project | paper | etc.
  type: AssignmentType
  dueAt: string             // ISO date
  pointsPossible: number | null
  status: TimelineItemStatus
  score: number | null       // from GradebookEntry if graded
  weekNumber: number | null  // from weekId relation
  hasRubric: boolean         // true if rubricId is set (detail panel fetches rubric on demand)
  submittedAt: string | null // ISO date if submitted
}

interface TimelineWeek {
  weekNumber: number
  title: string
  startDate: string | null   // ISO date
  endDate: string | null     // ISO date
}

interface CourseTimelineData {
  weeks: TimelineWeek[]
  items: TimelineItem[]
  currentWeek: number        // computed from today vs week date ranges
  semesterStart: string      // earliest week startDate
  semesterEnd: string        // latest week endDate
}
```

### Status Computation (server-side)

```
if submission exists AND gradebook entry exists → 'graded'
if submission exists → 'submitted'
if dueAt < now → 'overdue'
if dueAt < now + 48 hours → 'due-soon'
else → 'upcoming'
```

Only `isPublished: true` assignments are returned.

---

## API

### `GET /api/courses/[id]/timeline`

**Auth:** `requireRequestUser` — must be enrolled student or course owner
**Query params:** None
**Returns:** `CourseTimelineData`

**Implementation:** New service function `getCourseTimeline(courseId, userId)` in `app/lib/courses/timeline-service.ts`.

Query plan:
1. Fetch `CourseWeek` records for the course (ordered by `orderIndex`)
2. Fetch `Assignment` records where `courseId` matches, `isPublished: true`, `dueAt` is not null
3. Left join `Submission` for the requesting student on each assignment
4. Left join `GradebookEntry` on submissions
5. Compute status for each item
6. Compute `currentWeek` by finding which week range contains today
7. Compute `semesterStart` / `semesterEnd` from week boundaries

Single Prisma query with includes, no N+1.

**Route file:** `app/api/courses/[id]/timeline/route.ts` — thin handler following standard pattern:
```typescript
export const GET = withErrorHandling(async (req: NextRequest, { params }) => {
  const user = await requireRequestUser(req)
  if (isAuthFailure(user)) return user.response
  const { id } = await params
  const data = await getCourseTimeline(id, user.id)
  return NextResponse.json(data)
})
```

---

## Components

All in `app/components/courses/`.

### `CourseTimeline.tsx` — Main Container

**Props:** `courseId: string`
**Responsibilities:**
- Fetches `GET /api/courses/{courseId}/timeline` via `apiFetch` with AbortController cleanup
- Loading state: `LoadingSpinner` (inline, small)
- Error state: `ErrorBanner` with retry
- Empty state: graceful — if no weeks or no assignments with dates, don't render at all
- Responsive breakpoint: `< 640px` renders `TimelineChip`, `>= 640px` renders `TimelineTrack`
- Manages selected item state, renders `TimelineDetailPanel` when an item is selected

**Integration:** Imported into the course Overview tab rendering inside `app/courses/page.tsx`. Placed as first child of the overview content area, above the existing `ThisWeekCard`.

### `TimelineTrack.tsx` — Horizontal Visual

**Props:**
- `weeks: TimelineWeek[]`
- `items: TimelineItem[]`
- `currentWeek: number`
- `semesterStart: string`
- `semesterEnd: string`
- `onItemSelect: (item: TimelineItem) => void`
- `selectedItemId: string | null`

**Pure presentational.** No data fetching.

**Layout:**
- Outer: `h-20 bg-white border-b border-gray-200 overflow-x-auto scroll-smooth` with hidden scrollbar (CSS)
- Inner: width computed from week count (`weeks.length * 120px`, min 800px)
- Horizontal line: `absolute h-[3px] bg-gray-200 rounded-full` at vertical center
- Week bands: alternating `bg-gray-50` / transparent backgrounds, week number labels (`text-xs text-gray-400`) below the line
- Today marker: `absolute w-[2px] bg-[#0033A0]` full height, `"TODAY"` label above (`text-[10px] font-bold text-[#0033A0]`)
- Assignment dots: `size-3` circles, `border-2 border-white shadow-sm`, positioned by computing `(dueAt - semesterStart) / (semesterEnd - semesterStart) * 100%` left offset

**Dot colors:**
- `submitted` → `bg-green-500`
- `graded` → `bg-green-500` + score badge below
- `upcoming` → `bg-gray-400`
- `due-soon` → `bg-amber-500` + pulse animation
- `overdue` → `bg-red-500`

**Interactions:**
- Hover: dot scales to `size-4` via `transition-transform`, tooltip above with title + relative date
- Click: dot gets `ring-2 ring-[#0033A0] ring-offset-1`, calls `onItemSelect`
- Scroll: on mount, `scrollLeft` set so today marker sits at ~35% from left edge via `useEffect` + `ref.current.scrollTo()`

**Accessibility:**
- `role="img"` on outer container with `aria-label="Course timeline"`
- Each dot is a `<button>` with `aria-label="{title}, {status}, due {date}"`
- Today marker has `aria-current="date"`

### `TimelineDetailPanel.tsx` — Slide-Out Panel

**Props:**
- `item: TimelineItem | null`
- `courseId: string`
- `onClose: () => void`

**Layout:**
- `fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-lg z-40`
- Slide-in animation: `translate-x-full → translate-x-0` via `transition-transform duration-200`
- Close on X button, Escape key, or backdrop click

**Content (top to bottom):**
1. **Header:** Category icon (lucide-react, mapped from `category`) + assignment title (`font-extrabold`) + X close button
2. **Meta row:** Due date (relative + absolute), category pill badge, points if set
3. **Status badge:** Colored pill matching timeline dot status
4. **Rubric preview:** If `hasRubric` is true, panel fetches rubric on demand via existing `GET /api/assignments/{id}` endpoint. Collapsible section showing criteria names + band labels
5. **Submission info:** If submitted — submission date. If graded — score display.
6. **Actions (sticky bottom):**
   - "View Assignment" button → navigates to Assignments tab filtered to this item (`?tab=assignments&assignment={id}`)
   - "Ask Sandy" button → dispatches `sandy-prefill` CustomEvent with context: `"Help me prepare for ${item.title} which is due ${item.dueAt}"` (same pattern as `BeaconCard` study CTA, `autoSend: true`)

### `TimelineChip.tsx` — Mobile Summary

**Props:**
- `weeks: TimelineWeek[]`
- `items: TimelineItem[]`
- `currentWeek: number`
- `onItemSelect: (item: TimelineItem) => void`

**Chip display:**
- `rounded-full bg-gray-50 border border-gray-200 px-4 py-2 text-sm`
- Text: `"Week {currentWeek} of {weeks.length} — {nextDueTitle} due {relativeDate}"`
- If any overdue items: `border-red-300 bg-red-50 text-red-700`
- If next item due within 48h: `border-amber-300 bg-amber-50 text-amber-700`
- Tap → opens bottom sheet

**Bottom sheet (expanded):**
- Fixed bottom overlay, `rounded-t-2xl bg-white shadow-2xl`, max-height 60vh, scrollable
- Header: "Upcoming" + close X
- Vertical list of next 5 items (sorted by `dueAt`):
  - Status dot (same colors) + title + relative date + category badge
  - Tap item → calls `onItemSelect` → opens `TimelineDetailPanel`

---

## Sandy Integration

- **Detail panel "Ask Sandy" button:** Dispatches `sandy-prefill` event (CustomEvent on `window`) with assignment context. Sandy receives: assignment title, due date, category, course name. Same event pattern used by `BeaconCard.tsx` study CTA.
- **Concierge page context:** Add timeline awareness to `PAGE_DESCRIPTIONS` for `/courses` — Sandy knows the student is viewing a course with timeline context.
- **No new Sandy agent tools** — the existing course/assignment context in Sandy's system prompt is sufficient.

---

## Styling

All Tailwind v4 utility classes in JSX. No `@apply`. No custom CSS file needed except one `@keyframes` for the pulse animation (can reuse existing pulse if defined, otherwise add to `globals.css`).

Icons: `lucide-react` only. Category icon mapping:
- homework → `FileText`
- quiz → `HelpCircle`
- exam → `GraduationCap`
- project → `Folder`
- paper → `BookOpen`
- presentation → `Presentation`
- lab → `FlaskConical`
- discussion → `MessageSquare`
- participation → `Users`
- other → `Circle`

Date formatting: `date-fns` (`formatDistanceToNow`, `format`, `isWithinInterval`, `differenceInHours`).

---

## File Summary

| File | Type | Purpose |
|---|---|---|
| `app/lib/courses/timeline-service.ts` | Service | `getCourseTimeline(courseId, userId)` — query + status computation |
| `app/api/courses/[id]/timeline/route.ts` | API Route | Thin GET handler |
| `app/components/courses/CourseTimeline.tsx` | Component | Container — fetch, responsive switch, state |
| `app/components/courses/TimelineTrack.tsx` | Component | Horizontal visual — dots, line, weeks, today marker |
| `app/components/courses/TimelineDetailPanel.tsx` | Component | Slide-out panel — details + actions |
| `app/components/courses/TimelineChip.tsx` | Component | Mobile chip + bottom sheet |

**Modified files:**
| File | Change |
|---|---|
| `app/courses/page.tsx` | Import and render `<CourseTimeline>` at top of Overview tab content |

---

## Edge Cases

1. **No weeks with dates:** Timeline doesn't render. Falls back to existing Overview content only.
2. **No assignments with `dueAt`:** Timeline renders week bands only, no dots. Still useful for temporal orientation.
3. **All assignments in the past:** Today marker renders to the right of all dots. "You're past all due dates" implicit.
4. **Course hasn't started yet:** Today marker renders to the left. All items are upcoming/gray.
5. **Assignments on same date:** Dots stack vertically (offset by 8px) to avoid overlap. Max 3 visible, "+N more" indicator if > 3.
6. **Very short course (1-2 weeks):** Minimum inner width of 800px ensures dots aren't crammed.
7. **Very long course (20+ weeks):** Inner width scales, horizontal scroll handles it naturally.

---

## Not In Scope (Future Extensions)

- Mastery gate markers on the timeline
- Commons session markers
- Virtual clinic encounter markers
- Cross-course unified semester timeline
- Educator-facing "edit dates on timeline" drag interaction
- Timeline-based Sandy proactive nudges (could wire into existing proactive-suggestions.ts later)
