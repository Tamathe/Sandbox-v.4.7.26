# Courses Page Redesign — Phase 6: Cleanup & Extraction

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete orphaned components (783 dead lines) and extract remaining inline blocks from the three page-level files to bring them closer to the original design spec targets. No new features — pure structural cleanup.

**Architecture:** No new API endpoints. No new hooks beyond `useLinkToolModal`. All extractions are straight cut-paste of existing JSX into new component files.

**Tech Stack:** React 19, Next.js 16, TypeScript, Tailwind v4, lucide-react icons, existing components

**Date:** 2026-04-04
**Status:** Ready to execute
**Prereq:** Phase 5 complete — dashboard grids extracted, new widgets deployed
**Design spec:** `docs/superpowers/specs/2026-04-04-courses-page-redesign-design.md`

---

## Current State (after Phase 5)

```
app/courses/page.tsx                — 363 lines (target: ~50, realistic: ~200)
app/courses/StudentCourseView.tsx   — 263 lines (target: ~120, no extraction planned)
app/courses/EducatorCourseView.tsx  — 386 lines (target: ~150, realistic: ~220)
```

### Orphaned files (confirmed zero imports)

| File | Lines | Why orphaned |
|---|---|---|
| `app/components/courses/WeeklyPlanTab.tsx` | 558 | Unreferenced since Phase 4 tab consolidation |
| `app/components/courses/CourseStudyPanel.tsx` | 225 | Import removed in Phase 4 |

### Inline blocks to extract

| Parent File | Block | Lines | Target Component |
|---|---|---|---|
| `page.tsx` | `RelatedUKNews` function (lines 30-90) | ~61 | `RelatedUKNews.tsx` |
| `page.tsx` | Inline new course form (lines 206-276) | ~71 | `NewCourseForm.tsx` |
| `EducatorCourseView.tsx` | Content tab JSX (lines 215-267) | ~53 | `EducatorContentPanel.tsx` |
| `EducatorCourseView.tsx` | Analytics tab JSX (lines 269-312) | ~44 | `EducatorAnalyticsPanel.tsx` |
| `EducatorCourseView.tsx` | Tool link modal state + logic (lines 104-110, 151-175, 372-383) | ~40 | `useLinkToolModal.ts` hook |

### NOT in scope (low value)

- `StudentCourseView.tsx` tab branches — each is ~15 lines of composition, not worth new files
- Overlay wrappers — 7 lines each, already componentized
- `page.tsx` empty/loading states — 16-24 lines, fine inline
- Settings tab block — only 19 lines

---

## File Structure

| Action | File | Responsibility |
|---|---|---|
| **Delete** | `app/components/courses/WeeklyPlanTab.tsx` | Orphaned — 558 dead lines |
| **Delete** | `app/components/courses/CourseStudyPanel.tsx` | Orphaned — 225 dead lines |
| **Create** | `app/components/courses/RelatedUKNews.tsx` | Collapsible UK news articles for a course |
| **Create** | `app/components/courses/NewCourseForm.tsx` | Educator inline course creation form |
| **Create** | `app/components/courses/EducatorContentPanel.tsx` | Content tab: materials, tools, syllabus, learning path |
| **Create** | `app/components/courses/EducatorAnalyticsPanel.tsx` | Analytics tab: course map, pulse, gradebook, submissions, exam forge |
| **Create** | `app/hooks/useLinkToolModal.ts` | Tool link modal state, fetch, and link handler |
| **Modify** | `app/courses/page.tsx` | Replace inline blocks with component imports |
| **Modify** | `app/courses/EducatorCourseView.tsx` | Replace inline tabs + modal state with components/hook |

---

## Step-by-Step Implementation

### Step 1: Delete orphaned files

- [ ] **Step 1.1: Delete `WeeklyPlanTab.tsx`**

Delete `app/components/courses/WeeklyPlanTab.tsx` (558 lines). Confirm no imports exist first:

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && grep -r "WeeklyPlanTab" app/ --include="*.tsx" --include="*.ts" -l`

Expected: no results. Then delete.

- [ ] **Step 1.2: Delete `CourseStudyPanel.tsx`**

Delete `app/components/courses/CourseStudyPanel.tsx` (225 lines). Confirm no imports:

Run: `grep -r "CourseStudyPanel" app/ --include="*.tsx" --include="*.ts" -l`

Expected: no results. Then delete.

- [ ] **Step 1.3: Verify TypeScript compiles**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit 2>&1 | head -20`

---

### Step 2: Extract `RelatedUKNews` from `page.tsx`

**File:** `app/components/courses/RelatedUKNews.tsx`

- [ ] **Step 2.1: Create the component**

Move the entire `RelatedUKNews` function (lines 30-90 of `page.tsx`) into its own file. It's already a self-contained function component — just needs its own file with imports.

Imports it needs:
- `Link` from `next/link`
- `ExternalLink`, `Newspaper`, `ChevronDown`, `ChevronUp` from `lucide-react`
- `useEffect`, `useState` from `react`

Props (already defined by the inline function):
- `courseId: string`
- `userEmail: string`

The `UKNewsArticle` type moves with it.

- [ ] **Step 2.2: Wire into `page.tsx`**

Replace the inline `RelatedUKNews` function definition and `UKNewsArticle` type (lines 30-90) with:

```tsx
import RelatedUKNews from '../components/courses/RelatedUKNews'
```

Remove now-unused imports from `page.tsx`: `ExternalLink`, `Newspaper`, `ChevronDown`, `ChevronUp` (verify each isn't used elsewhere in the file first — `ChevronDown`/`ChevronUp` may be used by CourseSwitcher but CourseSwitcher is its own component, so they should be safe to remove).

Keep `Link` — it may be used elsewhere in page.tsx. Check before removing.

- [ ] **Step 2.3: Verify TypeScript compiles**

---

### Step 3: Extract `NewCourseForm` from `page.tsx`

**File:** `app/components/courses/NewCourseForm.tsx`

- [ ] **Step 3.1: Create the component**

Extract the inline `<form>` block (lines 206-276 of `page.tsx`) into a standalone component.

Props:
- `form: { courseCode: string; title: string; description: string; isPublic: boolean }`
- `onFormChange: (updates: Partial<{ courseCode: string; title: string; description: string; isPublic: boolean }>) => void`
- `onSubmit: (e: React.FormEvent) => void`
- `onCancel: () => void`
- `creating: boolean`

Imports: `Loader2` from lucide-react.

The form markup is a straight cut-paste. Replace `setNewCourseForm((p) => ({ ...p, ... }))` calls with `onFormChange({ field: value })`. Replace `setShowNewCourseForm(false)` with `onCancel()`. Replace `handleCreateCourse` with `onSubmit`.

- [ ] **Step 3.2: Wire into `page.tsx`**

Replace the inline form JSX with:

```tsx
{showNewCourseForm && isEducator && (
  <NewCourseForm
    form={newCourseForm}
    onFormChange={(updates) => setNewCourseForm((p) => ({ ...p, ...updates }))}
    onSubmit={handleCreateCourse}
    onCancel={() => setShowNewCourseForm(false)}
    creating={creatingCourse}
  />
)}
```

Remove `Loader2` from `page.tsx` imports if no longer used elsewhere in the file (check — it's used in the loading state too, so it likely stays).

- [ ] **Step 3.3: Verify TypeScript compiles**

---

### Step 4: Extract `useLinkToolModal` hook

**File:** `app/hooks/useLinkToolModal.ts`

- [ ] **Step 4.1: Create the hook**

Extract from `EducatorCourseView.tsx`:
- State declarations: `linkModalOpen`, `catalogTools`, `catalogLoading`, `toolSearch`, `linkingToolId`
- Functions: `fetchCatalogTools`, `handleLinkTool`

```tsx
interface UseLinkToolModalOptions {
  courseId: string
  userEmail: string
  onRefresh: () => Promise<void>
}
```

Returns:
```tsx
{
  linkModalOpen: boolean
  setLinkModalOpen: (v: boolean) => void
  catalogTools: CatalogTool[]
  catalogLoading: boolean
  toolSearch: string
  setToolSearch: (v: string) => void
  linkingToolId: string | null
  fetchCatalogTools: () => void
  handleLinkTool: (toolId: string) => Promise<void>
  openLinkModal: () => void   // sets open + triggers fetch
  closeLinkModal: () => void  // sets closed + clears search
}
```

Import `CatalogTool` from `../components/courses/course-types`. Import `courseHeaders`, `readJson` from `../components/courses/course-utils`.

- [ ] **Step 4.2: Verify TypeScript compiles**

---

### Step 5: Extract `EducatorContentPanel`

**File:** `app/components/courses/EducatorContentPanel.tsx`

- [ ] **Step 5.1: Create the component**

Extract the `activeTab === 'content'` branch from `EducatorCourseView.tsx`. This is the `<>` fragment containing MaterialsTab + ToolsTab + SyllabusStatusCard + LearningPathTab.

Props:
- `course: Course` (for `courseId`, `courseCode`)
- `currentUser: { email: string }`
- `detail: ReturnType<typeof useCourseDetail>`
- `canManage: boolean`
- `onOpenLinkModal: () => void`

Imports it needs (move from EducatorCourseView):
- `SyllabusStatusCard`
- `CollapsibleSection`
- `Route` icon from lucide-react

Dynamic imports it needs (move from EducatorCourseView):
- `MaterialsTab`
- `ToolsTab`
- `LearningPathTab`

- [ ] **Step 5.2: Verify TypeScript compiles**

---

### Step 6: Extract `EducatorAnalyticsPanel`

**File:** `app/components/courses/EducatorAnalyticsPanel.tsx`

- [ ] **Step 6.1: Create the component**

Extract the `activeTab === 'analytics'` branch from `EducatorCourseView.tsx`. This is the `<>` fragment containing CourseMapTab + PulseTab + GradebookTab + SubmissionsTab + ExamForgePanel.

Props:
- `course: Course` (for `courseId`, `courseCode`)
- `currentUser: { email: string; role: string }`
- `detail: ReturnType<typeof useCourseDetail>`
- `onTabChange: (tab: TabId) => void`

Imports it needs (move from EducatorCourseView):
- `CollapsibleSection`
- `SEEDED_COURSE_CODES` from `course-data`
- `FileText`, `FlaskConical`, `Map as MapIcon` icons from lucide-react

Dynamic imports it needs (move from EducatorCourseView):
- `CourseMapTab`
- `PulseTab`
- `GradebookTab`
- `SubmissionsTab`
- `ExamForgePanel`

- [ ] **Step 6.2: Verify TypeScript compiles**

---

### Step 7: Wire extractions into `EducatorCourseView`

- [ ] **Step 7.1: Replace inline content tab**

Replace the `activeTab === 'content'` branch with:

```tsx
<EducatorContentPanel
  course={course}
  currentUser={currentUser}
  detail={detail}
  canManage={canManage}
  onOpenLinkModal={linkModal.openLinkModal}
/>
```

- [ ] **Step 7.2: Replace inline analytics tab**

Replace the `activeTab === 'analytics'` branch with:

```tsx
<EducatorAnalyticsPanel
  course={course}
  currentUser={currentUser}
  detail={detail}
  onTabChange={setActiveTab}
/>
```

- [ ] **Step 7.3: Replace inline tool link modal state**

Replace state declarations + functions with:

```tsx
const linkModal = useLinkToolModal({
  courseId: course.id,
  userEmail: currentUser.email,
  onRefresh: detail.refreshSelectedCourse,
})
```

Update `LinkToolModal` props at the bottom to use `linkModal.*` accessors.

Update the `ToolsTab` `onOpenLinkModal` callback (now in `EducatorContentPanel`) to call `onOpenLinkModal` prop.

- [ ] **Step 7.4: Clean up unused imports from `EducatorCourseView`**

Remove imports that moved entirely to extracted components:
- `SyllabusStatusCard` (now only in EducatorContentPanel)
- `CollapsibleSection` (now only in EducatorContentPanel + EducatorAnalyticsPanel)
- `SEEDED_COURSE_CODES` (now only in EducatorAnalyticsPanel)
- `Route` icon (now only in EducatorContentPanel)
- `FileText`, `FlaskConical`, `Map as MapIcon` icons — check if still used. `FileText` is used in assignments tab (hidden). `FlaskConical` is used in assignments tab. `MapIcon` — check. If only used in analytics, remove.
- Dynamic imports: `MaterialsTab`, `ToolsTab`, `LearningPathTab`, `CourseMapTab`, `PulseTab`, `GradebookTab`, `SubmissionsTab`, `ExamForgePanel` — remove any that moved entirely. Keep any still referenced in hidden tabs (assignments tab uses `ExamForgePanel` and `GradebookTab`).
- `courseHeaders`, `readJson` — moved to `useLinkToolModal`. Check if still used in EducatorCourseView. If not, remove.

- [ ] **Step 7.5: Verify TypeScript compiles**

---

### Step 8: Verify line counts

- [ ] **Step 8.1: Check file sizes**

Run: `wc -l app/courses/page.tsx app/courses/StudentCourseView.tsx app/courses/EducatorCourseView.tsx`

Expected:
- `page.tsx` < 250 lines (down from 363)
- `StudentCourseView.tsx` unchanged at 263
- `EducatorCourseView.tsx` < 250 lines (down from 386)

- [ ] **Step 8.2: Confirm dead code deleted**

Run: `ls app/components/courses/WeeklyPlanTab.tsx app/components/courses/CourseStudyPanel.tsx 2>&1`

Expected: both files not found.

---

### Step 9: Verify build

- [ ] **Step 9.1: Run full build**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && npm run lint && NODE_OPTIONS="--max-old-space-size=8192" npm run build`

Expected: build passes, no new lint errors in changed files.

- [ ] **Step 9.2: Manual verification checklist**

Test as all 4 demo users:

- Educator (katie.thompson@uky.edu):
  - [ ] Dashboard tab renders (unchanged from Phase 5)
  - [ ] Content tab: Materials, Tools, Syllabus Status, Learning Path all render
  - [ ] Analytics tab: Course Map, Pulse, Gradebook, Submissions, Exam Forge all render
  - [ ] Settings tab works
  - [ ] "Link Tool" modal opens and functions
  - [ ] Course creation form submits successfully

- Student (tiana.the.student@uky.edu):
  - [ ] All tabs render identically to Phase 5

- Admin (heath.price@uky.edu): educator view works
- Staff (morgan.rivera@uky.edu): no crashes

- Course page with articles:
  - [ ] Related UK News section appears and expands

---

## Files Changed Summary

| Action | File |
|---|---|
| **Delete** | `app/components/courses/WeeklyPlanTab.tsx` |
| **Delete** | `app/components/courses/CourseStudyPanel.tsx` |
| **Create** | `app/components/courses/RelatedUKNews.tsx` |
| **Create** | `app/components/courses/NewCourseForm.tsx` |
| **Create** | `app/components/courses/EducatorContentPanel.tsx` |
| **Create** | `app/components/courses/EducatorAnalyticsPanel.tsx` |
| **Create** | `app/hooks/useLinkToolModal.ts` |
| **Modify** | `app/courses/page.tsx` (remove inline blocks, add imports) |
| **Modify** | `app/courses/EducatorCourseView.tsx` (replace tabs + modal state) |

## Net Impact

- **783 lines deleted** (orphaned files)
- **~270 lines extracted** from parent files into focused components
- **0 features changed** — pure structural refactor
