# Courses Page Redesign — Phase 4: New Dashboard Widgets

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four new widgets — RecentGrades (student), WeeklyScheduleWidget (student), SetupChecklist (educator), EngagementSnapshot (educator) — and a `useSemesterPhase` hook that makes the educator dashboard phase-aware (Setup / Active / Late).

**Architecture:** Each widget is a self-contained component that fetches its own data via existing API endpoints. The `useSemesterPhase` hook reads course-map + materials data to determine which educator widgets to show. The student dashboard gains two new `WidgetHalf` cards. The educator dashboard restructures its widget order based on detected phase.

**Tech Stack:** React 19, Next.js 16, TypeScript, Tailwind v4, lucide-react icons, existing API routes (no new endpoints)

**Date:** 2026-04-04
**Status:** Ready to execute
**Prereq:** Phase 3 complete — dashboards use `DashboardGrid`/`DashboardWidget` widget layout
**Design spec:** `docs/superpowers/specs/2026-04-04-courses-page-redesign-design.md`

---

## Current State (after Phase 3)

```
app/components/courses/DashboardGrid.tsx     — DashboardGrid, WidgetFull, WidgetHalf
app/components/courses/DashboardWidget.tsx   — standardized card wrapper (collapsible, icon, action slot)
app/components/courses/CollapsibleSection.tsx — shared collapsible (used in non-dashboard tabs)
app/courses/StudentCourseView.tsx            — Dashboard tab: DashboardGrid with ThisWeek, Timeline,
                                               StudyGuide, CourseContent, YourProgress, TeachBack, StudyPartners
app/courses/EducatorCourseView.tsx           — Dashboard tab: DashboardGrid with SyllabusStatus,
                                               PolicySummary, Materials, LearningPath, LectureDebriefs,
                                               OfficeHours, Progress
```

### Existing APIs used by new widgets (no new endpoints needed)

| Endpoint | Returns | Used by |
|----------|---------|---------|
| `GET /api/courses/[id]/my-grades` | Array of `{ aiScore, facultyScore, submission: { assignment: { title, pointsPossible, dueAt } } }` | RecentGrades |
| `GET /api/courses/[id]/course-map` | `{ courseMap: { weeks: [{ weekNumber, title, startDate, endDate, materials, objectives, assignments }] } }` | WeeklyScheduleWidget, useSemesterPhase |
| `GET /api/courses/[id]/syllabus-status` | `{ hasParseJob, hasCourseMap, assignmentCount, objectiveCount, unitCount }` | SetupChecklist |
| `GET /api/courses/[id]/materials` | Array of materials (already loaded by `useCourseDetail`) | SetupChecklist, useSemesterPhase |
| `GET /api/courses/[id]/tools` | Array of linked tools (already loaded by `useCourseDetail`) | SetupChecklist |

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| **Create** | `app/hooks/useSemesterPhase.ts` | Detect Setup/Active/Late phase from course-map + materials data |
| **Create** | `app/components/courses/RecentGradesWidget.tsx` | Student widget: last 3 graded items with scores |
| **Create** | `app/components/courses/WeeklyScheduleWidget.tsx` | Student widget: current week's assignments + due dates |
| **Create** | `app/components/courses/SetupChecklist.tsx` | Educator widget: course setup progress with CTAs |
| **Create** | `app/components/courses/EngagementSnapshot.tsx` | Educator widget: submission/tool/discussion summary cards |
| **Modify** | `app/courses/StudentCourseView.tsx` | Add RecentGrades + WeeklySchedule widgets to dashboard grid |
| **Modify** | `app/courses/EducatorCourseView.tsx` | Phase-aware dashboard: show Setup or Active/Late widget sets |

---

## Step-by-Step Implementation

### Step 1: Create `useSemesterPhase` hook

**File:** `app/hooks/useSemesterPhase.ts`

This hook determines the educator dashboard's phase: **Setup**, **Active**, or **Late**.

- [ ] **Step 1.1: Create the hook file**

```typescript
// app/hooks/useSemesterPhase.ts
'use client'

import { useEffect, useState } from 'react'

export type SemesterPhase = 'setup' | 'active' | 'late'

interface CourseMapWeek {
  weekNumber: number
  title: string
  startDate: string | null
  endDate: string | null
}

interface UseSemesterPhaseOptions {
  courseId: string
  userEmail: string
  materialsCount: number
  hasCourseMap: boolean
}

export function useSemesterPhase({
  courseId,
  userEmail,
  materialsCount,
  hasCourseMap,
}: UseSemesterPhaseOptions): SemesterPhase {
  const [weeks, setWeeks] = useState<CourseMapWeek[]>([])

  useEffect(() => {
    if (!hasCourseMap) return
    const controller = new AbortController()
    fetch(`/api/courses/${courseId}/course-map`, {
      headers: { 'x-demo-user-email': userEmail },
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: { courseMap?: { weeks?: CourseMapWeek[] } }) => {
        if (data.courseMap?.weeks) setWeeks(data.courseMap.weeks)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [courseId, userEmail, hasCourseMap])

  // Phase detection logic
  if (!hasCourseMap || materialsCount < 3) return 'setup'

  const now = new Date()
  const datedWeeks = weeks.filter((w) => w.startDate && w.endDate)
  if (datedWeeks.length === 0) return 'active'

  const allStartDates = datedWeeks.map((w) => new Date(w.startDate!).getTime())
  const allEndDates = datedWeeks.map((w) => new Date(w.endDate!).getTime())
  const semesterStart = Math.min(...allStartDates)
  const semesterEnd = Math.max(...allEndDates)
  const totalDuration = semesterEnd - semesterStart
  if (totalDuration <= 0) return 'active'

  const elapsed = now.getTime() - semesterStart
  const progress = elapsed / totalDuration

  if (progress < 0) return 'setup'
  if (progress >= 0.75) return 'late'
  return 'active'
}
```

- [ ] **Step 1.2: Verify TypeScript compiles**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | head -20`

Expected: no errors related to `useSemesterPhase`

---

### Step 2: Create `RecentGradesWidget.tsx`

**File:** `app/components/courses/RecentGradesWidget.tsx`

Shows the student's last 3-5 graded items with scores. Fetches from `GET /api/courses/[id]/my-grades`.

- [ ] **Step 2.1: Create the widget**

```typescript
// app/components/courses/RecentGradesWidget.tsx
'use client'

import { useEffect, useState } from 'react'

interface GradeItem {
  id: string
  aiScore: number | null
  facultyScore: number | null
  status: string
  submission: {
    submittedAt: string | null
    assignment: {
      title: string
      pointsPossible: number
    }
  }
}

interface RecentGradesWidgetProps {
  courseId: string
  userEmail: string
  onSwitchToAssignments: () => void
}

export default function RecentGradesWidget({
  courseId,
  userEmail,
  onSwitchToAssignments,
}: RecentGradesWidgetProps) {
  const [grades, setGrades] = useState<GradeItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    fetch(`/api/courses/${courseId}/my-grades`, {
      headers: { 'x-demo-user-email': userEmail },
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: GradeItem[]) => {
        // Show only graded items (have a score), most recent first, limit 5
        const graded = (Array.isArray(data) ? data : [])
          .filter((g) => g.facultyScore !== null || g.aiScore !== null)
          .slice(0, 5)
        setGrades(graded)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [courseId, userEmail])

  if (loading) {
    return <p className="text-sm text-gray-400 animate-pulse">Loading grades...</p>
  }

  if (grades.length === 0) {
    return <p className="text-sm text-gray-500">No graded work yet.</p>
  }

  return (
    <div className="space-y-2">
      {grades.map((g) => {
        const score = g.facultyScore ?? g.aiScore ?? 0
        const max = g.submission.assignment.pointsPossible
        const pct = max > 0 ? Math.round((score / max) * 100) : 0
        return (
          <div key={g.id} className="flex items-center justify-between text-sm">
            <span className="truncate text-gray-700">{g.submission.assignment.title}</span>
            <span className={`font-semibold tabular-nums ${pct >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
              {score}/{max}
            </span>
          </div>
        )
      })}
      <button
        type="button"
        onClick={onSwitchToAssignments}
        className="mt-1 text-xs font-semibold text-[#0033A0] hover:underline"
      >
        View all grades
      </button>
    </div>
  )
}
```

- [ ] **Step 2.2: Verify TypeScript compiles**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | head -20`

Expected: no errors

---

### Step 3: Create `WeeklyScheduleWidget.tsx`

**File:** `app/components/courses/WeeklyScheduleWidget.tsx`

Shows the current week's node titles + due dates as a compact list. Reads the same `/api/courses/[id]/course-map` endpoint that `ThisWeekCard` uses.

- [ ] **Step 3.1: Create the widget**

```typescript
// app/components/courses/WeeklyScheduleWidget.tsx
'use client'

import { useEffect, useState } from 'react'

interface WeekAssignment {
  title: string
  type: string
  dueDate: string | null
  pointsPossible: number | null
}

interface WeekData {
  weekNumber: number
  title: string
  startDate: string | null
  endDate: string | null
  assignments: WeekAssignment[]
}

interface WeeklyScheduleWidgetProps {
  courseId: string
  userEmail: string
  onSwitchToAssignments: () => void
}

export default function WeeklyScheduleWidget({
  courseId,
  userEmail,
  onSwitchToAssignments,
}: WeeklyScheduleWidgetProps) {
  const [currentWeek, setCurrentWeek] = useState<WeekData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    fetch(`/api/courses/${courseId}/course-map`, {
      headers: { 'x-demo-user-email': userEmail },
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: { courseMap?: { weeks?: WeekData[] } }) => {
        const weeks = data.courseMap?.weeks ?? []
        const now = new Date()
        // Find the week whose date range contains today
        const active = weeks.find((w) => {
          if (!w.startDate || !w.endDate) return false
          return now >= new Date(w.startDate) && now <= new Date(w.endDate)
        })
        // Fallback: pick the first week with a future end date, or the last week
        setCurrentWeek(active ?? weeks.find((w) => w.endDate && new Date(w.endDate) >= now) ?? weeks[0] ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [courseId, userEmail])

  if (loading) {
    return <p className="text-sm text-gray-400 animate-pulse">Loading schedule...</p>
  }

  if (!currentWeek) {
    return <p className="text-sm text-gray-500">No schedule available yet.</p>
  }

  const assignments = currentWeek.assignments ?? []

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Week {currentWeek.weekNumber}: {currentWeek.title}
      </p>
      {assignments.length === 0 ? (
        <p className="text-sm text-gray-500">No assignments this week.</p>
      ) : (
        <ul className="space-y-1.5">
          {assignments.map((a, i) => (
            <li key={i} className="flex items-center justify-between text-sm">
              <span className="truncate text-gray-700">{a.title}</span>
              {a.dueDate && (
                <span className="shrink-0 text-xs text-gray-400 tabular-nums">
                  {new Date(a.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={onSwitchToAssignments}
        className="mt-1 text-xs font-semibold text-[#0033A0] hover:underline"
      >
        See full schedule
      </button>
    </div>
  )
}
```

- [ ] **Step 3.2: Verify TypeScript compiles**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | head -20`

Expected: no errors

---

### Step 4: Create `SetupChecklist.tsx`

**File:** `app/components/courses/SetupChecklist.tsx`

Educator widget showing course setup progress: syllabus uploaded? materials added? course map generated? tools linked? Each item is a row with a checkmark or empty circle plus a CTA.

- [ ] **Step 4.1: Create the widget**

```typescript
// app/components/courses/SetupChecklist.tsx
'use client'

import { useEffect, useState } from 'react'
import { Check, Circle } from 'lucide-react'

interface SyllabusStatus {
  hasParseJob: boolean
  hasCourseMap: boolean
  assignmentCount: number
  objectiveCount: number
  unitCount: number | null
}

interface SetupChecklistProps {
  courseId: string
  userEmail: string
  materialsCount: number
  linkedToolsCount: number
  onSwitchTab: (tab: string) => void
}

export default function SetupChecklist({
  courseId,
  userEmail,
  materialsCount,
  linkedToolsCount,
  onSwitchTab,
}: SetupChecklistProps) {
  const [status, setStatus] = useState<SyllabusStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    fetch(`/api/courses/${courseId}/syllabus-status`, {
      headers: { 'x-demo-user-email': userEmail },
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: SyllabusStatus) => setStatus(data))
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [courseId, userEmail])

  if (loading) {
    return <p className="text-sm text-gray-400 animate-pulse">Loading setup status...</p>
  }

  const steps = [
    {
      label: 'Upload syllabus',
      done: status?.hasParseJob ?? false,
      action: () => onSwitchTab('content'),
    },
    {
      label: 'Add course materials',
      done: materialsCount >= 1,
      action: () => onSwitchTab('content'),
    },
    {
      label: 'Generate course map',
      done: status?.hasCourseMap ?? false,
      action: () => onSwitchTab('analytics'),
    },
    {
      label: 'Link course tools',
      done: linkedToolsCount >= 1,
      action: () => onSwitchTab('content'),
    },
  ]

  const completedCount = steps.filter((s) => s.done).length
  const allDone = completedCount === steps.length
  const pct = Math.round((completedCount / steps.length) * 100)

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#0033A0] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-gray-500">{completedCount}/{steps.length}</span>
      </div>

      {allDone ? (
        <p className="text-sm text-green-600 font-medium">Course setup complete!</p>
      ) : (
        <ul className="space-y-2">
          {steps.map((step, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              {step.done ? (
                <Check className="size-4 text-green-500 shrink-0" />
              ) : (
                <Circle className="size-4 text-gray-300 shrink-0" />
              )}
              {step.done ? (
                <span className="text-gray-400 line-through">{step.label}</span>
              ) : (
                <button
                  type="button"
                  onClick={step.action}
                  className="text-[#0033A0] font-medium hover:underline"
                >
                  {step.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 4.2: Verify TypeScript compiles**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | head -20`

Expected: no errors

---

### Step 5: Create `EngagementSnapshot.tsx`

**File:** `app/components/courses/EngagementSnapshot.tsx`

Educator widget showing summary engagement cards: total submissions graded, linked tools count, and materials count. Uses data already available from `useCourseDetail` (materials, linkedTools) plus a lightweight fetch to the grades endpoint. No new API needed.

- [ ] **Step 5.1: Create the widget**

```typescript
// app/components/courses/EngagementSnapshot.tsx
'use client'

import { useEffect, useState } from 'react'
import { FileText, Wrench, BookOpen } from 'lucide-react'

interface EngagementSnapshotProps {
  courseId: string
  userEmail: string
  materialsCount: number
  linkedToolsCount: number
}

export default function EngagementSnapshot({
  courseId,
  userEmail,
  materialsCount,
  linkedToolsCount,
}: EngagementSnapshotProps) {
  const [submissionCount, setSubmissionCount] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/courses/${courseId}/submissions?limit=0`, {
      headers: { 'x-demo-user-email': userEmail },
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: { total?: number; submissions?: unknown[] }) => {
        setSubmissionCount(data.total ?? data.submissions?.length ?? 0)
      })
      .catch(() => setSubmissionCount(0))
    return () => controller.abort()
  }, [courseId, userEmail])

  const cards = [
    { label: 'Materials', value: materialsCount, icon: BookOpen },
    { label: 'Tools Linked', value: linkedToolsCount, icon: Wrench },
    { label: 'Submissions', value: submissionCount, icon: FileText },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="flex flex-col items-center rounded-xl bg-gray-50 px-3 py-3">
          <card.icon className="size-4 text-gray-400 mb-1" />
          <span className="text-lg font-bold text-gray-800 tabular-nums">
            {card.value === null ? '...' : card.value}
          </span>
          <span className="text-xs text-gray-500">{card.label}</span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5.2: Verify TypeScript compiles**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | head -20`

Expected: no errors

---

### Step 6: Wire new widgets into student dashboard

**File:** `app/courses/StudentCourseView.tsx`

Add `RecentGradesWidget` and `WeeklyScheduleWidget` to the student dashboard grid. Per design spec, the priority order is: This Week, Timeline, Study Guide, Weekly Schedule, Recent Grades, then the existing lower-priority widgets (Course Content, Progress, Teach Back, Study Partners).

Also per design spec section 4 ("What's NOT on the Dashboard"), remove the Course Content widget (MaterialsTab + CoursePolicySummaryCard), LearningMap/Progress, Teach It Back, and Study Partners from the dashboard. These are accessible via Sandy or other tabs.

- [ ] **Step 6.1: Add imports**

Add to the imports section of `StudentCourseView.tsx`:

```typescript
import RecentGradesWidget from '../components/courses/RecentGradesWidget'
import WeeklyScheduleWidget from '../components/courses/WeeklyScheduleWidget'
```

Remove no-longer-needed imports (since these widgets are removed from dashboard but may still be used elsewhere — check each):
- `CoursePolicySummaryCard` — no longer used in this file (was only in dashboard). Remove import.
- `MaterialsTab` — still used? No, it was only in the dashboard Course Content widget. But it was also a dynamic import used nowhere else in student view. Remove the dynamic import.
- `LearningMapTab` — only used in dashboard Progress widget. Remove dynamic import.
- `TeachBackSection` — only used in dashboard Teach Back widget. Remove dynamic import.
- `MapIcon` — only used for Progress widget icon. Remove from lucide import.
- `GraduationCap` — only used for Teach Back widget icon. Remove from lucide import.

Keep: `Calendar`, `Clock`, `BookOpen` (for Study Guide), `Star` (for assignments tab My Grades), `Users` (no longer needed if Study Partners removed), `FlaskConical` (assignments tab Exam Forge).

Remove from lucide imports: `MapIcon`, `GraduationCap`, `Users`

Remove these dynamic imports:
```typescript
// REMOVE these lines:
const MaterialsTab = dynamic(...)
const LearningMapTab = dynamic(...)
const TeachBackSection = dynamic(...)
```

Remove unused regular imports:
```typescript
// REMOVE:
import CoursePolicySummaryCard from '../components/courses/CoursePolicySummaryCard'
```

Also remove `Link` from `next/link` (was only used for Study Partners).

- [ ] **Step 6.2: Replace the dashboard grid content**

Replace the `activeTab === 'dashboard'` block in the JSX. The new dashboard is:

```tsx
<DashboardGrid>
  <WidgetFull>
    <DashboardWidget title="This Week" icon={Calendar}>
      <ThisWeekCard
        courseId={course.id}
        userEmail={currentUser.email}
        onSwitchTab={(tab) => setActiveTab(tab as TabId)}
      />
    </DashboardWidget>
  </WidgetFull>

  <WidgetFull>
    <DashboardWidget title="Timeline" icon={Clock}>
      <CourseTimeline courseId={course.id} userEmail={currentUser.email} />
    </DashboardWidget>
  </WidgetFull>

  {detail.materials.length > 0 && (
    <WidgetHalf>
      <DashboardWidget title="Study Guide" icon={BookOpen}>
        <StudyGuideCard
          courseId={course.id}
          title={`${course.courseCode} Study Guide`}
          materials={detail.materials}
          onOpenMaterial={(id) => detail.setViewerMaterialId(id)}
        />
      </DashboardWidget>
    </WidgetHalf>
  )}

  <WidgetHalf>
    <DashboardWidget title="Weekly Schedule" icon={Calendar} collapsible={false}>
      <WeeklyScheduleWidget
        courseId={course.id}
        userEmail={currentUser.email}
        onSwitchToAssignments={() => setActiveTab('assignments')}
      />
    </DashboardWidget>
  </WidgetHalf>

  <WidgetHalf>
    <DashboardWidget title="Recent Grades" icon={Star} collapsible={false}>
      <RecentGradesWidget
        courseId={course.id}
        userEmail={currentUser.email}
        onSwitchToAssignments={() => setActiveTab('assignments')}
      />
    </DashboardWidget>
  </WidgetHalf>

  {detail.hasLinkedTools && (
    <WidgetHalf>
      <DashboardWidget title="Course Tools" icon={BookOpen} collapsible={false}>
        <div className="flex flex-wrap gap-2">
          {detail.linkedTools.slice(0, 4).map((tool) => (
            <a
              key={tool.id}
              href={`/hub/tool/${tool.id}`}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {tool.name}
            </a>
          ))}
          {detail.linkedTools.length > 4 && (
            <span className="text-xs text-gray-400 self-center">+{detail.linkedTools.length - 4} more</span>
          )}
        </div>
      </DashboardWidget>
    </WidgetHalf>
  )}
</DashboardGrid>
```

- [ ] **Step 6.3: Verify no unused imports remain**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | head -20`

Expected: no errors. Also check lint: `npm run lint -- --no-warn 2>&1 | grep StudentCourseView`

---

### Step 7: Wire phase-aware dashboard into educator view

**File:** `app/courses/EducatorCourseView.tsx`

The educator dashboard becomes phase-aware. Import `useSemesterPhase` and the new widgets. The dashboard layout changes based on phase:

- **Setup phase:** SetupChecklist (prominent), SyllabusStatus, Materials — helping educators build their course
- **Active phase:** EngagementSnapshot, LectureDebriefs, OfficeHours, LearningPath, Progress — monitoring students
- **Late phase:** Same as Active, but Progress (gradebook summary) promoted to top

Common widgets (SyllabusStatus, PolicySummary) always appear but shift position.

- [ ] **Step 7.1: Add imports**

Add to the imports section of `EducatorCourseView.tsx`:

```typescript
import { useSemesterPhase } from '../hooks/useSemesterPhase'
import SetupChecklist from '../components/courses/SetupChecklist'
import EngagementSnapshot from '../components/courses/EngagementSnapshot'
```

Add `ClipboardCheck` and `BarChart3` to the lucide import for new widget icons.

- [ ] **Step 7.2: Add hook call**

Inside the `EducatorCourseView` function body, after the `useCourseContext` call, add:

```typescript
const phase = useSemesterPhase({
  courseId: course.id,
  userEmail: currentUser.email,
  materialsCount: detail.materials.length,
  hasCourseMap: detail.hasMaterials, // hasMaterials is a proxy — course map requires materials
})
```

Note: `detail.hasMaterials` is an approximation. The `useSemesterPhase` hook internally fetches the course-map endpoint to check if it actually exists, so the `hasCourseMap` prop just gates whether to make that fetch.

- [ ] **Step 7.3: Replace the dashboard grid content**

Replace the `activeTab === 'dashboard'` block with a phase-aware layout:

```tsx
<DashboardGrid>
  {/* Setup phase: checklist is prominent */}
  {phase === 'setup' && (
    <WidgetFull>
      <DashboardWidget title="Course Setup" icon={ClipboardCheck} collapsible={false}>
        <SetupChecklist
          courseId={course.id}
          userEmail={currentUser.email}
          materialsCount={detail.materials.length}
          linkedToolsCount={detail.linkedTools.length}
          onSwitchTab={(tab) => setActiveTab(tab as TabId)}
        />
      </DashboardWidget>
    </WidgetFull>
  )}

  {/* Late phase: Progress promoted to top */}
  {phase === 'late' && detail.hasMaterials && (
    <WidgetFull>
      <DashboardWidget title="Progress" icon={MapIcon}>
        <LearningMapTab
          courseId={course.id}
          canManage={canManage}
          userEmail={currentUser.email}
          isStudent={false}
          onOpenViewer={(id) => detail.setViewerMaterialId(id)}
        />
      </DashboardWidget>
    </WidgetFull>
  )}

  {/* Always: Syllabus Status */}
  <WidgetFull>
    <DashboardWidget title="Syllabus Status" icon={FileText}>
      <SyllabusStatusCard courseId={course.id} userEmail={currentUser.email} />
    </DashboardWidget>
  </WidgetFull>

  {/* Active/Late: Engagement snapshot */}
  {phase !== 'setup' && (
    <WidgetFull>
      <DashboardWidget title="Engagement" icon={BarChart3} collapsible={false}>
        <EngagementSnapshot
          courseId={course.id}
          userEmail={currentUser.email}
          materialsCount={detail.materials.length}
          linkedToolsCount={detail.linkedTools.length}
        />
      </DashboardWidget>
    </WidgetFull>
  )}

  <WidgetHalf>
    <DashboardWidget title="Policy Summary" icon={BookOpen}>
      <CoursePolicySummaryCard
        courseId={course.id}
        userEmail={currentUser.email}
        onSwitchTab={(tab) => setActiveTab(tab)}
      />
    </DashboardWidget>
  </WidgetHalf>

  <WidgetHalf>
    <DashboardWidget title="Materials" icon={BookOpen}>
      <MaterialsTab
        courseId={course.id}
        courseCode={course.courseCode}
        selectedCourse={course}
        canManage={canManage}
        isEducator={true}
        userEmail={currentUser.email}
        materials={detail.materials}
        onRefresh={detail.refreshSelectedCourse}
        onOpenViewer={(id) => detail.setViewerMaterialId(id)}
        suggestionsByModule={detail.suggestionsByModule}
        onSuggestionsFetched={(key, suggestions) =>
          detail.setSuggestionsByModule((p) => ({ ...p, [key]: suggestions }))
        }
      />
    </DashboardWidget>
  </WidgetHalf>

  {detail.linkedTools.length > 0 && (
    <WidgetFull>
      <DashboardWidget title="Learning Path" icon={Route}>
        <LearningPathTab
          linkedTools={detail.linkedTools}
          userEmail={currentUser.email}
          isStudent={false}
        />
      </DashboardWidget>
    </WidgetFull>
  )}

  {/* Active/Late: Lecture Debriefs + Office Hours */}
  {phase !== 'setup' && (
    <>
      <WidgetHalf>
        <DashboardWidget title="Lecture Debriefs" icon={BookOpen} defaultOpen={false}>
          <LectureDebriefSection courseId={course.id} />
        </DashboardWidget>
      </WidgetHalf>

      <WidgetHalf>
        <DashboardWidget title="Office Hours" icon={HelpCircle} defaultOpen={false}>
          <OfficeHoursSection courseId={course.id} />
        </DashboardWidget>
      </WidgetHalf>
    </>
  )}

  {/* Active phase: Progress at bottom (Late has it at top instead) */}
  {phase === 'active' && detail.hasMaterials && (
    <WidgetFull>
      <DashboardWidget title="Progress" icon={MapIcon}>
        <LearningMapTab
          courseId={course.id}
          canManage={canManage}
          userEmail={currentUser.email}
          isStudent={false}
          onOpenViewer={(id) => detail.setViewerMaterialId(id)}
        />
      </DashboardWidget>
    </WidgetFull>
  )}
</DashboardGrid>
```

- [ ] **Step 7.4: Verify TypeScript compiles**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | head -20`

Expected: no errors

---

### Step 8: Verify build and all tabs

- [ ] **Step 8.1: Run full build**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && npm run lint && NODE_OPTIONS="--max-old-space-size=8192" npm run build`

Expected: build passes (lint warnings are pre-existing, no new errors)

- [ ] **Step 8.2: Manual verification checklist**

Test as all 4 demo users:

- Student Dashboard (tiana.the.student@uky.edu):
  - [ ] This Week widget renders
  - [ ] Timeline widget renders
  - [ ] Study Guide shows (if materials exist)
  - [ ] Weekly Schedule widget shows current week's assignments
  - [ ] Recent Grades widget shows graded items (or "No graded work yet")
  - [ ] Course Tools widget shows linked tool names (if any)
  - [ ] Course Content, Progress, Teach It Back, Study Partners NO LONGER on dashboard
  - [ ] Assignments tab still works (ExamForge, My Grades)
  - [ ] Discussion tab still works
  - [ ] `?tab=course-map` hidden tab still works
  - [ ] `?tab=policies` hidden tab still works
  - [ ] Mobile: single column, all widgets visible

- Educator Dashboard (katie.thompson@uky.edu):
  - [ ] Phase detection works: TEK-100 should show "active" or "late" if course map exists with dates
  - [ ] Setup phase: SetupChecklist visible at top with progress bar + CTAs
  - [ ] Active phase: EngagementSnapshot visible, Lecture Debriefs + Office Hours appear
  - [ ] Late phase: Progress promoted to top of dashboard
  - [ ] SyllabusStatus always visible
  - [ ] Materials widget renders
  - [ ] PolicySummary widget renders
  - [ ] Content, Analytics, Settings tabs all still work
  - [ ] `?tab=assignments` and `?tab=discussion` hidden tabs still work
  - [ ] Mobile: single column, all widgets visible

- Admin (heath.price@uky.edu): sees educator view, verify dashboard works
- Staff (morgan.rivera@uky.edu): verify no crashes

---

## Files Changed Summary

| Action | File |
|--------|------|
| **Create** | `app/hooks/useSemesterPhase.ts` |
| **Create** | `app/components/courses/RecentGradesWidget.tsx` |
| **Create** | `app/components/courses/WeeklyScheduleWidget.tsx` |
| **Create** | `app/components/courses/SetupChecklist.tsx` |
| **Create** | `app/components/courses/EngagementSnapshot.tsx` |
| **Modify** | `app/courses/StudentCourseView.tsx` (add new widgets, remove deprecated dashboard widgets per design spec) |
| **Modify** | `app/courses/EducatorCourseView.tsx` (phase-aware dashboard layout) |
