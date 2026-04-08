# Courses Page Redesign — Design Spec

**Date:** 2026-04-04
**Status:** Draft
**Approach:** Incremental refactor (Approach B) — page works at every commit

---

## 1. Problem Statement

The `/courses` page is a 1,200-line monolith (`app/courses/page.tsx`) that handles course listing, detail viewing, 8 tabs, role-based rendering, inline forms, and multiple overlays in a single `'use client'` component with ~20 pieces of local state.

Three core UX problems:

1. **Too many tabs (8)** — Overview, Course Tools, Assignments, Discussion, Course Map, Weekly Plan, Policies, Settings. Users don't know where to find things.
2. **Overview tab is a junk drawer** — collapsible sections stacked vertically with no clear hierarchy. Student and educator overviews both suffer.
3. **Student and educator experiences are too different to share one layout** — the page tries to be two apps. Role-specific logic is scattered throughout instead of cleanly separated.

Additionally, the 240px sidebar course list doesn't scale and wastes horizontal space.

---

## 2. Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Sidebar | Replace with top-level course switcher dropdown | Reclaim horizontal space, compact navigation |
| Tabs | Role-specific, 3-4 max per role | Reduce cognitive load, stop mixing concerns |
| Student landing | Dashboard with widget grid | Answer "what do I need to do right now?" at a glance |
| Educator landing | Phase-aware dashboard | Early semester = content building, mid-semester = monitoring |
| Architecture | Extract hooks + split by role, then redesign | Page works at every step, existing tab components stay intact |
| Migration | 3 phases, each independently shippable | Low risk, demostrable progress at every phase |

---

## 3. Page Layout & Navigation

### Course Switcher

A dropdown at the top of the page replaces the 240px sidebar. Shows current course code + title. Click to open a searchable dropdown listing all courses. Educators see a "+ New Course" option at the bottom of the dropdown.

Component: `CourseSwitcher.tsx` — replaces `CourseSidebar.tsx`.

### Role-Specific Tab Sets

**Student (3 tabs):**

| Tab | Contains |
|-----|----------|
| **Dashboard** | Widget grid: This Week, upcoming deadlines, recent grades, study guide, weekly schedule preview |
| **Assignments** | Assignments list, Exam Forge, My Grades |
| **Discussion** | Unchanged from current DiscussionTab |

**Educator (4 tabs):**

| Tab | Contains |
|-----|----------|
| **Dashboard** | Phase-aware: setup checklist OR engagement snapshot + weekly plan + lecture debriefs + office hours |
| **Content** | Materials, syllabus status, linked tools, learning path |
| **Analytics** | Course Map, Pulse, gradebook, submissions |
| **Settings** | Course config, policies, delete |

### What Moves Where

| Current Location | New Location |
|-----------------|--------------|
| Weekly Plan tab (educator) | Dashboard widget |
| Course Map tab (student "Weekly Schedule") | Dashboard widget |
| Policies tab (student) | Accessible via Sandy, not a top-level tab |
| Lecture Debriefs (educator overview) | Dashboard widget |
| Office Hours (educator overview) | Dashboard widget |
| Tools tab | Merged into Content (educator) or surfaced on Dashboard (student) |
| Course Map tab (educator) | Analytics tab |
| Pulse tab (educator) | Analytics tab |
| Gradebook (educator) | Analytics tab |
| Submissions (educator) | Analytics tab |

---

## 4. Student Dashboard

A widget grid — cards that answer "what do I need to do right now?" Single column on mobile, 2-column grid on desktop (`grid-cols-1 lg:grid-cols-2`). Cards use platform manifest styling (`border rounded-2xl shadow-sm`).

### Widgets (priority order, top-left to bottom-right)

| # | Widget | Source | Description |
|---|--------|--------|-------------|
| 1 | **This Week** | Existing `ThisWeekCard` | Upcoming deadlines, due assignments, scheduled sessions |
| 2 | **Course Timeline** | Existing `CourseTimeline` | Where you are in the semester |
| 3 | **Study Guide** | Existing `StudyGuideCard` | Quick access to AI-generated study materials |
| 4 | **Weekly Schedule** | New `WeeklyScheduleWidget` (reads same course-map API) | Current week's node titles + due dates as a compact list. "See full schedule" links to Assignments tab. Not a graph — just a text summary of this week's nodes. |
| 5 | **Recent Grades** | New `RecentGrades` widget | Last 3-5 graded items with scores. Tap to expand into Assignments tab |
| 6 | **Course Tools** | Derived from `linkedTools` | 3-4 linked tool icons with labels. "See all" links deeper |

### What's NOT on the Dashboard

- Full materials list (accessed via Study Guide or Sandy)
- Policy summary card (Sandy handles policy questions)
- Learning Map / Teach Back / Find Study Partners (contextual — Sandy suggests these)

**Micro-review modal** stays as-is — it's an interstitial on course entry, not a dashboard widget.

---

## 5. Educator Dashboard (Phase-Aware)

The dashboard adapts based on semester phase, detected from course map data.

### Phase Detection (`useSemesterPhase` hook)

| Phase | Condition | Priority |
|-------|-----------|----------|
| **Setup** | No confirmed course map, OR < 3 materials uploaded | Content building |
| **Active** | Course map confirmed, materials exist, current date within semester range | Monitoring |
| **Late** | Past 75% of semester timeline | Grading + wrap-up |

Phase is a UI hint — all content is always reachable via Content and Analytics tabs.

### Setup Phase Widgets

| # | Widget | Description |
|---|--------|-------------|
| 1 | **Setup Checklist** | Progress bar: syllabus uploaded? materials added? course map generated? tools linked? Each item is a CTA. |
| 2 | **Syllabus Status** | Existing `SyllabusStatusCard`, prominent position |
| 3 | **Quick Actions** | "Upload Syllabus", "Import from Canvas", "Build with AI" buttons |

### Active Phase Widgets

| # | Widget | Description |
|---|--------|-------------|
| 1 | **This Week** | What's due, what's live, upcoming deadlines from course map |
| 2 | **Engagement Snapshot** | New widget: submission rates, discussion activity, students falling behind. Summary cards. |
| 3 | **Weekly Plan** | Existing `WeeklyPlanTab` content, condensed |
| 4 | **Lecture Debriefs** | Recent/upcoming, collapsed |
| 5 | **Office Hours** | Next scheduled, quick-launch |

### Late Phase

Same as Active, but **gradebook summary** promoted to position 1 and a "Final Grades" CTA appears.

### Layout

Same 2-column widget grid as student dashboard. Consistent card styling.

---

## 6. Code Architecture

### Target File Structure

**Hooks** (state + data fetching):

| File | Responsibility |
|------|---------------|
| `app/hooks/useCourses.ts` | Course list fetching, course creation, Canvas import state |
| `app/hooks/useCourseDetail.ts` | Materials, linked tools, detail loading for selected course |
| `app/hooks/useCourseContext.ts` | Sandy context sync (localStorage + custom events) |
| `app/hooks/useSemesterPhase.ts` | Phase detection (setup/active/late) from course map + materials + date |

**Page-level components:**

| File | Responsibility | Est. Lines |
|------|---------------|------------|
| `app/courses/page.tsx` | Slim shell: auth, course switcher, role router | ~50 |
| `app/courses/StudentCourseView.tsx` | Student tabs (Dashboard, Assignments, Discussion) + tab rendering | ~120 |
| `app/courses/EducatorCourseView.tsx` | Educator tabs (Dashboard, Content, Analytics, Settings) + tab rendering | ~150 |

**Shared components** (new, in `components/courses/`):

| File | Responsibility |
|------|---------------|
| `CourseSwitcher.tsx` | Dropdown with search, replaces `CourseSidebar.tsx` |
| `CourseHeader.tsx` | Course code badge, title, description, action buttons (extracted from page.tsx inline header) |

**Dashboard widgets** (new directory `components/courses/dashboard/`):

| File | Responsibility |
|------|---------------|
| `StudentDashboard.tsx` | Widget grid, composes existing + new components |
| `EducatorDashboard.tsx` | Phase-aware widget grid |
| `EngagementSnapshot.tsx` | New widget: submission rates, flags |
| `SetupChecklist.tsx` | New widget: course setup progress |
| `RecentGrades.tsx` | New widget: last 3-5 graded items |

**Existing tab components stay untouched:**

`MaterialsTab`, `DiscussionTab`, `CourseMapTab`, `AssignmentsTab`, `GradebookTab`, `CourseSettingsTab`, `CoursePoliciesTab`, `WeeklyPlanTab`, `ToolsTab`, `PulseTab`, `LearningPathTab`, `SubmissionsTab`, `StudentGradesTab`, `LearningMapTab`, `CourseMapAnalytics` — all keep current interfaces, just composed differently.

**Deleted after migration:**

| File | Reason |
|------|--------|
| `CourseSidebar.tsx` | Replaced by `CourseSwitcher.tsx` |

`CollapsibleSection`, `EmptyState`, `RelatedUKNews` (currently inline in page.tsx) — promoted to shared if reused, or removed.

---

## 7. Migration Strategy (3 Phases)

Each phase ends with a fully working, shippable page.

### Phase 1: Extract and Split (No Visual Changes)

**Goal:** Break the monolith. Page looks identical to users.

| Step | Action |
|------|--------|
| 1 | Extract `useCourses`, `useCourseDetail`, `useCourseContext` hooks from page.tsx |
| 2 | Extract `CourseHeader` component from inline header JSX (lines 674-822) |
| 3 | Split rendering into `StudentCourseView` and `EducatorCourseView` — page.tsx becomes a thin shell that picks which to render based on role |
| 4 | All existing tabs wired through unchanged |

**Verification:** Navigate all tabs as all 4 demo users. Create course, enroll/leave, open material viewer, switch courses. Page must behave identically.

### Phase 2: Navigation Overhaul

**Goal:** Replace sidebar with top switcher, implement role-specific tab sets.

| Step | Action |
|------|--------|
| 1 | Build `CourseSwitcher` dropdown component |
| 2 | Replace `CourseSidebar` with `CourseSwitcher` in page.tsx |
| 3 | Implement student tab set (Dashboard, Assignments, Discussion) in `StudentCourseView` |
| 4 | Implement educator tab set (Dashboard, Content, Analytics, Settings) in `EducatorCourseView` |
| 5 | Remap existing tab content into new structure (e.g. Tools → Content, Gradebook → Analytics) |
| 6 | Delete `CourseSidebar.tsx` |

**Verification:** All content still reachable. No functionality lost — only reorganized.

### Phase 3: Dashboard Redesign

**Goal:** Transform overview tabs into widget dashboards.

| Step | Action |
|------|--------|
| 1 | Build `useSemesterPhase` hook |
| 2 | Build `StudentDashboard` — compose `ThisWeekCard`, `CourseTimeline`, `StudyGuideCard` + new `RecentGrades` |
| 3 | Build `EducatorDashboard` — phase-aware rendering with `SetupChecklist`, `EngagementSnapshot`, condensed `WeeklyPlanTab` |
| 4 | Wire dashboards into `StudentCourseView` and `EducatorCourseView` |
| 5 | Remove old overview tab content (collapsible sections, stacked cards) |

**Verification:** All 4 demo users see role-appropriate dashboards. Educator dashboard shows correct phase. `npm run lint && npx tsc --noEmit && npm run build` passes.

---

## 8. New Components Summary

| Component | Phase | Est. Lines |
|-----------|-------|------------|
| `useCourses.ts` | 1 | ~120 |
| `useCourseDetail.ts` | 1 | ~80 |
| `useCourseContext.ts` | 1 | ~30 |
| `CourseHeader.tsx` | 1 | ~150 |
| `StudentCourseView.tsx` | 1 | ~120 |
| `EducatorCourseView.tsx` | 1 | ~150 |
| `CourseSwitcher.tsx` | 2 | ~100 |
| `useSemesterPhase.ts` | 3 | ~50 |
| `StudentDashboard.tsx` | 3 | ~100 |
| `EducatorDashboard.tsx` | 3 | ~120 |
| `EngagementSnapshot.tsx` | 3 | ~80 |
| `SetupChecklist.tsx` | 3 | ~70 |
| `RecentGrades.tsx` | 3 | ~60 |
| `WeeklyScheduleWidget.tsx` | 3 | ~70 |

---

## 9. API Changes

No new API endpoints required. All data sources already exist:

- Course list: `GET /api/courses`
- Course detail (materials, tools): `GET /api/courses/[id]/materials`, `GET /api/courses/[id]/tools`
- Course map data (for phase detection): `GET /api/courses/[id]/course-map`
- Grades: `GET /api/courses/[id]/my-grades`
- Objectives (for engagement): `GET /api/courses/[id]/objectives`

The `EngagementSnapshot` widget may need a lightweight aggregation endpoint in the future, but Phase 3 can start with existing data and add it if needed.

---

## 10. What Is NOT In Scope

- Full mobile-first redesign (this is desktop-leads)
- New API endpoints (reuse existing)
- Study Partners redesign
- Gamification, XP, or aggregate metrics (intentionally deleted — do not rebuild)
- Course creation flow redesign (just moves into the switcher dropdown)
- Changes to individual tab component internals (MaterialsTab, DiscussionTab, etc.)
- Evaluator mode changes (evaluator-specific logic carries forward as-is)
