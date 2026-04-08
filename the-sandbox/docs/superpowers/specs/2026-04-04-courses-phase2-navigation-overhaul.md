# Courses Page Redesign — Phase 2: Navigation Overhaul

**Date:** 2026-04-04
**Status:** Ready to execute
**Prereq:** Phase 1 complete — monolith split into hooks + role views
**Design spec:** `docs/superpowers/specs/2026-04-04-courses-page-redesign-design.md`

---

## Goal

Replace the 240px sidebar course list with a compact top-of-page course switcher dropdown. Collapse 8 tabs into role-specific tab sets (3 for students, 4 for educators). No tab component internals change — only where they appear.

Page must work at every commit. No functionality lost — only reorganized.

---

## Current State (after Phase 1)

```
app/courses/page.tsx              (318 lines) — thin shell: auth, CourseSidebar, role router
app/courses/StudentCourseView.tsx (375 lines) — student tabs: overview, tools, assignments, discussion, course-map, policies
app/courses/EducatorCourseView.tsx(395 lines) — educator tabs: overview, tools, assignments, discussion, course-map, weekly-plan, policies, settings
app/components/courses/CourseHeader.tsx (205 lines) — shared header + tab bar
app/components/courses/CourseSidebar.tsx (198 lines) — 240px sidebar with search + new course form
app/hooks/useCourses.ts           (141 lines) — course list, selection, creation
app/hooks/useCourseDetail.ts      (135 lines) — materials, tools, detail loading
app/hooks/useCourseContext.ts     (35 lines)  — Sandy localStorage sync
```

The `useCourses` hook already manages: courses, selectedCourseId, showNewCourseForm, creatingCourse, newCourseForm, handleCreateCourse, showCanvasImport. All the state the new CourseSwitcher needs is already extracted.

---

## Step-by-Step Implementation

### Step 1: Build `CourseSwitcher.tsx`

**File:** `app/components/courses/CourseSwitcher.tsx` (~100 lines)

A dropdown at the top of the page that replaces the 240px sidebar. Functionality:
- Shows current course code + title in a button. Click opens a dropdown.
- Dropdown has a search input that filters by course code or title.
- Clicking a course calls `onSelect(courseId)`.
- Educators see a "+ New Course" button at the bottom of the dropdown, plus an "Import from Canvas" option.
- Click outside or pressing Escape closes the dropdown.
- Mobile: same component, full-width. Remove the current `<select>` mobile fallback from page.tsx.

**Props** (mirror what CourseSidebar currently receives from page.tsx):
```typescript
interface CourseSwitcherProps {
  courses: Course[]
  selectedCourse: Course | null
  onSelect: (courseId: string) => void
  isEducator: boolean
  onNewCourse: () => void          // opens the new course form/modal
  onCanvasImport: () => void       // opens canvas import modal
}
```

**Key design details:**
- Trigger button: `rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm` — shows `[courseCode] — [title]` with a ChevronDown icon.
- Dropdown: `absolute z-30 mt-1 w-80 max-h-96 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg`
- Search input at top of dropdown (only if > 3 courses).
- Each course row: code bold + title truncated + materials count. Active course highlighted with `bg-blue-50 text-[#0033A0]`.
- Footer section (educator only): "+ New Course" button + Canvas import icon button, same styling as current sidebar footer.
- Backdrop: `fixed inset-0 z-20` transparent click-away.

**Does NOT contain:** the new course creation form itself. That stays in page.tsx as a modal/inline form triggered by `onNewCourse`. The switcher just fires the callback.

**Verification:** Component renders, opens/closes, filters courses, calls onSelect.

---

### Step 2: Replace CourseSidebar with CourseSwitcher in page.tsx

**File:** `app/courses/page.tsx`

Changes:
1. Remove `import CourseSidebar` → add `import CourseSwitcher`.
2. Remove the `lg:grid-cols-[240px_1fr]` grid layout. The page becomes a single-column layout: `CourseSwitcher` above, main content below.
3. Replace the `<CourseSidebar ... />` block with `<CourseSwitcher ... />` placed above the `<section>` card.
4. Remove the mobile `<select>` fallback inside `<section>` (CourseSwitcher handles mobile).
5. The new course form: currently rendered inside CourseSidebar. Move it to page.tsx as an inline section or small modal below the switcher (triggered by `showNewCourseForm`). Keep the same form fields and handler — just relocate the JSX.

**Layout after change:**
```
<PageHeader />
<div max-w-6xl>
  <CourseSwitcher />           ← full-width, above content
  {showNewCourseForm && <NewCourseForm />}  ← inline, collapsible
  <section rounded-2xl>       ← full-width (no sidebar)
    <StudentCourseView /> or <EducatorCourseView />
    <RelatedUKNews />
  </section>
</div>
```

**Verification:** Can switch courses, create new course, import from Canvas. Page layout is single-column. All content still renders.

---

### Step 3: Implement student tab set in StudentCourseView

**File:** `app/courses/StudentCourseView.tsx`

Current student tabs: `overview, tools, assignments, discussion, course-map, policies` (6 tabs)

New student tabs (3):

| Tab ID | Label | Contains |
|--------|-------|----------|
| `dashboard` | Dashboard | Current overview content (ThisWeek, CourseTimeline, StudyGuide, CollapsibleSections) — unchanged for now, Phase 3 converts to widgets |
| `assignments` | Assignments | Current assignments tab content (AssignmentsTab, ExamForge, StudentGrades) — unchanged |
| `discussion` | Discussion | Current discussion tab — unchanged |

**What moves or hides:**
- `tools` tab → tools are accessible via Dashboard (linked tools shown in overview) and Sandy. No dedicated tab for students.
- `course-map` tab → stays accessible via a "Weekly Schedule" link on the Dashboard, but not a top-level tab. Add a `<Link>` or button in the dashboard section that sets `activeTab = 'course-map-hidden'` and renders CourseMapTab. Or simply keep it as a hidden tab accessible via URL param `?tab=course-map`.
- `policies` tab → accessible via Sandy. Not a top-level tab. Same hidden-tab pattern.

**Implementation approach:**
1. Update `visibleTabs` array: only `dashboard`, `assignments`, `discussion`.
2. Rename `overview` → `dashboard` in tab IDs. Update `TAB_ALIAS` to map `overview` → `dashboard`.
3. Keep `course-map` and `policies` as hidden tabs — they render if `activeTab` matches but don't appear in the tab bar. This preserves deep-link URLs.
4. The `tools` tab content: remove from student view entirely. Linked tools are already shown in the overview/dashboard section.

**Update CourseHeader.tsx:** The `visibleTabs` prop already controls what's shown. No changes needed to CourseHeader itself.

**Verification:** Student sees 3 tabs. Assignments and Discussion work identically. Dashboard shows all the current overview content. `?tab=course-map` still works as a deep link.

---

### Step 4: Implement educator tab set in EducatorCourseView

**File:** `app/courses/EducatorCourseView.tsx`

Current educator tabs: `overview, tools, assignments, discussion, course-map, weekly-plan, policies, settings` (8 tabs)

New educator tabs (4):

| Tab ID | Label | Contains |
|--------|-------|----------|
| `dashboard` | Dashboard | Current overview content (SyllabusStatus, Materials, LearningPath, LectureDebriefs, OfficeHours, Progress) — unchanged for now |
| `content` | Content | MaterialsTab + ToolsTab + SyllabusStatusCard + LearningPathTab |
| `analytics` | Analytics | CourseMapTab + PulseTab + GradebookTab + SubmissionsTab |
| `settings` | Settings | CourseSettingsTab + CoursePoliciesTab |

**What moves where:**
- `tools` tab → merged into Content tab
- `course-map` tab → moved into Analytics tab
- `weekly-plan` tab → stays in Dashboard as a collapsible section (already there in Phase 1 overview)
- `policies` tab → moved into Settings tab
- `assignments` tab → stays as a hidden tab (deep-linkable), content accessible from Analytics. Or: merge into Content tab below materials. **Decision: keep as hidden tab accessible via `?tab=assignments` — educators access assignments through Analytics gradebook.**
- `discussion` tab → hidden tab, accessible via `?tab=discussion` deep link and Sandy.

**Implementation approach:**
1. Update `visibleTabs`: only `dashboard`, `content`, `analytics`, `settings`.
2. Rename `overview` → `dashboard`. Update `TAB_ALIAS`.
3. Build `content` tab panel: render MaterialsTab at top, then ToolsTab below, then LearningPathTab if tools exist. Reuse existing components — just compose them vertically.
4. Build `analytics` tab panel: render CourseMapTab at top, then a section with PulseTab, GradebookTab, SubmissionsTab in collapsible sections.
5. Build `settings` tab panel: render CourseSettingsTab at top, CoursePoliciesTab below.
6. Keep `assignments`, `discussion`, `course-map`, `weekly-plan`, `policies` as hidden tabs for deep-link compat.

**Verification:** Educator sees 4 tabs. All content from old tabs reachable via new tabs. `?tab=assignments` deep link still works.

---

### Step 5: Remap tab aliases and update CourseHeader

**File:** `app/components/courses/course-types.ts`

Add `dashboard`, `content`, `analytics` to the `TabId` union type.

**File:** `app/components/courses/CourseHeader.tsx`

No structural changes — it already renders whatever `visibleTabs` is passed. Just verify it handles the new tab IDs.

**Files:** Both view files

Update `TAB_ALIAS` maps:
```typescript
// StudentCourseView
const TAB_ALIAS: Record<string, TabId> = {
  overview: 'dashboard',
  materials: 'dashboard',
  study: 'dashboard',
  path: 'dashboard',
  map: 'dashboard',
  submissions: 'assignments',
  gradebook: 'assignments',
  mygrades: 'assignments',
  pulse: 'dashboard',
  tools: 'dashboard',
  policies: 'policies',      // hidden tab, still renders
  'course-map': 'course-map', // hidden tab, still renders
}

// EducatorCourseView  
const TAB_ALIAS: Record<string, TabId> = {
  overview: 'dashboard',
  materials: 'content',
  study: 'content',
  path: 'content',
  tools: 'content',
  submissions: 'analytics',
  gradebook: 'analytics',
  pulse: 'analytics',
  map: 'analytics',
  'course-map': 'analytics',
  mygrades: 'analytics',
  'weekly-plan': 'dashboard',
  policies: 'settings',
  assignments: 'assignments',  // hidden tab
  discussion: 'discussion',    // hidden tab
}
```

**Verification:** Old bookmark URLs (`?tab=materials`, `?tab=gradebook`, etc.) still land on the correct new tab.

---

### Step 6: Delete CourseSidebar.tsx

**File to delete:** `app/components/courses/CourseSidebar.tsx`

Only after all references are removed. Grep for `CourseSidebar` to confirm no remaining imports.

**Verification:** `npm run lint && NODE_OPTIONS="--max-old-space-size=8192" npm run build` passes. No import errors.

---

## Final Verification Checklist

Run as all 4 demo users (heath, katie, tiana, morgan):

- [ ] CourseSwitcher shows, opens, filters, selects courses
- [ ] Creating a new course works (educator)
- [ ] Canvas import works (educator)
- [ ] Student sees 3 tabs: Dashboard, Assignments, Discussion
- [ ] Educator sees 4 tabs: Dashboard, Content, Analytics, Settings
- [ ] All content from old tabs is reachable in new structure
- [ ] Old URL params (`?tab=materials`, `?tab=gradebook`, etc.) resolve to correct new tab
- [ ] Material viewer overlay still works
- [ ] Link tool modal still works (educator)
- [ ] Sandy course context still syncs (check localStorage)
- [ ] Micro-review modal fires for students
- [ ] Related UK News still shows
- [ ] `npm run lint && NODE_OPTIONS="--max-old-space-size=8192" npm run build` passes

---

## Files Changed Summary

| Action | File |
|--------|------|
| **Create** | `app/components/courses/CourseSwitcher.tsx` |
| **Modify** | `app/courses/page.tsx` (remove sidebar grid, add switcher, relocate new course form) |
| **Modify** | `app/courses/StudentCourseView.tsx` (3 tabs + hidden tabs) |
| **Modify** | `app/courses/EducatorCourseView.tsx` (4 tabs + composite panels + hidden tabs) |
| **Modify** | `app/components/courses/course-types.ts` (add new TabId values) |
| **Delete** | `app/components/courses/CourseSidebar.tsx` |
