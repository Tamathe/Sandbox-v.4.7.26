# Course Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a horizontal course timeline to the Course Overview tab showing week boundaries, assignment due dates with status markers, a "today" indicator, and a click-to-interact detail panel.

**Architecture:** One new API endpoint (`GET /api/courses/[id]/timeline`) backed by a service that queries existing CourseWeek + Assignment + Submission + GradebookEntry models. Four new components: a container with responsive switching, a horizontal track, a slide-out detail panel, and a mobile chip with bottom sheet. Integrated as the first element in the student Course Overview tab.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, Prisma v7, date-fns, lucide-react

**Spec:** `docs/superpowers/specs/2026-04-03-course-timeline-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `app/lib/courses/timeline-service.ts` | Create | `getCourseTimeline(courseId, userId)` — queries DB, computes status |
| `app/api/courses/[id]/timeline/route.ts` | Create | Thin GET handler |
| `app/components/courses/CourseTimeline.tsx` | Create | Container — fetch, responsive switch, selected item state |
| `app/components/courses/TimelineTrack.tsx` | Create | Horizontal visual — dots, line, weeks, today marker |
| `app/components/courses/TimelineDetailPanel.tsx` | Create | Slide-out panel — assignment details + actions |
| `app/components/courses/TimelineChip.tsx` | Create | Mobile chip + bottom sheet |
| `app/courses/page.tsx` | Modify (line ~852) | Insert `<CourseTimeline>` above `<ThisWeekCard>` |
| `app/globals.css` | Modify | Add `timeline-pulse` keyframes + hidden-scrollbar utility |

---

### Task 1: Timeline Service — Data Layer

**Files:**
- Create: `app/lib/courses/timeline-service.ts`

- [ ] **Step 1: Create the service file with types and query**

```typescript
// app/lib/courses/timeline-service.ts
import { prisma } from '../prisma'

export type TimelineItemStatus = 'submitted' | 'graded' | 'upcoming' | 'due-soon' | 'overdue'

export interface TimelineItem {
  id: string
  title: string
  category: string
  type: string
  dueAt: string
  pointsPossible: number | null
  status: TimelineItemStatus
  score: number | null
  weekNumber: number | null
  hasRubric: boolean
  submittedAt: string | null
}

export interface TimelineWeek {
  weekNumber: number
  title: string
  startDate: string | null
  endDate: string | null
}

export interface CourseTimelineData {
  weeks: TimelineWeek[]
  items: TimelineItem[]
  currentWeek: number
  semesterStart: string
  semesterEnd: string
}

function computeStatus(
  dueAt: Date,
  submission: { submittedAt: Date; gradebookEntry: { aiScore: number | null; facultyScore: number | null } | null } | null,
  now: Date,
): { status: TimelineItemStatus; score: number | null; submittedAt: string | null } {
  if (submission) {
    const score = submission.gradebookEntry?.facultyScore ?? submission.gradebookEntry?.aiScore ?? null
    const submittedAt = submission.submittedAt.toISOString()
    if (submission.gradebookEntry) {
      return { status: 'graded', score, submittedAt }
    }
    return { status: 'submitted', score: null, submittedAt }
  }

  const hoursUntilDue = (dueAt.getTime() - now.getTime()) / (1000 * 60 * 60)
  if (hoursUntilDue < 0) return { status: 'overdue', score: null, submittedAt: null }
  if (hoursUntilDue <= 48) return { status: 'due-soon', score: null, submittedAt: null }
  return { status: 'upcoming', score: null, submittedAt: null }
}

function computeCurrentWeek(weeks: { startDate: Date | null; endDate: Date | null; weekNumber: number }[], now: Date): number {
  for (const w of weeks) {
    if (w.startDate && w.endDate && now >= w.startDate && now <= w.endDate) {
      return w.weekNumber
    }
  }
  // If today is before all weeks, return 0; if after all, return last week number
  const sorted = weeks.filter(w => w.startDate).sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime())
  if (sorted.length === 0) return 0
  if (now < sorted[0].startDate!) return 0
  return sorted[sorted.length - 1].weekNumber
}

export async function getCourseTimeline(courseId: string, userId: string): Promise<CourseTimelineData> {
  const now = new Date()

  const [weeks, assignments] = await Promise.all([
    prisma.courseWeek.findMany({
      where: { courseId },
      orderBy: { orderIndex: 'asc' },
      select: { weekNumber: true, title: true, startDate: true, endDate: true },
    }),
    prisma.assignment.findMany({
      where: { courseId, isPublished: true, dueAt: { not: null } },
      orderBy: { dueAt: 'asc' },
      select: {
        id: true,
        title: true,
        category: true,
        type: true,
        dueAt: true,
        pointsPossible: true,
        rubricId: true,
        week: { select: { weekNumber: true } },
        submissions: {
          where: { studentId: userId },
          take: 1,
          select: {
            submittedAt: true,
            gradebookEntry: {
              select: { aiScore: true, facultyScore: true },
            },
          },
        },
      },
    }),
  ])

  const timelineWeeks: TimelineWeek[] = weeks.map(w => ({
    weekNumber: w.weekNumber,
    title: w.title,
    startDate: w.startDate?.toISOString() ?? null,
    endDate: w.endDate?.toISOString() ?? null,
  }))

  const items: TimelineItem[] = assignments.map(a => {
    const sub = a.submissions[0] ?? null
    const { status, score, submittedAt } = computeStatus(a.dueAt!, sub, now)
    return {
      id: a.id,
      title: a.title,
      category: a.category ?? 'other',
      type: a.type,
      dueAt: a.dueAt!.toISOString(),
      pointsPossible: a.pointsPossible,
      status,
      score,
      weekNumber: a.week?.weekNumber ?? null,
      hasRubric: !!a.rubricId,
      submittedAt,
    }
  })

  const weeksWithDates = weeks.filter(w => w.startDate && w.endDate)
  const currentWeek = computeCurrentWeek(
    weeks.map(w => ({ startDate: w.startDate, endDate: w.endDate, weekNumber: w.weekNumber })),
    now,
  )

  const startDates = weeksWithDates.map(w => w.startDate!.getTime())
  const endDates = weeksWithDates.map(w => w.endDate!.getTime())
  const semesterStart = startDates.length > 0 ? new Date(Math.min(...startDates)).toISOString() : now.toISOString()
  const semesterEnd = endDates.length > 0 ? new Date(Math.max(...endDates)).toISOString() : now.toISOString()

  return { weeks: timelineWeeks, items, currentWeek, semesterStart, semesterEnd }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit app/lib/courses/timeline-service.ts 2>&1 | head -20`

If there are Prisma relation errors (e.g., `submissions` doesn't accept `where: { studentId }` or `week` relation name), check the schema for the correct field names:

```bash
grep -A 5 'model Assignment' prisma/schema.prisma | head -20
```

Fix any mismatched field names (e.g., `week` vs `courseWeek`, `studentId` vs `userId`).

- [ ] **Step 3: Commit**

```bash
git add app/lib/courses/timeline-service.ts
git commit -m "feat(timeline): add getCourseTimeline service

Queries CourseWeek + Assignment + Submission + GradebookEntry for a
student's per-course timeline. Computes submitted/graded/upcoming/
due-soon/overdue status server-side.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: API Route

**Files:**
- Create: `app/api/courses/[id]/timeline/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
// app/api/courses/[id]/timeline/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getCourseTimeline } from '../../../../lib/courses/timeline-service'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const data = await getCourseTimeline(id, auth.id)
  return NextResponse.json(data)
})
```

- [ ] **Step 2: Verify the route compiles**

Run: `npx tsc --noEmit app/api/courses/\\[id\\]/timeline/route.ts 2>&1 | head -20`

Check that `auth.id` is the correct field for the user ID. If the auth guard returns an object with a different field name (e.g., `auth.user.id`), fix accordingly. Check by reading:

```bash
grep -A 10 'requireRequestUser' app/lib/server-auth.ts | head -15
```

- [ ] **Step 3: Commit**

```bash
git add app/api/courses/\[id\]/timeline/route.ts
git commit -m "feat(timeline): add GET /api/courses/[id]/timeline route

Thin handler: auth guard → getCourseTimeline → JSON response.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: TimelineTrack Component — The Horizontal Visual

**Files:**
- Create: `app/components/courses/TimelineTrack.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/components/courses/TimelineTrack.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import {
  FileText, HelpCircle, GraduationCap, Folder, BookOpen,
  Presentation, FlaskConical, MessageSquare, Users, Circle,
} from 'lucide-react'
import type { TimelineItem, TimelineWeek } from '../../lib/courses/timeline-service'

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  homework: FileText,
  quiz: HelpCircle,
  exam: GraduationCap,
  project: Folder,
  paper: BookOpen,
  presentation: Presentation,
  lab: FlaskConical,
  discussion: MessageSquare,
  participation: Users,
  other: Circle,
}

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-green-500',
  graded: 'bg-green-500',
  upcoming: 'bg-gray-400',
  'due-soon': 'bg-amber-500 timeline-pulse',
  overdue: 'bg-red-500',
}

interface TimelineTrackProps {
  weeks: TimelineWeek[]
  items: TimelineItem[]
  currentWeek: number
  semesterStart: string
  semesterEnd: string
  onItemSelect: (item: TimelineItem) => void
  selectedItemId: string | null
}

export default function TimelineTrack({
  weeks, items, currentWeek, semesterStart, semesterEnd,
  onItemSelect, selectedItemId,
}: TimelineTrackProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const todayRef = useRef<HTMLDivElement>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const start = new Date(semesterStart).getTime()
  const end = new Date(semesterEnd).getTime()
  const range = end - start || 1
  const WEEK_WIDTH = 120
  const innerWidth = Math.max(weeks.length * WEEK_WIDTH, 800)

  function toPercent(dateStr: string): number {
    const t = new Date(dateStr).getTime()
    return Math.max(0, Math.min(100, ((t - start) / range) * 100))
  }

  const todayPercent = toPercent(new Date().toISOString())

  // Scroll to center "today" at ~35% from left
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const todayPx = (todayPercent / 100) * innerWidth
    const targetScroll = todayPx - el.clientWidth * 0.35
    el.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' })
  }, [todayPercent, innerWidth])

  // Group items by date to handle same-date stacking
  const itemsByDate = new Map<string, TimelineItem[]>()
  for (const item of items) {
    const dateKey = item.dueAt.slice(0, 10)
    const group = itemsByDate.get(dateKey) || []
    group.push(item)
    itemsByDate.set(dateKey, group)
  }

  return (
    <div
      ref={scrollRef}
      className="relative h-20 bg-white border-b border-gray-200 overflow-x-auto scroll-smooth timeline-hidden-scrollbar"
      role="img"
      aria-label="Course timeline"
    >
      <div className="relative h-full" style={{ width: `${innerWidth}px` }}>
        {/* Week bands */}
        {weeks.map((week, i) => {
          const wStart = week.startDate ? toPercent(week.startDate) : (i / weeks.length) * 100
          const wEnd = week.endDate ? toPercent(week.endDate) : ((i + 1) / weeks.length) * 100
          return (
            <div key={week.weekNumber}>
              <div
                className={`absolute top-0 bottom-0 ${i % 2 === 0 ? 'bg-gray-50/60' : ''}`}
                style={{ left: `${wStart}%`, width: `${wEnd - wStart}%` }}
              />
              <span
                className="absolute bottom-1 text-[10px] text-gray-400"
                style={{ left: `${(wStart + wEnd) / 2}%`, transform: 'translateX(-50%)' }}
              >
                W{week.weekNumber}
              </span>
            </div>
          )
        })}

        {/* Horizontal line */}
        <div className="absolute top-1/2 left-0 right-0 h-[3px] bg-gray-200 rounded-full -translate-y-1/2" />

        {/* Today marker */}
        <div
          ref={todayRef}
          className="absolute top-0 bottom-0 w-[2px] bg-[#0033A0] z-10"
          style={{ left: `${todayPercent}%` }}
          aria-current="date"
        >
          <span className="absolute -top-0 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[#0033A0] whitespace-nowrap">
            TODAY
          </span>
        </div>

        {/* Assignment dots */}
        {Array.from(itemsByDate.entries()).map(([dateKey, group]) =>
          group.map((item, stackIdx) => {
            const left = toPercent(item.dueAt)
            const offset = stackIdx > 0 ? stackIdx * 8 : 0
            const isHovered = hoveredId === item.id
            const isSelected = selectedItemId === item.id
            const showExtra = stackIdx >= 3

            if (showExtra && stackIdx === 3) {
              return (
                <span
                  key={`overflow-${dateKey}`}
                  className="absolute text-[9px] text-gray-500 font-semibold"
                  style={{ left: `${left}%`, top: `calc(50% + ${offset}px - 6px)`, transform: 'translateX(-50%)' }}
                >
                  +{group.length - 3}
                </span>
              )
            }
            if (showExtra) return null

            return (
              <div key={item.id} className="absolute z-20" style={{ left: `${left}%`, top: `calc(50% - 6px - ${offset}px)`, transform: 'translateX(-50%)' }}>
                <button
                  type="button"
                  className={`
                    ${isHovered ? 'size-4' : 'size-3'} rounded-full border-2 border-white shadow-sm
                    ${STATUS_COLORS[item.status]}
                    ${isSelected ? 'ring-2 ring-[#0033A0] ring-offset-1' : ''}
                    transition-transform duration-150
                  `}
                  aria-label={`${item.title}, ${item.status}, due ${format(new Date(item.dueAt), 'MMM d')}`}
                  onClick={() => onItemSelect(item)}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                />
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded whitespace-nowrap z-30 pointer-events-none">
                    {item.title} — {formatDistanceToNow(new Date(item.dueAt), { addSuffix: true })}
                  </div>
                )}
                {/* Score badge for graded */}
                {item.status === 'graded' && item.score !== null && (
                  <span className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 text-[9px] font-semibold text-green-700 whitespace-nowrap">
                    {item.score}
                  </span>
                )}
              </div>
            )
          }),
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit app/components/courses/TimelineTrack.tsx 2>&1 | head -20`

Fix any import path issues. The `TimelineItem` and `TimelineWeek` types are exported from `timeline-service.ts` — verify the import path resolves correctly (it should be `../../lib/courses/timeline-service`).

- [ ] **Step 3: Commit**

```bash
git add app/components/courses/TimelineTrack.tsx
git commit -m "feat(timeline): add TimelineTrack horizontal visual component

Renders week bands, assignment dots with status colors, today marker,
hover tooltips, and same-date stacking. Pure presentational.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: TimelineDetailPanel — Slide-Out Panel

**Files:**
- Create: `app/components/courses/TimelineDetailPanel.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/components/courses/TimelineDetailPanel.tsx
'use client'

import { useEffect, useCallback } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import {
  X, FileText, HelpCircle, GraduationCap, Folder, BookOpen,
  Presentation, FlaskConical, MessageSquare, Users, Circle,
  ExternalLink, Bot,
} from 'lucide-react'
import type { TimelineItem } from '../../lib/courses/timeline-service'

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  homework: FileText,
  quiz: HelpCircle,
  exam: GraduationCap,
  project: Folder,
  paper: BookOpen,
  presentation: Presentation,
  lab: FlaskConical,
  discussion: MessageSquare,
  participation: Users,
  other: Circle,
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  submitted: { label: 'Submitted', className: 'bg-green-100 text-green-800' },
  graded: { label: 'Graded', className: 'bg-green-100 text-green-800' },
  upcoming: { label: 'Upcoming', className: 'bg-gray-100 text-gray-700' },
  'due-soon': { label: 'Due Soon', className: 'bg-amber-100 text-amber-800' },
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-800' },
}

interface TimelineDetailPanelProps {
  item: TimelineItem | null
  courseId: string
  onClose: () => void
}

export default function TimelineDetailPanel({ item, courseId, onClose }: TimelineDetailPanelProps) {
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [handleEscape])

  if (!item) return null

  const Icon = CATEGORY_ICONS[item.category] || Circle
  const statusCfg = STATUS_CONFIG[item.status]
  const dueDate = new Date(item.dueAt)

  function handleAskSandy() {
    window.dispatchEvent(new CustomEvent('sandy-prefill', {
      detail: {
        message: `Help me prepare for "${item!.title}" which is due ${format(dueDate, 'EEEE, MMMM d')}`,
        autoSend: true,
      },
    }))
  }

  function handleViewAssignment() {
    // Update URL search params to switch to assignments tab
    const url = new URL(window.location.href)
    url.searchParams.set('tab', 'assignments')
    url.searchParams.set('assignment', item!.id)
    window.history.pushState({}, '', url.toString())
    window.dispatchEvent(new PopStateEvent('popstate'))
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-96 max-w-[90vw] bg-white border-l border-gray-200 shadow-lg z-40 flex flex-col transition-transform duration-200 translate-x-0">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200">
          <div className="flex items-center justify-center size-9 rounded-lg bg-gray-100">
            <Icon className="size-5 text-gray-600" />
          </div>
          <h3 className="flex-1 font-extrabold text-gray-900 text-lg leading-tight line-clamp-2">
            {item.title}
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="size-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg.className}`}>
              {statusCfg.label}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">
              {item.category}
            </span>
            {item.pointsPossible && (
              <span className="text-xs text-gray-500">{item.pointsPossible} pts</span>
            )}
          </div>

          {/* Due date */}
          <div className="space-y-1">
            <p className="text-sm font-semibold text-gray-700">Due Date</p>
            <p className="text-sm text-gray-900">{format(dueDate, 'EEEE, MMMM d, yyyy · h:mm a')}</p>
            <p className="text-xs text-gray-500">{formatDistanceToNow(dueDate, { addSuffix: true })}</p>
          </div>

          {/* Submission info */}
          {item.submittedAt && (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-700">Submitted</p>
              <p className="text-sm text-gray-900">{format(new Date(item.submittedAt), 'MMMM d, yyyy · h:mm a')}</p>
            </div>
          )}

          {/* Score */}
          {item.status === 'graded' && item.score !== null && (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-700">Score</p>
              <p className="text-2xl font-extrabold text-green-700">
                {item.score}{item.pointsPossible ? ` / ${item.pointsPossible}` : ''}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <button
            type="button"
            onClick={handleViewAssignment}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="size-4" />
            View Assignment
          </button>
          <button
            type="button"
            onClick={handleAskSandy}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0033A0] text-sm font-semibold text-white hover:bg-[#002280] transition-colors"
          >
            <Bot className="size-4" />
            Ask Sandy
          </button>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit app/components/courses/TimelineDetailPanel.tsx 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add app/components/courses/TimelineDetailPanel.tsx
git commit -m "feat(timeline): add TimelineDetailPanel slide-out component

Shows assignment details, status, score, due date. Action buttons:
View Assignment (switches tab) and Ask Sandy (sandy-prefill event).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: TimelineChip — Mobile Summary

**Files:**
- Create: `app/components/courses/TimelineChip.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/components/courses/TimelineChip.tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { X, ChevronRight } from 'lucide-react'
import type { TimelineItem, TimelineWeek } from '../../lib/courses/timeline-service'

const STATUS_DOT_COLORS: Record<string, string> = {
  submitted: 'bg-green-500',
  graded: 'bg-green-500',
  upcoming: 'bg-gray-400',
  'due-soon': 'bg-amber-500',
  overdue: 'bg-red-500',
}

interface TimelineChipProps {
  weeks: TimelineWeek[]
  items: TimelineItem[]
  currentWeek: number
  onItemSelect: (item: TimelineItem) => void
}

export default function TimelineChip({ weeks, items, currentWeek, onItemSelect }: TimelineChipProps) {
  const [sheetOpen, setSheetOpen] = useState(false)

  const now = new Date()
  const upcoming = items
    .filter(i => new Date(i.dueAt) >= now || i.status === 'overdue')
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    .slice(0, 5)

  const nextDue = upcoming[0]
  const hasOverdue = items.some(i => i.status === 'overdue')
  const hasDueSoon = items.some(i => i.status === 'due-soon')

  const chipBorder = hasOverdue
    ? 'border-red-300 bg-red-50 text-red-700'
    : hasDueSoon
      ? 'border-amber-300 bg-amber-50 text-amber-700'
      : 'border-gray-200 bg-gray-50 text-gray-700'

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setSheetOpen(false)
  }, [])

  useEffect(() => {
    if (sheetOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [sheetOpen, handleEscape])

  const chipText = nextDue
    ? `Week ${currentWeek} of ${weeks.length} — ${nextDue.title} ${formatDistanceToNow(new Date(nextDue.dueAt), { addSuffix: true })}`
    : `Week ${currentWeek} of ${weeks.length}`

  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className={`w-full rounded-full border px-4 py-2 text-sm font-medium text-left truncate ${chipBorder}`}
      >
        {chipText}
      </button>

      {/* Bottom sheet */}
      {sheetOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setSheetOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[60vh] flex flex-col">
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100">
              <h3 className="font-extrabold text-gray-900">Upcoming</h3>
              <button type="button" onClick={() => setSheetOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="size-5 text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2">
              {upcoming.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No upcoming assignments</p>
              )}
              {upcoming.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setSheetOpen(false); onItemSelect(item) }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 text-left transition-colors"
                >
                  <div className={`size-2.5 rounded-full flex-shrink-0 ${STATUS_DOT_COLORS[item.status]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(item.dueAt), 'MMM d')} · {formatDistanceToNow(new Date(item.dueAt), { addSuffix: true })}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 capitalize flex-shrink-0">
                    {item.category}
                  </span>
                  <ChevronRight className="size-4 text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit app/components/courses/TimelineChip.tsx 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add app/components/courses/TimelineChip.tsx
git commit -m "feat(timeline): add TimelineChip mobile summary component

Compact chip showing current week + next due item. Tap opens bottom
sheet with next 5 assignments. Urgency-colored border.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: CourseTimeline Container + CSS + Integration

**Files:**
- Create: `app/components/courses/CourseTimeline.tsx`
- Modify: `app/globals.css`
- Modify: `app/courses/page.tsx` (line ~852)

- [ ] **Step 1: Add CSS keyframes and scrollbar utility to globals.css**

Open `app/globals.css` and add at the end (before any closing brace):

```css
/* Timeline — due-soon pulse */
@keyframes timelinePulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
  50% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
}
.timeline-pulse {
  animation: timelinePulse 2s ease-in-out infinite;
}

/* Timeline — hidden scrollbar */
.timeline-hidden-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.timeline-hidden-scrollbar::-webkit-scrollbar {
  display: none;
}
```

- [ ] **Step 2: Create the CourseTimeline container component**

```typescript
// app/components/courses/CourseTimeline.tsx
'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api-client'
import { LoadingSpinner } from '../LoadingSpinner'
import { ErrorBanner } from '../ErrorBanner'
import TimelineTrack from './TimelineTrack'
import TimelineChip from './TimelineChip'
import TimelineDetailPanel from './TimelineDetailPanel'
import type { CourseTimelineData, TimelineItem } from '../../lib/courses/timeline-service'

interface CourseTimelineProps {
  courseId: string
  userEmail: string
}

export default function CourseTimeline({ courseId, userEmail }: CourseTimelineProps) {
  const [data, setData] = useState<CourseTimelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    apiFetch<CourseTimelineData>(userEmail, `/api/courses/${courseId}/timeline`, { signal: controller.signal })
      .then(result => {
        setData(result)
        setLoading(false)
      })
      .catch(err => {
        if (err.name === 'AbortError') return
        setError(err.message || 'Failed to load timeline')
        setLoading(false)
      })

    return () => controller.abort()
  }, [courseId, userEmail])

  // Don't render if no data to show
  if (!loading && !error && data && data.weeks.length === 0) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-20 bg-white border-b border-gray-200">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return <ErrorBanner message={error} retry={() => { setError(null); setLoading(true) }} />
  }

  if (!data) return null

  return (
    <>
      {/* Desktop: full track */}
      <div className="hidden sm:block">
        <TimelineTrack
          weeks={data.weeks}
          items={data.items}
          currentWeek={data.currentWeek}
          semesterStart={data.semesterStart}
          semesterEnd={data.semesterEnd}
          onItemSelect={setSelectedItem}
          selectedItemId={selectedItem?.id ?? null}
        />
      </div>

      {/* Mobile: chip */}
      <div className="block sm:hidden px-4 pt-3">
        <TimelineChip
          weeks={data.weeks}
          items={data.items}
          currentWeek={data.currentWeek}
          onItemSelect={setSelectedItem}
        />
      </div>

      {/* Detail panel (shared between desktop and mobile) */}
      <TimelineDetailPanel
        item={selectedItem}
        courseId={courseId}
        onClose={() => setSelectedItem(null)}
      />
    </>
  )
}
```

- [ ] **Step 3: Integrate into courses page**

Open `app/courses/page.tsx`. Find the student overview section (around line 852):

```typescript
                          <div className="space-y-5">
                            {/* Group 1: This Week (always visible) */}
                            <ThisWeekCard
```

Add the CourseTimeline import at the top of the file alongside other course component imports:

```typescript
import CourseTimeline from '../components/courses/CourseTimeline'
```

Then insert CourseTimeline as the first child of the `<div className="space-y-5">`:

```typescript
                          <div className="space-y-5">
                            {/* Course Timeline */}
                            <CourseTimeline
                              courseId={selectedCourse.id}
                              userEmail={currentUser.email}
                            />
                            {/* Group 1: This Week (always visible) */}
                            <ThisWeekCard
```

**Important:** `CourseTimeline` uses `next/dynamic` is NOT needed here — it's a simple client component that conditionally renders based on data. The `'use client'` directive on the component itself is sufficient.

- [ ] **Step 4: Verify the full build**

Run: `npx tsc --noEmit 2>&1 | tail -5`

If there are type errors, check:
- Import paths for `CourseTimelineData` / `TimelineItem` types
- `LoadingSpinner` and `ErrorBanner` import paths (check existing imports in `app/courses/page.tsx` for the correct relative paths)
- `apiFetch` import path

- [ ] **Step 5: Run lint**

Run: `npm run lint 2>&1 | tail -10`

Fix any lint issues (unused imports, missing keys, etc.)

- [ ] **Step 6: Commit**

```bash
git add app/components/courses/CourseTimeline.tsx app/globals.css app/courses/page.tsx
git commit -m "feat(timeline): add CourseTimeline container, CSS, and page integration

CourseTimeline fetches timeline data and switches between desktop
TimelineTrack and mobile TimelineChip. Integrated as first element
in student Course Overview tab. Pulse animation for due-soon items.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Manual Smoke Test

**Files:** None (verification only)

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Test as student**

1. Open `http://localhost:3000` in browser
2. Switch to Tiana (student) via demo user picker
3. Navigate to Courses
4. Select a course (TEK-100)
5. Verify the timeline strip appears at the top of the Overview tab
6. Verify the "TODAY" marker is visible and the timeline auto-scrolled to center it
7. Hover over dots — verify tooltips show title and relative date
8. Click a dot — verify the detail panel slides in from the right
9. Verify the panel shows: title, due date, status badge, category, points
10. Click "Ask Sandy" — verify Sandy opens with a prefilled message
11. Click "View Assignment" — verify it switches to the Assignments tab
12. Press Escape or click backdrop — verify panel closes
13. Resize browser to mobile width (<640px) — verify the chip appears instead of the track
14. Tap the chip — verify the bottom sheet opens with upcoming items
15. Tap an item in the sheet — verify detail panel opens

- [ ] **Step 3: Test edge cases**

1. Check a course with no weeks that have dates — timeline should not render
2. Check that the timeline only shows published assignments
3. Verify overdue items show red dots, due-soon items pulse amber

- [ ] **Step 4: Verify build passes**

Run: `npm run build 2>&1 | tail -10`

Expected: Build succeeds with no errors.

---

## Summary

| Task | Files | What |
|---|---|---|
| 1 | `timeline-service.ts` | Data layer — query + status computation |
| 2 | `timeline/route.ts` | API route — thin GET handler |
| 3 | `TimelineTrack.tsx` | Desktop horizontal visual |
| 4 | `TimelineDetailPanel.tsx` | Slide-out detail panel |
| 5 | `TimelineChip.tsx` | Mobile chip + bottom sheet |
| 6 | `CourseTimeline.tsx` + CSS + page.tsx | Container + integration |
| 7 | — | Smoke test |

**Total new files:** 6
**Modified files:** 2 (`globals.css`, `courses/page.tsx`)
**New Prisma models:** 0
**New dependencies:** 0
