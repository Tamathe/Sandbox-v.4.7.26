# Faculty Courses Page — Command Center Redesign

Architecture spec for transforming the faculty courses page from a content viewer into an action-oriented command center. Restructures information architecture, surfaces urgency data, adds Sandy proactive intelligence, and polishes mobile/keyboard UX.

**Date:** 2026-04-04
**Approach:** Layered build — 5 independently deployable layers, ordered by risk (lowest first)

---

## Context

The faculty courses page (`/courses` for EDUCATOR role) is architecturally rich — course maps, AI grading, policy management, engagement tracking, discussion forums, exam generation. But a UX evaluation revealed a core structural problem: it's organized as a content viewer (Dashboard / Content / Analytics / Settings) when faculty think in terms of actions ("Who needs grading?", "How is my class doing?", "What's due this week?").

Key problems:
1. **Two most-used features are hidden.** Assignments and Gradebook are deep-linked only (`?tab=assignments`) or buried 3 clicks deep inside Analytics.
2. **No triage view.** Faculty with multiple courses must drill into each one to see what needs attention. No cross-course overview.
3. **Dashboard is passive.** Shows status, doesn't surface urgency. No "here are the 3 things that need your attention right now."
4. **Sandy is reactive.** The AI assistant is available as a button, but doesn't proactively surface insights on the courses page.
5. **Vague labels.** "Analytics" contains 5 unrelated tools. "Content" contains 4 distinct workflows.

This spec addresses all 5 problems across 5 layers.

---

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tab count | 7 visible tabs | Discussion promoted to visible — daily-use for many faculty |
| CourseSwitcher | Hybrid: card grid landing + compact switcher inside course | Triage across courses before drilling in, compact once inside |
| At-risk students | Simple heuristic (inactive 7d, missed 2+ assignments) | Full risk scoring is a separate project; heuristic covers 80% |
| Sandy proactive | Static insights default + on-demand Haiku analysis | Zero-latency defaults, AI depth when faculty want it |
| Mobile tabs | Icon-only with small labels | Scrollable text hides features; icons fit all 7 in one row |
| Keyboard shortcuts | `g`+letter chords, `[`/`]` course switching | Minimal chord system like GitHub, no grading shortcuts in this spec |
| Badges | Local counts only, no notification infrastructure | Byproduct of existing data fetching, not a separate system |

---

## Layer 1: Tab Restructure & Routing

Pure restructuring. No new data, no new APIs — reorganize what already exists.

### Current State

4 visible tabs (Dashboard, Content, Analytics, Settings) + 2 hidden (Assignments, Discussion). Analytics is a dumping ground: Course Map, Engagement Pulse, Gradebook, Submissions, Exam Forge.

### New Tab Structure

| Tab | ID | Icon | Source Components |
|-----|-----|------|-------------------|
| Overview | `overview` | `LayoutDashboard` | `EducatorDashboard` (trimmed) |
| Assignments | `assignments` | `FileText` | `AssignmentsTab` + `ExamForgePanel` |
| Grades | `grades` | `GraduationCap` | `GradebookTab` + `SubmissionsTab` |
| Content | `content` | `BookOpen` | `MaterialsTab` + `ToolsTab` + `LearningPathTab` with `SegmentedControl` sub-nav |
| Course Map | `course-map` | `Map` | `CourseMapTab` (standalone) |
| Discussion | `discussion` | `MessageSquare` | `DiscussionTab` |
| Settings | `settings` | `Settings` | `CourseSettingsTab` + `CoursePoliciesTab` |

### Files Modified

- `app/courses/EducatorCourseView.tsx` — Replace tab definitions array, update rendering switch, update `TAB_ALIAS` map
- `app/components/courses/CourseHeader.tsx` — Update `visibleTabs` to 7 entries with icons, add icon rendering
- `app/components/courses/EducatorDashboard.tsx` — Remove duplicate MaterialsTab widget. Keep: This Week, Engagement Snapshot, Quick Actions, Lecture Debriefs, Office Hours. Demote: Syllabus Status + Policy Summary to bottom.

### URL Backward Compatibility

`TAB_ALIAS` map ensures old bookmarks work:

| Old param | Maps to |
|-----------|---------|
| `?tab=dashboard` | `overview` |
| `?tab=analytics` | `grades` |
| `?tab=submissions` | `grades` |
| `?tab=gradebook` | `grades` |
| `?tab=pulse` | `overview` |
| `?tab=map` | `course-map` |

### Tab URL Sync Fix

Current bug: tab selection doesn't update URL (one-way from URL → state). Fix: `onTabChange` calls `router.replace(/courses?course=${id}&tab=${newTab})` so refresh preserves tab state and browser back button works.

### Content Sub-Navigation

Replace the vertical stack of Materials / Tools / Learning Path in the Content tab with a `SegmentedControl` (shared component per platform manifest). Three segments: Materials | Tools | Learning Path. Each gets full viewport height.

---

## Layer 2: CourseSwitcher Redesign

Two components, two contexts: card grid for triage, compact switcher inside a course.

### 2A. Course Triage Grid (Landing State)

**New file:** `app/components/courses/CourseTriageGrid.tsx`

Renders when no course is selected (no `?course=` param in URL). Replaces the current auto-select-first-course behavior.

Layout: responsive grid — 1 col on mobile, 2 on `md`, 3 on `lg`. Cards use `border rounded-2xl shadow-sm` per platform manifest.

```
+-------------------------------------+
|  TEK-100  Introduction to EdTech    |
|                                     |
|  32 enrolled . Avg: 87%             |
|  [4 ungraded] [2 at-risk]          |
|  Next due: Apr 8 -- Assignment 3    |
+-------------------------------------+
```

- Cards with zero attention items: subtle green left border
- Cards with ungraded > 0 or at-risk > 0: amber left border
- Click card → sets `selectedCourseId`, URL updates to `?course={id}`
- Top-right: "New Course" + "Import from Canvas" buttons (moved from header)

**Data note:** Enhanced counts (ungraded, at-risk, avg grade) require the summary endpoint built in Layer 3. For Layer 2, render with data from `useCourses` (code, title, material count). Enhanced counts show as skeleton placeholders until Layer 3 wires them.

### 2B. Compact Course Switcher (Inside-Course State)

**Modified file:** `app/components/courses/CourseSwitcher.tsx`

Renders in `CourseHeader` when a course is selected. Upgrades:

- Wider trigger — shows course code + title + badge count pills inline
- Badge pills: `4 ungraded` (amber), `2 at-risk` (red) next to course name
- Dropdown list shows all courses with same badge pills for cross-course triage
- "All Courses" row at top of dropdown — clears selection, returns to triage grid
- Keyboard `[`/`]` for cycling (wired in Layer 5)

### 2C. Page Flow Change

**Modified files:** `app/courses/page.tsx`, `app/courses/EducatorCourseView.tsx`

Current: load → fetch → auto-select first course → render EducatorCourseView.

New:
1. Load → fetch courses
2. If `?course={id}` → select that course → EducatorCourseView (same as today)
3. If no `?course=` → render `CourseTriageGrid`
4. Click card → URL to `?course={id}` → EducatorCourseView
5. "All Courses" → URL to `/courses` → back to grid

Bookmarked URLs with `?course=` still work. Nav link `/courses` shows triage grid.

---

## Layer 3: Data Surfacing

API + UI layer that powers badges, vitals, and the Action Required card.

### 3A. Course Summary API

**New files:**
- `app/api/courses/summary/route.ts`
- `app/lib/course-summary-service.ts`

Single endpoint returning attention-relevant counts for all educator courses in one call.

Auth: `requireEducatorUser`

Response:
```typescript
{
  courses: Array<{
    courseId: string
    enrollmentCount: number
    ungradedCount: number        // GradebookEntry status IN ('AI_DRAFT', 'PENDING_REVIEW')
    atRiskInactive7d: number     // no session/submission in 7 days
    atRiskMissed2plus: number    // missed 2+ assignment due dates
    unansweredDiscussions: number // threads where last post is student
    upcomingDeadlines: Array<{
      assignmentId: string
      title: string
      dueAt: string
    }>
    averageGrade: number | null  // avg released facultyScore
  }>
}
```

Implementation: one Prisma query per metric, batched with `Promise.all`, all scoped to `WHERE course.instructorId = userId`.

At-risk heuristics:
- Inactive 7d: enrolled students with no `Submission.submittedAt` or `ToolSession.createdAt` in last 7 days
- Missed 2+: students with 2+ assignments past `dueAt` and no corresponding `Submission`

Cache: `Cache-Control: private, max-age=60, stale-while-revalidate=300`

### 3B. Course Vitals Bar

**Modified file:** `app/components/courses/CourseHeader.tsx`

Replace course description area with a vitals bar. Description moves to Settings tab (`CourseSettingsTab.tsx` — add a "Course Description" section at the top showing the editable description).

Layout — single horizontal row below course title:
```
32 enrolled . 4 ungraded . Next due: Apr 8 . Avg: 87%
```

- Icon prefixes: `Users`, `ClipboardCheck`, `Calendar`, `TrendingUp`
- `ungraded` clickable → Grades tab
- `Next due` clickable → Assignments tab
- Mobile: wraps to 2 rows

Data: `courseSummary` prop passed from `EducatorCourseView`.

### 3C. Action Required Card

**New file:** `app/components/courses/ActionRequiredCard.tsx`

First widget on Overview tab. Only renders when at least one action item exists.

Layout:
```
+-- Action Required ----------------------------+
|                                               |
|  [ClipboardList]  4 submissions to grade  [->]|
|  [MessageSquare]  2 unanswered discussions[->]|
|  [Calendar]       Assignment 3 due in 2 days  |
|  [AlertTriangle]  3 students inactive 7+ days |
|  [AlertTriangle]  1 student missed 2+ assigns |
|                                               |
+-----------------------------------------------+
```

- `border-l-4 border-amber-400 rounded-2xl shadow-sm`
- Each row clickable: Grade → Grades tab, discussions → Discussion tab
- Rows sorted by urgency: ungraded, unanswered, deadlines, at-risk
- Data: `courseSummary` prop

### 3D. Tab Badges

**Modified file:** `app/components/courses/CourseHeader.tsx`

Count badges on three tabs:
- **Assignments:** assignments due in next 7 days
- **Grades:** ungraded count (amber pill)
- **Discussion:** unanswered thread count

Badge style: `rounded-full bg-amber-100 text-amber-700 text-xs px-1.5`
Only renders when count > 0. Mobile: small dot above icon (no number).

### 3E. Wire Summary Data

**Modified files:** `app/courses/EducatorCourseView.tsx`, `app/courses/page.tsx`

- `page.tsx`: fetch `/api/courses/summary` on mount, pass to `CourseTriageGrid` and `EducatorCourseView`
- `EducatorCourseView`: accept `courseSummary` prop, pass to `CourseHeader` (vitals + badges) and `EducatorDashboard` (Action Required card)
- 60-second polling via `setInterval` to keep counts fresh. Cleanup on unmount.

---

## Layer 4: Sandy Proactive Card

Static course insights + on-demand Haiku analysis for deeper intelligence.

### 4A. Static Course Insights

**New files:**
- `app/components/courses/SandyInsightsCard.tsx`
- `app/lib/course-insights-service.ts`
- `app/api/courses/[id]/insights/route.ts`

Renders on Overview tab after Action Required, before This Week. Sandy avatar + computed insights.

`buildCourseInsights(courseId)` computes up to 3 insights, prioritized:

| Priority | Insight | Example |
|----------|---------|---------|
| 1 | Lowest-performing module | "Module 4 has the lowest average score (68%). Consider reviewing the material." |
| 2 | Engagement drop | "Submissions are down 30% this week compared to your recent average." |
| 3 | Inactive students | "3 students haven't been active in over a week." |
| 4 | High performers | "2 students are consistently scoring above 95% — ready for enrichment." |
| 5 | Upcoming crunch | "Students have 3 assignments due next week. Consider spacing them out." |

Rules:
- Max 3 insights (top 3 by priority with non-null data)
- Zero qualifying insights → card doesn't render
- Each insight is one sentence, Sandy's conversational tone
- `actionTab` field links each insight to a relevant tab

API: `GET /api/courses/[id]/insights`
Auth: `requireCourseOwner`
Cache: `Cache-Control: private, max-age=300` (5 min)

### 4B. On-Demand Haiku Analysis

Button below static insights: "Ask Sandy for deeper analysis" (`Sparkles` icon).

**New API route:** `app/api/courses/[id]/insights/deep/route.ts`

- Auth: `requireCourseOwner`
- Gathers: grade distribution per assignment, submission timeline, engagement summary, at-risk counts
- Calls Haiku with structured prompt asking for 2-3 actionable observations referencing specific modules and time periods
- Returns `{ analysis: string, generatedAt: string }`
- Non-streaming (Haiku is fast enough for 2-3 sentences)
- Rate limit: 10 calls per course per hour via `@upstash/ratelimit`

UI behavior:
1. Tap → "Sandy is thinking..." loading state
2. Response renders in `bg-blue-50 rounded-xl p-4` block below static insights
3. Cached in `localStorage` key `sandy-deep-insight:${courseId}`, TTL 30 min
4. Fresh cache → show immediately with "Refresh" button instead of "Ask Sandy"
5. Haiku failure → "Sandy couldn't analyze right now. Try again in a few minutes." Silent degradation.

### 4C. Data Flow

```
EducatorCourseView
  +-- fetches /api/courses/{id}/insights (static, 5min cache)
       +-- passes insights[] to SandyInsightsCard
            +-- renders static insights
            +-- "Deeper analysis" button -> POST /api/courses/{id}/insights/deep
                 +-- renders Haiku response below
```

Standalone feature. No changes to existing Sandy concierge or suggestions infrastructure.

---

## Layer 5: Cross-Cutting Polish

Mobile tabs, keyboard shortcuts, label renames, button hierarchy.

### 5A. Mobile Icon Tabs

**Modified file:** `app/components/courses/CourseHeader.tsx`

On `< sm` (640px), tabs switch to icon-only with small labels:

```
[Overview] [Assign] [Grade] [Cont] [Map] [Disc] [Set]
  icon      icon     icon    icon   icon  icon   icon
```

Icons: `LayoutDashboard`, `FileText`, `GraduationCap`, `BookOpen`, `Map`, `MessageSquare`, `Settings`

- Full text: `<span className="hidden sm:inline">{label}</span>`
- Mobile abbreviation: `<span className="sm:hidden text-[10px]">{short}</span>`
- Icon: `size-5` mobile, `size-4 mr-1.5` desktop
- Layout: `flex justify-around` mobile, `flex gap-1` desktop
- Mobile badges: `absolute -top-1 -right-1` dot (`size-2 rounded-full`), no number
- Active: `border-b-2 border-blue-600`

### 5B. Keyboard Shortcuts

**New files:**
- `app/hooks/useKeyboardShortcuts.ts`
- `app/components/courses/ShortcutHelpTooltip.tsx`

Chord-based system:

| Chord | Action |
|-------|--------|
| `g` then `o` | Overview tab |
| `g` then `a` | Assignments tab |
| `g` then `g` | Grades tab |
| `g` then `c` | Content tab |
| `g` then `m` | Course Map tab |
| `g` then `d` | Discussion tab |
| `g` then `s` | Settings tab |
| `[` | Previous course |
| `]` | Next course |
| `?` | Toggle shortcut help |

Implementation:
- `useEffect` with `keydown` on `document`
- Suppressed inside `input`, `textarea`, `select`, `[contenteditable]`
- `chordArmed` ref: `g` press arms, second key within 1.5s triggers, timeout resets
- `[`/`]` are direct (no chord)

Tooltip: fixed `bottom-4 right-4 z-30`, two-column list, dismissed by `?` or `Escape`.

Wiring in `EducatorCourseView.tsx`:
```typescript
useKeyboardShortcuts({
  onTabChange: (tabId) => handleTabChange(tabId),
  onCourseChange: (dir) => {
    const idx = courses.findIndex(c => c.id === selectedCourseId)
    const next = courses[idx + dir]
    if (next) selectCourse(next.id)
  },
})
```

### 5C. Label Renames

| Current | New | File |
|---------|-----|------|
| "Engagement Pulse" | "Student Activity" | `PulseTab.tsx` heading + `EducatorDashboard` references |
| "Exam Forge" | "AI Assessment Builder" | `ExamForgePanel.tsx` heading + Assignments tab references |
| "Go Live" | "Start Live Session" | `CourseHeader.tsx` |
| "Open Teaching Assistant" | "Ask Sandy" | `CourseHeader.tsx` |

### 5D. Header Action Button Hierarchy

**Modified file:** `app/components/courses/CourseHeader.tsx`

- **Primary (filled):** "Ask Sandy" — `bg-blue-600 text-white`
- **Secondary (outline):** "Add" dropdown — `border border-gray-300`
- **Tertiary (ghost):** "Start Live Session" + "Upload Syllabus" — `text-gray-600 hover:bg-gray-100`

Mobile `< sm`: "Ask Sandy" visible, others collapse into `MoreVertical` overflow menu.

---

## New Files Summary

| File | Layer | Purpose |
|------|-------|---------|
| `app/components/courses/CourseTriageGrid.tsx` | 2 | Card grid landing for cross-course triage |
| `app/api/courses/summary/route.ts` | 3 | Aggregated attention counts per course |
| `app/lib/course-summary-service.ts` | 3 | Business logic for summary queries |
| `app/components/courses/ActionRequiredCard.tsx` | 3 | Urgency card on Overview tab |
| `app/components/courses/SandyInsightsCard.tsx` | 4 | Sandy proactive insights |
| `app/lib/course-insights-service.ts` | 4 | Static insight computation |
| `app/api/courses/[id]/insights/route.ts` | 4 | Static insights API |
| `app/api/courses/[id]/insights/deep/route.ts` | 4 | On-demand Haiku analysis API |
| `app/hooks/useKeyboardShortcuts.ts` | 5 | Chord-based keyboard shortcut system |
| `app/components/courses/ShortcutHelpTooltip.tsx` | 5 | Shortcut help overlay |

## Modified Files Summary

| File | Layers | Changes |
|------|--------|---------|
| `app/courses/EducatorCourseView.tsx` | 1, 2, 3, 5 | Tab definitions, rendering switch, TAB_ALIAS map, courseSummary prop, keyboard shortcuts |
| `app/components/courses/CourseHeader.tsx` | 1, 3, 5 | 7 tabs with icons, vitals bar, tab badges, mobile icon tabs, button hierarchy, label renames |
| `app/components/courses/EducatorDashboard.tsx` | 1, 3, 4 | Remove MaterialsTab duplicate, demote Syllabus/Policy, add ActionRequiredCard + SandyInsightsCard |
| `app/components/courses/CourseSwitcher.tsx` | 2 | Badge pills, "All Courses" row, wider trigger |
| `app/courses/page.tsx` | 2, 3 | Conditional grid vs course view, summary fetch + polling |
| `app/components/courses/PulseTab.tsx` | 5 | Rename heading to "Student Activity" |
| `app/components/exam-forge/ExamForgePanel.tsx` | 5 | Rename heading to "AI Assessment Builder" |

## Deployment Order

1. **Layer 1** — deploy, verify tabs render correctly, old URLs still resolve
2. **Layer 2** — deploy, verify triage grid + compact switcher + page flow
3. **Layer 3** — deploy, verify summary API, vitals bar, Action Required card, badges
4. **Layer 4** — deploy, verify Sandy static insights + Haiku deep analysis
5. **Layer 5** — deploy, verify mobile tabs, keyboard shortcuts, labels, button hierarchy

Each layer is a separate commit. No layer depends on another for correctness, though the listed order is recommended — Layer 3 populates the skeleton placeholders from Layer 2.

---

## Handoff Prompts

### Layer 1 Handoff

```markdown
# Faculty Courses Command Center — Layer 1: Tab Restructure & Routing

## Context
You are implementing a 5-layer redesign of the faculty courses page (`/courses` for EDUCATOR role) based on the spec at `docs/superpowers/specs/2026-04-04-faculty-courses-command-center-design.md`. Read that spec first. Also read `CLAUDE.md` for project conventions.

No layers have been completed yet. You are starting from the current codebase.

## Goal
Implement ONLY Layer 1 (Tab Restructure & Routing). Do NOT touch Layers 2-5. Stop after these two tasks:

### Task 1: Restructure tab definitions and routing
**Files:** `app/courses/EducatorCourseView.tsx`, `app/components/courses/CourseHeader.tsx`

- Replace the 4 visible tab definitions with 7: Overview, Assignments, Grades, Content, Course Map, Discussion, Settings
- Each tab gets an icon field (LayoutDashboard, FileText, GraduationCap, BookOpen, Map, MessageSquare, Settings from lucide-react)
- Update `TAB_ALIAS` map: `dashboard`->`overview`, `analytics`->`grades`, `submissions`->`grades`, `gradebook`->`grades`, `pulse`->`overview`, `map`->`course-map`
- Update the rendering switch in EducatorCourseView to route each tab ID to its components:
  - `overview` -> EducatorDashboard
  - `assignments` -> AssignmentsTab + ExamForgePanel
  - `grades` -> GradebookTab + SubmissionsTab
  - `content` -> MaterialsTab + ToolsTab + LearningPathTab (with SegmentedControl sub-nav)
  - `course-map` -> CourseMapTab
  - `discussion` -> DiscussionTab
  - `settings` -> CourseSettingsTab + CoursePoliciesTab
- Fix tab URL sync: `onTabChange` should call `router.replace` to update `?tab=` param
- Render icon next to label in CourseHeader tab bar

### Task 2: Trim the Overview tab + Content sub-nav
**Files:** `app/components/courses/EducatorDashboard.tsx`, `app/courses/EducatorCourseView.tsx`

- EducatorDashboard: Remove the duplicate MaterialsTab half-width widget. Keep: This Week, Engagement Snapshot, Quick Actions, Lecture Debriefs, Office Hours. Move Syllabus Status + Policy Summary to the bottom (below Lecture Debriefs).
- EducatorCourseView (Content tab rendering): Add SegmentedControl with 3 segments (Materials | Tools | Learning Path) replacing the current vertical stacking of all three components. Each segment gets full viewport height.

## Verification
- All 7 tabs render and switch correctly
- Old URL params (`?tab=dashboard`, `?tab=analytics`, `?tab=gradebook`) resolve to correct new tabs
- Tab switching updates the URL `?tab=` param
- Page refresh preserves selected tab
- Content tab shows SegmentedControl with 3 segments
- No TypeScript errors: `npx tsc --noEmit`
- Build passes: `npm run build`

## Next
When done, generate the Layer 2 handoff prompt following the same format. Layer 2 is "CourseSwitcher Redesign" — see the spec for details.
```

### Layer 2 Handoff

```markdown
# Faculty Courses Command Center — Layer 2: CourseSwitcher Redesign

## Context
You are implementing Layer 2 of a 5-layer redesign of the faculty courses page. The full spec is at `docs/superpowers/specs/2026-04-04-faculty-courses-command-center-design.md`. Read it first. Also read `CLAUDE.md`.

Layer 1 (Tab Restructure & Routing) is complete: 7 visible tabs, URL sync, Content sub-nav, Overview trimmed.

## Goal
Implement ONLY Layer 2. Stop after these two tasks:

### Task 1: Course Triage Grid
**New file:** `app/components/courses/CourseTriageGrid.tsx`
**Modified file:** `app/courses/page.tsx`

- Create `CourseTriageGrid` component: responsive card grid (1 col mobile, 2 `md`, 3 `lg`)
- Each card shows: course code, title, material count. Use `border rounded-2xl shadow-sm` per platform manifest.
- Placeholder areas for enhanced counts (ungraded, at-risk, avg grade) — render as skeleton pulse elements for now. These get wired in Layer 3.
- Green left border for cards with no attention items, amber for cards that will have alerts (for now, all get neutral border since data isn't wired yet)
- "New Course" + "Import from Canvas" buttons at top-right (moved from CourseHeader)
- Modify `page.tsx`: if no `?course=` param, render CourseTriageGrid instead of auto-selecting first course. Click card -> URL updates to `?course={id}`.

### Task 2: Compact Course Switcher upgrade
**Modified file:** `app/components/courses/CourseSwitcher.tsx`

- Widen the trigger to show course code + title (not just code)
- Add placeholder badge pill areas next to each course in dropdown (skeleton for now, wired in Layer 3)
- Add "All Courses" row at top of dropdown: clears `selectedCourseId`, navigates to `/courses` (no params)
- Ensure clicking "All Courses" returns to the triage grid

## Verification
- Landing on `/courses` (no params) shows triage grid, not auto-selected course
- Clicking a card navigates to `?course={id}` and shows EducatorCourseView
- "All Courses" in compact switcher returns to triage grid
- Direct URL `?course={id}` still works (skips grid, goes straight to course)
- No TypeScript errors: `npx tsc --noEmit`
- Build passes: `npm run build`

## Next
When done, generate the Layer 3 handoff prompt. Layer 3 is "Data Surfacing" — summary API, vitals bar, Action Required card, tab badges.
```

### Layer 3 Handoff

```markdown
# Faculty Courses Command Center — Layer 3: Data Surfacing

## Context
You are implementing Layer 3 of a 5-layer redesign. Full spec: `docs/superpowers/specs/2026-04-04-faculty-courses-command-center-design.md`. Read it. Also read `CLAUDE.md`.

Layers 1-2 complete: 7 tabs with URL sync, CourseTriageGrid landing, compact switcher with "All Courses". Skeleton placeholders exist in the triage grid and switcher for badge data.

## Goal
Implement ONLY Layer 3. Stop after these two tasks:

### Task 1: Course Summary API + Vitals Bar
**New files:** `app/lib/course-summary-service.ts`, `app/api/courses/summary/route.ts`
**Modified files:** `app/courses/page.tsx`, `app/courses/EducatorCourseView.tsx`, `app/components/courses/CourseHeader.tsx`

- Create `course-summary-service.ts` with `getCourseSummaries(userId)` function. Returns per-course: enrollmentCount, ungradedCount, atRiskInactive7d, atRiskMissed2plus, unansweredDiscussions, upcomingDeadlines (next 7 days), averageGrade. Use `Promise.all` for parallel Prisma queries.
- Create API route: `requireEducatorUser`, call service, return JSON. Cache header: `private, max-age=60, stale-while-revalidate=300`.
- `page.tsx`: fetch `/api/courses/summary` on mount + 60s polling interval. Pass data to CourseTriageGrid (wire into skeleton placeholders — replace skeletons with real counts, add green/amber left border logic) and to EducatorCourseView as `courseSummary` prop.
- `CourseHeader.tsx`: replace course description area with vitals bar. Single row: `{enrolled} enrolled . {ungraded} ungraded . Next due: {date} . Avg: {grade}%`. Icon prefixes. Ungraded clickable -> Grades tab. Next due clickable -> Assignments tab. Mobile wraps to 2 rows. Move description to Settings tab — add a "Course Description" section at the top of `CourseSettingsTab.tsx`.
- Wire badge data into compact CourseSwitcher dropdown (replace skeleton pills with real counts).

### Task 2: Action Required Card + Tab Badges
**New file:** `app/components/courses/ActionRequiredCard.tsx`
**Modified files:** `app/components/courses/EducatorDashboard.tsx`, `app/components/courses/CourseHeader.tsx`

- Create ActionRequiredCard: renders as first widget on Overview. Only renders if any count > 0. Rows: ungraded submissions (-> Grades), unanswered discussions (-> Discussion), upcoming deadlines, inactive 7d students, missed 2+ students. `border-l-4 border-amber-400 rounded-2xl shadow-sm`. Sorted by urgency.
- Wire into EducatorDashboard as first child when `courseSummary` has action items.
- CourseHeader tab badges: Assignments (upcoming deadline count), Grades (ungraded count), Discussion (unanswered count). Style: `rounded-full bg-amber-100 text-amber-700 text-xs px-1.5`. Only show when > 0.

## Verification
- `/api/courses/summary` returns correct counts for demo educator (katie.thompson@uky.edu)
- Triage grid cards show real enrollment, ungraded, at-risk counts
- Vitals bar renders below course title with live data
- Action Required card appears on Overview when there are action items
- Tab badges show on Assignments, Grades, Discussion tabs
- Counts refresh every 60 seconds
- No TypeScript errors: `npx tsc --noEmit`
- Build passes: `npm run build`

## Next
When done, generate the Layer 4 handoff prompt. Layer 4 is "Sandy Proactive Card" — static insights + on-demand Haiku.
```

### Layer 4 Handoff

```markdown
# Faculty Courses Command Center — Layer 4: Sandy Proactive Card

## Context
You are implementing Layer 4 of a 5-layer redesign. Full spec: `docs/superpowers/specs/2026-04-04-faculty-courses-command-center-design.md`. Read it. Also read `CLAUDE.md`.

Layers 1-3 complete: 7 tabs, triage grid, compact switcher, summary API, vitals bar, Action Required card, tab badges.

## Goal
Implement ONLY Layer 4. Stop after these two tasks:

### Task 1: Static Course Insights
**New files:** `app/lib/course-insights-service.ts`, `app/api/courses/[id]/insights/route.ts`, `app/components/courses/SandyInsightsCard.tsx`
**Modified file:** `app/components/courses/EducatorDashboard.tsx`

- Create `course-insights-service.ts` with `buildCourseInsights(courseId)`. Computes up to 3 insights prioritized: (1) lowest-performing module by avg facultyScore, (2) engagement drop — this week's submission count vs prior 2-week avg, (3) inactive students from summary, (4) high performers with avg > 95%, (5) upcoming crunch — 3+ assignments due in same 7-day window. Return `CourseInsight[]` with `{ type, message, priority, actionTab? }`.
- API route: `requireCourseOwner`, call service, return insights. Cache: `private, max-age=300`.
- Create SandyInsightsCard: Sandy avatar + name, renders up to 3 insight rows. Each insight is one sentence in Sandy's conversational tone. Clickable insights switch to their `actionTab`. Card doesn't render if zero insights.
- Wire into EducatorDashboard: positioned after ActionRequiredCard, before ThisWeekCard.

### Task 2: On-Demand Haiku Deep Analysis
**New file:** `app/api/courses/[id]/insights/deep/route.ts`
**Modified file:** `app/components/courses/SandyInsightsCard.tsx`

- API route: `requireCourseOwner`. Gather grade distribution per assignment, submission timeline, at-risk summary (counts only, no student names). Call Haiku (`claude-haiku-4-5-20251001`) with prompt asking for 2-3 actionable observations. Return `{ analysis, generatedAt }`. Rate limit: 10/course/hour via `@upstash/ratelimit`. Wrap with `withErrorHandling`.
- SandyInsightsCard: add "Ask Sandy for deeper analysis" button (Sparkles icon) below static insights. Loading state: "Sandy is thinking...". Response renders in `bg-blue-50 rounded-xl p-4`. Cache in localStorage `sandy-deep-insight:${courseId}` with 30-min TTL. Fresh cache shows result immediately + "Refresh" button. Failure: "Sandy couldn't analyze right now. Try again in a few minutes."

## Verification
- `/api/courses/{id}/insights` returns 1-3 insights for demo course
- SandyInsightsCard renders on Overview with Sandy branding
- Clicking an insight switches to the correct tab
- "Ask Sandy for deeper analysis" calls Haiku and displays result
- Result is cached in localStorage, shows immediately on revisit within 30 min
- Rate limiting works (returns 429 after 10 calls/hour)
- Haiku failure degrades gracefully
- No TypeScript errors: `npx tsc --noEmit`
- Build passes: `npm run build`

## Next
When done, generate the Layer 5 handoff prompt. Layer 5 is "Cross-Cutting Polish" — mobile icon tabs, keyboard shortcuts, label renames, button hierarchy.
```

### Layer 5 Handoff

```markdown
# Faculty Courses Command Center — Layer 5: Cross-Cutting Polish

## Context
You are implementing Layer 5 (final layer) of a 5-layer redesign. Full spec: `docs/superpowers/specs/2026-04-04-faculty-courses-command-center-design.md`. Read it. Also read `CLAUDE.md`.

Layers 1-4 complete: 7 tabs, triage grid, compact switcher, summary API, vitals bar, Action Required card, tab badges, Sandy insights + Haiku analysis.

## Goal
Implement ONLY Layer 5. Stop after these two tasks:

### Task 1: Mobile Icon Tabs + Label Renames + Button Hierarchy
**Modified files:** `app/components/courses/CourseHeader.tsx`, `app/components/courses/PulseTab.tsx`, `app/components/exam-forge/ExamForgePanel.tsx`

- Mobile icon tabs (`< sm`): icon at `size-5` + truncated label at `text-[10px]` below. Full text hidden. Layout: `flex justify-around`. Badge dots: `absolute -top-1 -right-1 size-2 rounded-full` (presence only, no number). Active: `border-b-2 border-blue-600`.
- Desktop: icon at `size-4 mr-1.5` inline with full label text.
- Label renames: "Engagement Pulse" -> "Student Activity" (PulseTab heading + EducatorDashboard refs), "Exam Forge" -> "AI Assessment Builder" (ExamForgePanel heading + Assignments tab refs), "Go Live" -> "Start Live Session", "Open Teaching Assistant" -> "Ask Sandy".
- Button hierarchy: "Ask Sandy" = primary (`bg-blue-600 text-white`), "Add" dropdown = secondary (`border border-gray-300`), "Start Live Session" + "Upload Syllabus" = tertiary (`text-gray-600 hover:bg-gray-100`). Mobile: only "Ask Sandy" visible, others in `MoreVertical` overflow menu.

### Task 2: Keyboard Shortcuts
**New files:** `app/hooks/useKeyboardShortcuts.ts`, `app/components/courses/ShortcutHelpTooltip.tsx`
**Modified file:** `app/courses/EducatorCourseView.tsx`

- Create `useKeyboardShortcuts` hook: `keydown` listener on `document`. Chord system: `g` arms, second key within 1.5s triggers tab switch. Direct keys: `[`/`]` for course cycling, `?` for help toggle. Suppressed inside input/textarea/select/contenteditable.
- Props: `onTabChange(tabId)`, `onCourseChange(direction: -1 | 1)`.
- Tab chords: `g+o` Overview, `g+a` Assignments, `g+g` Grades, `g+c` Content, `g+m` Course Map, `g+d` Discussion, `g+s` Settings.
- Create ShortcutHelpTooltip: fixed `bottom-4 right-4 z-30 rounded-xl shadow-lg bg-white border`. Two-column list. Dismissed by `?` or Escape.
- Wire into EducatorCourseView with appropriate callbacks.

## Verification
- Mobile (< 640px): all 7 tabs visible as icons with short labels, no horizontal scroll needed
- Mobile badges show as dots (no numbers)
- Mobile header: only "Ask Sandy" button visible, others in overflow menu
- All label renames applied (check PulseTab, ExamForgePanel headings)
- Button hierarchy visually distinct (primary/secondary/tertiary)
- Keyboard: `g` then `o` switches to Overview, etc. for all 7 tabs
- `[`/`]` cycles courses in the switcher
- `?` toggles shortcut help tooltip
- Shortcuts don't fire when typing in inputs
- No TypeScript errors: `npx tsc --noEmit`
- Build passes: `npm run build`

## Done
This is the final layer. After verification, the Faculty Courses Command Center redesign is complete. Commit with message: `feat: complete faculty courses command center redesign (layers 1-5)`
```
