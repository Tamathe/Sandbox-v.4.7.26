# Courses Page Redesign — Phase 3: Dashboard Widgets

**Date:** 2026-04-04
**Status:** Ready to execute
**Prereq:** Phase 2 complete — sidebar replaced with CourseSwitcher, tabs collapsed to role-specific sets
**Design spec:** `docs/superpowers/specs/2026-04-04-courses-page-redesign-design.md`

---

## Goal

Convert the student and educator Dashboard tabs from a linear list of collapsible sections into a responsive widget grid. Each widget is a self-contained card that loads its own data. Widgets can be reordered by the user (persisted in localStorage). No functionality changes — only how the dashboard content is spatially arranged.

Page must work at every commit. No functionality lost — only reorganized.

---

## Current State (after Phase 2)

```
app/courses/StudentCourseView.tsx  — Dashboard tab renders: StudyGuideCard, CourseTimeline, ThisWeekCard, 
                                     CollapsibleSection(Course Content), CollapsibleSection(Your Progress), 
                                     Find Study Partners link
app/courses/EducatorCourseView.tsx — Dashboard tab renders: SyllabusStatusCard, CoursePolicySummaryCard,
                                     MaterialsTab, CollapsibleSection(Learning Path), 
                                     CollapsibleSection(Lecture Debriefs), CollapsibleSection(Office Hours),
                                     CollapsibleSection(Progress/LearningMapTab)
```

Both dashboards are a vertical stack of sections inside a single `<div className="space-y-5">` (student) or a series of bordered divs (educator). CollapsibleSection is a local component in each file.

---

## Step-by-Step Implementation

### Step 1: Create `DashboardGrid.tsx` layout component

**File:** `app/components/courses/DashboardGrid.tsx` (~60 lines)

A responsive CSS grid container that arranges children into a widget layout.

```typescript
interface DashboardGridProps {
  children: React.ReactNode
}
```

**Layout rules:**
- Mobile (`<768px`): single column, full width
- Desktop (`>=768px`): 2-column grid with `gap-4`
- Some widgets span full width (marked via a wrapper), others take one column

**Implementation:**
```tsx
export function DashboardGrid({ children }: DashboardGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {children}
    </div>
  )
}

export function WidgetFull({ children }: { children: React.ReactNode }) {
  return <div className="md:col-span-2">{children}</div>
}

export function WidgetHalf({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}
```

No drag-and-drop yet. Phase 3 establishes the grid; reordering is a future enhancement.

**Verification:** Component renders, children lay out in 2-col grid on desktop, 1-col on mobile.

---

### Step 2: Create `DashboardWidget.tsx` card wrapper

**File:** `app/components/courses/DashboardWidget.tsx` (~50 lines)

A standardized card wrapper that every dashboard widget renders inside. Replaces the ad-hoc `CollapsibleSection` pattern.

```typescript
interface DashboardWidgetProps {
  title: string
  icon?: LucideIcon
  collapsible?: boolean          // default true
  defaultOpen?: boolean          // default true
  children: React.ReactNode
  action?: React.ReactNode       // optional top-right action button/link
}
```

**Design:**
- Card: `rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden`
- Header: `px-4 py-3 flex items-center justify-between border-b border-gray-100` with icon + title + optional action
- If collapsible: chevron toggle on the left of the title (same as current CollapsibleSection behavior)
- Body: `px-4 py-4` when open

**Verification:** Renders with title, collapses/expands, shows action slot.

---

### Step 3: Convert student Dashboard to widget grid

**File:** `app/courses/StudentCourseView.tsx`

Replace the current `activeTab === 'dashboard'` block with:

```
<DashboardGrid>
  <WidgetFull>
    <DashboardWidget title="This Week" icon={Calendar}>
      <ThisWeekCard ... />
    </DashboardWidget>
  </WidgetFull>

  <WidgetFull>
    <DashboardWidget title="Timeline" icon={Clock}>
      <CourseTimeline ... />
    </DashboardWidget>
  </WidgetFull>

  {detail.materials.length > 0 && (
    <WidgetHalf>
      <DashboardWidget title="Study Guide" icon={BookOpen}>
        <StudyGuideCard ... />      /* move from above the tab panel into the grid */
      </DashboardWidget>
    </WidgetHalf>
  )}

  <WidgetHalf>
    <DashboardWidget title="Course Content" icon={BookOpen} defaultOpen={false}>
      <MaterialsTab ... />
      <CoursePolicySummaryCard ... />
    </DashboardWidget>
  </WidgetHalf>

  {detail.hasMaterials && (
    <WidgetFull>
      <DashboardWidget title="Your Progress" icon={Map}>
        <LearningMapTab ... />
      </DashboardWidget>
    </WidgetFull>
  )}

  <WidgetHalf>
    <DashboardWidget title="Teach It Back" icon={GraduationCap} defaultOpen={false}>
      <TeachBackSection ... />
    </DashboardWidget>
  </WidgetHalf>
</DashboardGrid>
```

**Key changes:**
1. StudyGuideCard moves from above the tab panel INTO the grid as a widget.
2. Remove the standalone `StudyGuideCard` render that currently sits outside/above the tab panel content.
3. "Find Study Partners" link moves into a small widget or stays as a footer link below the grid.
4. Remove the local `CollapsibleSection` component from StudentCourseView — replaced by `DashboardWidget`.

**Verification:** Student dashboard shows widgets in 2-col grid on desktop, 1-col on mobile. All content still renders. StudyGuideCard appears once (inside grid, not duplicated above).

---

### Step 4: Convert educator Dashboard to widget grid

**File:** `app/courses/EducatorCourseView.tsx`

Replace the current `activeTab === 'dashboard'` block with:

```
<DashboardGrid>
  <WidgetFull>
    <DashboardWidget title="Syllabus Status" icon={FileText}>
      <SyllabusStatusCard ... />
    </DashboardWidget>
  </WidgetFull>

  <WidgetHalf>
    <DashboardWidget title="Policy Summary" icon={Shield}>
      <CoursePolicySummaryCard ... />
    </DashboardWidget>
  </WidgetHalf>

  <WidgetHalf>
    <DashboardWidget title="Materials" icon={BookOpen}>
      <MaterialsTab ... />
    </DashboardWidget>
  </WidgetHalf>

  {detail.linkedTools.length > 0 && (
    <WidgetFull>
      <DashboardWidget title="Learning Path" icon={Route}>
        <LearningPathTab ... />
      </DashboardWidget>
    </WidgetFull>
  )}

  <WidgetHalf>
    <DashboardWidget title="Lecture Debriefs" icon={BookOpen} defaultOpen={false}>
      <LectureDebriefSection ... />
    </DashboardWidget>
  </WidgetHalf>

  <WidgetHalf>
    <DashboardWidget title="Office Hours" icon={HelpCircle} defaultOpen={false}>
      <OfficeHoursSection ... />
    </DashboardWidget>
  </WidgetHalf>

  {detail.hasMaterials && (
    <WidgetFull>
      <DashboardWidget title="Progress" icon={Map}>
        <LearningMapTab ... />
      </DashboardWidget>
    </WidgetFull>
  )}
</DashboardGrid>
```

**Key changes:**
1. Remove inline `border-b border-gray-100` dividers — the grid gap handles spacing.
2. Remove the local `CollapsibleSection` component from EducatorCourseView — replaced by `DashboardWidget`.

**Verification:** Educator dashboard shows widgets in 2-col grid on desktop, 1-col on mobile. All content still renders.

---

### Step 5: Clean up CollapsibleSection

Both `StudentCourseView.tsx` and `EducatorCourseView.tsx` define their own local `CollapsibleSection` component. After converting dashboards to use `DashboardWidget`:

1. Check if `CollapsibleSection` is still used anywhere in each file (it may still be used in non-dashboard tabs like assignments).
2. If still used: leave it. If not used: remove the local definition.
3. If both files still need it, extract to a shared `app/components/courses/CollapsibleSection.tsx` to avoid duplication.

**Verification:** No duplicate component definitions. No unused code.

---

### Step 6: Verify build and all tabs

Run: `npm run lint && NODE_OPTIONS="--max-old-space-size=8192" npm run build`

Manual verification as all 4 demo users:
- [ ] Student Dashboard: widgets render in grid, StudyGuideCard inside grid (not duplicated above)
- [ ] Student Assignments + Discussion tabs still work
- [ ] Educator Dashboard: widgets render in grid
- [ ] Educator Content, Analytics, Settings tabs still work
- [ ] Hidden tabs (`?tab=assignments`, `?tab=course-map`, etc.) still render
- [ ] Material viewer overlay still works
- [ ] Mobile layout: single column, all widgets visible
- [ ] CourseSwitcher still works (Phase 2)

---

## Files Changed Summary

| Action | File |
|--------|------|
| **Create** | `app/components/courses/DashboardGrid.tsx` |
| **Create** | `app/components/courses/DashboardWidget.tsx` |
| **Modify** | `app/courses/StudentCourseView.tsx` (dashboard → widget grid, move StudyGuide into grid) |
| **Modify** | `app/courses/EducatorCourseView.tsx` (dashboard → widget grid) |
| **Maybe create** | `app/components/courses/CollapsibleSection.tsx` (shared, if still needed) |
