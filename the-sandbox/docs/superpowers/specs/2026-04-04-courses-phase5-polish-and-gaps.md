# Courses Page Redesign — Phase 5: Polish & Spec Gaps

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining gaps between the design spec (`docs/superpowers/specs/2026-04-04-courses-page-redesign-design.md`) and the current implementation. Add the missing educator widgets (This Week, Quick Actions, condensed Weekly Plan), add the Late-phase Final Grades CTA, and extract dashboard grids into dedicated components to bring view files closer to their target line counts.

**Architecture:** No new API endpoints. All data already available via existing endpoints or `useCourseDetail`. The main structural change is extracting the `<DashboardGrid>` JSX blocks from `StudentCourseView` and `EducatorCourseView` into dedicated `StudentDashboard.tsx` and `EducatorDashboard.tsx` components, as the original spec intended.

**Tech Stack:** React 19, Next.js 16, TypeScript, Tailwind v4, lucide-react icons, existing API routes (no new endpoints)

**Date:** 2026-04-04
**Status:** Ready to execute
**Prereq:** Phase 4 complete — new widgets deployed, educator dashboard is phase-aware
**Design spec:** `docs/superpowers/specs/2026-04-04-courses-page-redesign-design.md`

---

## Current State (after Phase 4)

```
app/courses/StudentCourseView.tsx    — 337 lines (target: ~120). Dashboard grid inline.
app/courses/EducatorCourseView.tsx   — 515 lines (target: ~150). Dashboard grid inline.
```

### Missing from design spec

| Spec Section | Item | Status |
|---|---|---|
| §5 Active Phase, Widget #1 | **This Week** widget for educator dashboard | Missing — only students have it |
| §5 Setup Phase, Widget #3 | **Quick Actions** ("Upload Syllabus", "Import from Canvas", "Build with AI") | Missing |
| §5 Active Phase, Widget #3 | **Weekly Plan** — condensed `WeeklyPlanTab` content | Missing — `WeeklyPlanTab.tsx` exists (558 lines) but is not referenced anywhere |
| §5 Late Phase | **Final Grades CTA** promoted to position 1 | Missing — Progress is promoted but no CTA |
| §6 Target File Structure | `StudentDashboard.tsx` and `EducatorDashboard.tsx` as separate components | Not extracted yet — dashboard grids are inline in the view files |

### Existing APIs used by new widgets (no new endpoints needed)

| Endpoint | Returns | Used by |
|---|---|---|
| `GET /api/courses/[id]/course-map` | `{ courseMap: { weeks: [...] } }` | Educator ThisWeekCard (already used by student) |
| `GET /api/courses/[id]/weekly-plan` | Weekly plan data (if exists) | Condensed WeeklyPlan widget |
| `GET /api/courses/[id]/gradebook-summary` | Grade stats | Final Grades CTA (check if endpoint exists, else use existing gradebook data) |

---

## File Structure

| Action | File | Responsibility |
|---|---|---|
| **Create** | `app/components/courses/StudentDashboard.tsx` | Extracted student dashboard grid |
| **Create** | `app/components/courses/EducatorDashboard.tsx` | Extracted educator phase-aware dashboard grid |
| **Create** | `app/components/courses/QuickActionsWidget.tsx` | Educator setup: 3 CTA buttons for syllabus/import/AI |
| **Create** | `app/components/courses/FinalGradesCTA.tsx` | Educator late phase: prominent gradebook link |
| **Modify** | `app/courses/StudentCourseView.tsx` | Replace inline dashboard grid with `<StudentDashboard>` |
| **Modify** | `app/courses/EducatorCourseView.tsx` | Replace inline dashboard grid with `<EducatorDashboard>` |

---

## Step-by-Step Implementation

### Step 1: Create `StudentDashboard.tsx`

**File:** `app/components/courses/StudentDashboard.tsx`

Extract the entire `<DashboardGrid>` block from `StudentCourseView.tsx` (the `activeTab === 'dashboard'` branch) into a standalone component.

- [ ] **Step 1.1: Create the component**

Props it needs from the parent:
- `course` — the Course object (for `course.id`, `course.courseCode`)
- `currentUser` — `{ email: string }` for API calls
- `detail` — the `useCourseDetail` return value (for `materials`, `linkedTools`, `hasLinkedTools`, `setViewerMaterialId`, `suggestionsByModule`, `setSuggestionsByModule`)
- `onTabChange` — callback to switch tabs (for "View all grades" / "See full schedule" links)

Move all dashboard-related imports from `StudentCourseView` into `StudentDashboard`:
- `Calendar`, `Clock`, `BookOpen`, `Star` from lucide-react
- `ThisWeekCard`, `CourseTimeline`, `StudyGuideCard`, `WeeklyScheduleWidget`, `RecentGradesWidget`
- `DashboardGrid`, `WidgetFull`, `WidgetHalf`, `DashboardWidget`

The JSX is a straight cut-paste of the current `<DashboardGrid>...</DashboardGrid>` block.

- [ ] **Step 1.2: Wire into StudentCourseView**

Replace the inline dashboard grid in `StudentCourseView` with:

```tsx
<StudentDashboard
  course={course}
  currentUser={currentUser}
  detail={detail}
  onTabChange={setActiveTab}
/>
```

Remove now-unused imports from `StudentCourseView` (`Calendar`, `Clock`, `BookOpen`, `Star`, `ThisWeekCard`, `CourseTimeline`, `StudyGuideCard`, `WeeklyScheduleWidget`, `RecentGradesWidget`, `DashboardGrid`, `WidgetFull`, `WidgetHalf`, `DashboardWidget`). Keep only what's used by non-dashboard tabs.

- [ ] **Step 1.3: Verify TypeScript compiles**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | head -20`

---

### Step 2: Create `QuickActionsWidget.tsx`

**File:** `app/components/courses/QuickActionsWidget.tsx`

Educator Setup phase widget: three buttons that route to the right tab/action.

- [ ] **Step 2.1: Create the widget**

Three CTAs:
1. **Upload Syllabus** — calls `onSwitchTab('content')` (where syllabus upload lives)
2. **Import from Canvas** — calls `onImportCanvas()` (triggers the Canvas import flow in CourseSwitcher or a modal)
3. **Build with AI** — calls `onSwitchTab('analytics')` (where course map generation lives)

Each button: a bordered card with icon + label, horizontal row on desktop, stacked on mobile.

Icons: `Upload`, `Download`, `Sparkles` from lucide-react.

Props:
- `onSwitchTab: (tab: string) => void`
- `onImportCanvas?: () => void` (optional — if Canvas import isn't easily triggerable, make this a link to `/courses?import=canvas` or similar)

Keep it simple — three styled buttons in a flex row.

- [ ] **Step 2.2: Verify TypeScript compiles**

---

### Step 3: Create `FinalGradesCTA.tsx`

**File:** `app/components/courses/FinalGradesCTA.tsx`

Educator Late phase: a prominent banner/card that links to the gradebook.

- [ ] **Step 3.1: Create the widget**

A compact banner with:
- "Final Grades" heading
- "Review and finalize grades for this course" description
- "Open Gradebook" button that calls `onSwitchTab('analytics')`

Styled as a blue-tinted card (bg-blue-50 border-blue-200) to stand out.

Props:
- `onSwitchTab: (tab: string) => void`

- [ ] **Step 3.2: Verify TypeScript compiles**

---

### Step 4: Create `EducatorDashboard.tsx`

**File:** `app/components/courses/EducatorDashboard.tsx`

Extract the educator dashboard grid, add the missing widgets, and compose everything.

- [ ] **Step 4.1: Create the component**

Props:
- `course` — Course object
- `currentUser` — `{ email: string; role: string }`
- `detail` — `useCourseDetail` return value
- `canManage` — boolean
- `phase` — `SemesterPhase` (from `useSemesterPhase`)
- `onTabChange` — callback to switch tabs

The dashboard layout per phase:

**Setup phase:**
```
1. SetupChecklist (WidgetFull) — existing
2. QuickActionsWidget (WidgetFull) — NEW
3. Syllabus Status (WidgetFull) — existing
4. Policy Summary (WidgetHalf) — existing
5. Materials (WidgetHalf) — existing
```

**Active phase:**
```
1. This Week (WidgetFull) — NEW for educator (reuse existing ThisWeekCard)
2. Engagement Snapshot (WidgetFull) — existing
3. Syllabus Status (WidgetFull) — existing
4. Policy Summary (WidgetHalf) — existing
5. Materials (WidgetHalf) — existing
6. Learning Path (WidgetFull, conditional) — existing
7. Lecture Debriefs (WidgetHalf) — existing
8. Office Hours (WidgetHalf) — existing
9. Progress (WidgetFull) — existing
```

**Late phase:**
```
1. FinalGradesCTA (WidgetFull) — NEW
2. Progress (WidgetFull) — existing, promoted
3. This Week (WidgetFull) — NEW for educator
4. Engagement Snapshot (WidgetFull) — existing
5. Syllabus Status (WidgetFull) — existing
6. Policy Summary (WidgetHalf) — existing
7. Materials (WidgetHalf) — existing
8. Learning Path (WidgetFull, conditional) — existing
9. Lecture Debriefs (WidgetHalf) — existing
10. Office Hours (WidgetHalf) — existing
```

Import `ThisWeekCard` from `../courses/ThisWeekCard` (same component students use).

- [ ] **Step 4.2: Wire into EducatorCourseView**

Replace the inline dashboard grid in `EducatorCourseView` with:

```tsx
<EducatorDashboard
  course={course}
  currentUser={currentUser}
  detail={detail}
  canManage={canManage}
  phase={phase}
  onTabChange={setActiveTab}
/>
```

Remove now-unused imports from `EducatorCourseView`. The `useSemesterPhase` hook call stays in `EducatorCourseView` (it owns the phase state).

- [ ] **Step 4.3: Verify TypeScript compiles**

---

### Step 5: Verify line counts improved

- [ ] **Step 5.1: Check file sizes**

Run: `wc -l app/courses/StudentCourseView.tsx app/courses/EducatorCourseView.tsx`

Target: StudentCourseView < 200 lines, EducatorCourseView < 250 lines. The extracted dashboard components absorb the widget grid JSX.

---

### Step 6: Verify build and lint

- [ ] **Step 6.1: Run full build**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && npm run lint && NODE_OPTIONS="--max-old-space-size=8192" npm run build`

Expected: build passes, no new lint errors in changed files.

- [ ] **Step 6.2: Manual verification checklist**

Test as all 4 demo users:

- Student Dashboard (tiana.the.student@uky.edu):
  - [ ] Dashboard renders identically to Phase 4 (extraction is invisible to users)
  - [ ] All widgets present and functional
  - [ ] Tab switching from widget CTAs works

- Educator Dashboard (katie.thompson@uky.edu):
  - [ ] Setup phase: SetupChecklist + QuickActions + SyllabusStatus visible
  - [ ] Active phase: This Week widget appears at top (NEW), Engagement visible
  - [ ] Late phase: FinalGradesCTA at top (NEW), Progress second, This Week visible
  - [ ] QuickActions buttons route to correct tabs
  - [ ] FinalGradesCTA "Open Gradebook" routes to analytics tab
  - [ ] All other tabs still work (Content, Analytics, Settings)

- Admin (heath.price@uky.edu): educator view works
- Staff (morgan.rivera@uky.edu): no crashes

---

## Files Changed Summary

| Action | File |
|---|---|
| **Create** | `app/components/courses/StudentDashboard.tsx` |
| **Create** | `app/components/courses/EducatorDashboard.tsx` |
| **Create** | `app/components/courses/QuickActionsWidget.tsx` |
| **Create** | `app/components/courses/FinalGradesCTA.tsx` |
| **Modify** | `app/courses/StudentCourseView.tsx` (replace inline grid with `<StudentDashboard>`) |
| **Modify** | `app/courses/EducatorCourseView.tsx` (replace inline grid with `<EducatorDashboard>`) |

## Design Debt Noted (NOT in scope)

- `WeeklyPlanTab.tsx` (558 lines) is unreferenced — consider condensing into a dashboard widget or deleting in a future cleanup pass
- View file line counts may still exceed spec targets due to non-dashboard tab rendering logic — further extraction of tab content into dedicated components would be a separate effort
- `CourseStudyPanel` import was removed in Phase 4 — verify component itself isn't orphaned
