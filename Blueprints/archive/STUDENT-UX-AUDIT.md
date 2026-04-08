# Blueprint: Student UX Audit

**Status:** Approved — Ready for Implementation
**Scope:** Student-facing views only (home dashboard + hub/tools browser)
**Schema changes:** None
**New API routes:** None
**Risk surface:** `ToolCard.tsx` (shared component, 3 consumers), `page.tsx` (home dashboard)

---

## File Inventory

| File | Path (relative to `the-sandbox/`) | Changes |
|------|-----------------------------------|---------|
| Home dashboard | `app/(app)/page.tsx` | P0 #1, P2 #8/#10/#11, P3 #12/#13 |
| ToolCard | `app/components/ToolCard.tsx` | P0 #3, P1 #4/#5, P3 #14 |
| ToolsBrowser | `app/components/ToolsBrowser.tsx` | P0 #2/#3, P2 #9 |
| Hub page | `app/(app)/hub/page.tsx` | P1 #6/#7, P2 #8 |

---

## P0 — High-Friction Fixes

### Task 1: Merge "Suggested For You" + "Recommended For You" → "Picked for You"

**File:** `app/(app)/page.tsx`

**Current state:**
- Lines 451-518: Fetches `/api/dashboard/suggested-tools` → `suggestedTools` state
- Lines 460-527: Fetches `/api/recommendations` → `recommendations` state
- Lines 1144-1176: Renders "Suggested For You" section (grid of 3 cards, `border-2 border-gray-200`)
- Lines 1178-1203: Renders "Recommended for You" section (grid of 3 cards, `border-2 border-[#0033A0]/20 bg-gradient-to-br from-blue-50`)

**Target state:**
- Keep both fetches (they serve different data sources; other consumers like Sandy may use them independently)
- Add a `useMemo` that merges results:
  ```ts
  const pickedForYou = useMemo(() => {
    // Start with recommendations (personalized, higher quality)
    const recIds = new Set(recommendations.map(r => r.toolId));
    const fromRecs = recommendations.slice(0, 3).map(r => ({
      id: r.toolId,
      name: r.toolName,
      category: r.category,
      reason: r.reason,
    }));
    // Backfill from suggested if < 3
    if (fromRecs.length < 3) {
      const backfill = suggestedTools
        .filter(t => !recIds.has(t.id))
        .slice(0, 3 - fromRecs.length)
        .map(t => ({
          id: t.id,
          name: t.name,
          category: t.category,
          reason: null,
        }));
      return [...fromRecs, ...backfill];
    }
    return fromRecs;
  }, [recommendations, suggestedTools]);
  ```
- Replace BOTH render sections with a single "Picked for You" section:
  - Gate: `isStudent && pickedForYou.length > 0`
  - Header: Sparkles icon + `text-sm font-bold text-gray-900 uppercase tracking-wide` "Picked for You"
  - Grid: `grid grid-cols-1 sm:grid-cols-3 gap-3`
  - Card style: `rounded-2xl border-2 border-gray-200 hover:border-[#0033A0] bg-white p-4 transition-all`
  - Each card: category dot + label, tool name (line-clamp-2), reason in italic blue (if present), else short description
  - Link: wraps each card → `/tools/${item.id}?launch=true`
- Delete the `suggestedLabel` state variable and its rendering (the subtitle is no longer needed)

**Sections removed:** "Where to Focus" standalone section (lines 1092-1142)

**"Where to Focus" → Course card amber badge:**
- Inside each course card's header area (near the course code), add:
  ```tsx
  {(() => {
    const struggling = objectiveProgress.filter(
      p => p.objective?.courseId === course.id &&
        (p.mastery === 'struggling' || (p.attempts > 0 && p.correct < p.attempts * 0.6))
    );
    return struggling.length > 0 ? (
      <Link href={`/courses/${course.id}`}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold hover:bg-amber-200 transition-colors">
        <Target className="w-2.5 h-2.5" /> {struggling.length} to review
      </Link>
    ) : null;
  })()}
  ```
- This replaces the entire "Where to Focus" section. Tapping navigates to `/courses/[id]`.

**Post-merge section order for returning student:**
1. Welcome greeting
2. Jump Back In (existing sessions)
3. Due Soon (upcoming deadlines)
4. My Courses (with amber badges)
5. Picked for You (merged recommendations, max 3)
6. NotebookWidget (existing, unchanged — left column bottom)

---

### Task 2: Make SimpleToolCard "Open →" Always Visible

**File:** `app/components/ToolsBrowser.tsx`, line 72

**Current:**
```tsx
<span className="text-[10px] font-semibold text-gray-300 group-hover:text-[#0033A0] transition-colors">Open →</span>
```

**Target:**
```tsx
<span className="text-[10px] font-semibold text-gray-400 transition-colors">Open →</span>
```

Remove `group-hover:text-[#0033A0]`. The text at `gray-400` is always visible. The whole card is already a hover-interactive link — the CTA confirms tappability without needing a hover state.

---

### Task 3: Neutralize Tool Card Border Colors

**File 1:** `app/components/ToolCard.tsx`

- Delete the `categoryBorderColor` map (lines 12-23)
- Replace usage at line 65: `const borderClass = 'border-gray-200 hover:border-[#0033A0]'`
- Keep the rest of the card unchanged

**File 2:** `app/components/ToolsBrowser.tsx`

- Delete the `CARD_BORDER` map (lines 37-47)
- Replace usage in SimpleToolCard: `border-2 border-gray-200 hover:border-[#0033A0]`

**NOT changed:** `hub/page.tsx` service section cards — those keep their per-section `color` prop since cards are grouped by category.

---

## P1 — Clutter Reduction

### Task 4: Remove Difficulty Badge from Browse Grid

**File:** `app/components/ToolCard.tsx`

- Remove the `difficultyColors` map (lines 38-42), `difficultyLabels` map (lines 44-48), and `difficultyTitles` map (lines 50-54)
- Remove the difficulty badge JSX (lines 116-125): the `<div className="mt-2 pt-2 border-t ...">` containing the difficulty span
- The difficulty badge remains on the `/tools/[id]` detail page (separate component, not in scope)
- The difficulty filter pills in `ToolsBrowser.tsx` advanced filters (lines 234-249) remain — users can still filter by difficulty

---

### Task 5: Replace Full-Width "Save to Library" with Bookmark Icon

**File:** `app/components/ToolCard.tsx`, lines 126-140

**Current:** Full-width button spanning the card bottom with "Save to Library" / "In Library" text.

**Target:** Small bookmark icon positioned top-right of the card (opposite corner from UK Official badge which is top-left area).

```tsx
{onToggleLibrary && (
  <button
    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleLibrary(tool.id, !inLibrary); }}
    className={`absolute top-3 right-3 p-1.5 rounded-lg transition-all ${
      inLibrary
        ? 'text-[#0033A0] bg-blue-50 hover:bg-blue-100'
        : 'text-gray-300 hover:text-[#0033A0] hover:bg-blue-50'
    }`}
    title={inLibrary ? 'Remove from library' : 'Save to library'}
  >
    <Bookmark className="w-4 h-4" fill={inLibrary ? 'currentColor' : 'none'} />
  </button>
)}
```

**Structural requirement:** The card's outer container needs `relative` added to its className (if not already present) to support the `absolute` positioning.

**Import:** Add `Bookmark` to the lucide-react import at the top of the file.

---

### Task 6: Make Hub Service Card "Launch →" Always Visible

**File:** `app/(app)/hub/page.tsx`, lines 402-404

**Current:**
```tsx
<div className="mt-auto flex items-center gap-1 text-xs font-semibold text-[#0033A0] opacity-0 group-hover:opacity-100 transition-opacity">
```

**Target:**
```tsx
<div className="mt-auto flex items-center gap-1 text-xs font-semibold text-[#0033A0]">
```

Remove `opacity-0 group-hover:opacity-100 transition-opacity`. The CTA is always visible.

---

### Task 7: Mute Featured Experience Border Colors

**File:** `app/(app)/hub/page.tsx`, lines 314-378

**Current borders:** `border-amber-200`, `border-blue-200`, `border-yellow-200`, `border-emerald-200`
**Target borders:** `border-amber-100`, `border-blue-100`, `border-yellow-100`, `border-emerald-100`

Change only the border intensity from `-200` to `-100`. Keep icon backgrounds and icon colors unchanged — those are inside the card and don't create the "paint swatch" grid effect.

---

## P2 — Simplify the Vibe

### Task 8: Standardize Section Header Typography

**Files:** `app/(app)/page.tsx`, `app/(app)/hub/page.tsx`

**Current Pattern A (most home sections):** `text-xs font-extrabold text-gray-400 uppercase tracking-widest`
**Current Pattern B (featured sections):** `text-base font-extrabold text-gray-900`

**Target (unified):** `text-sm font-bold text-gray-900 uppercase tracking-wide`

Apply to all section headers on the home page:
- "Jump Back In" (line ~889)
- "Due Soon" (line ~946)
- "My Courses" (line ~1005)
- "Picked for You" (new merged section)
- "Where to Focus" is deleted (Task 1)
- NotebookWidget has its own internal header — leave unchanged

Apply to hub page section headers:
- Each `HubSection` title at line ~385

**Do NOT change:** The greeting text (`text-2xl`), right-column card headers (those are widget titles, not section headers), or admin/educator section headers (out of scope).

---

### Task 9: Category Pills — Horizontal Scroll

**File:** `app/components/ToolsBrowser.tsx`, lines 197-212

**Current:** `flex-wrap` with `gap-1.5` — wraps to 2 rows on tablet.

**Target:** Horizontal scroll on overflow:
```tsx
<div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-hide">
```

Add `flex-nowrap` (implicit with overflow-x-auto). Add `scrollbar-hide` utility (Tailwind plugin or custom CSS: `-ms-overflow-style: none; scrollbar-width: none; &::-webkit-scrollbar { display: none }`).

If `scrollbar-hide` is not available in the project's Tailwind config, use inline style or add a one-line utility class in the global CSS file.

Each pill gets `flex-shrink-0` to prevent compression:
```tsx
<button className="flex-shrink-0 px-3 py-1 rounded-full border text-xs font-semibold ...">
```

---

### Task 10: Conditional Right Column Collapse

**File:** `app/(app)/page.tsx`

**Logic:** Compute a boolean `hasRightContent` based on the data conditions that gate each right-column widget:
```ts
const hasRightContent = useMemo(() => {
  if (!isStudent) return true; // Educator/admin right column has different content
  return !!(
    recentDraft ||
    (studentProfile?.upcomingDue?.length > 0) ||
    creatorToolCount > 0
  );
}, [isStudent, recentDraft, studentProfile, creatorToolCount]);
```

Apply to the grid container:
```tsx
<div className={`grid gap-6 ${hasRightContent ? 'grid-cols-1 lg:grid-cols-[1fr_300px]' : 'grid-cols-1 max-w-4xl'}`}>
```

The right column `<div>` still renders but will be empty (all children gated by their own conditions) — the grid simply doesn't allocate space for it when `hasRightContent` is false.

---

### Task 11: Spacing Hierarchy — Visual Grouping

**File:** `app/(app)/page.tsx`

**Current:** Left column uses `space-y-6` uniformly.

**Target:** Replace `space-y-6` on the left column with explicit spacing:
- Remove `space-y-6` from the left column container
- Add `mb-4` to: Welcome greeting wrapper, Jump Back In, Due Soon
- Add `mb-4` to: My Courses section
- Add `mt-8 mb-4` to: Picked for You section (creates visual break before discovery)
- Add `mt-8` to: NotebookWidget (if present)

This creates two visual groups:
1. **Your Work** (greeting → Jump Back In → Due Soon → My Courses) — tight 1rem gaps
2. **Explore** (Picked for You → Notebook) — separated by 2rem gap

---

## P3 — Polish

### Task 12: Deduplicate Course Card Progress Legend

**File:** `app/(app)/page.tsx`, lines 1039-1043

**Current:** Each course card renders its own 3-color legend (Mastered / Needs work / Not started).

**Target:** Remove the legend from inside individual course cards. Add it once above the courses grid:
```tsx
<div className="flex items-center gap-4 text-[10px] text-gray-400 mb-2">
  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Mastered</span>
  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Needs work</span>
  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200 border border-gray-300" /> Not started</span>
</div>
```

Place this immediately after the "My Courses" section header, before the course cards grid. Only render when `enrolledCourses.length > 0`.

---

### Task 13: Remove Hardcoded Course Tool Suggestion Row

**File:** `app/(app)/page.tsx`

- Delete the `COURSE_TOOL_SUGGESTIONS` constant (lines 257-269)
- Delete the "Try with this course:" row inside course cards (lines 1063-1073)
- The `border-t border-gray-100` divider above it also goes

This removes synthetic recommendations. The merged "Picked for You" section handles tool discovery with real personalization.

---

### Task 14: Standardize Emoji Size to text-3xl

**File:** `app/components/ToolCard.tsx`, line 78

**Current:** `text-4xl` on the emoji span.
**Target:** `text-3xl` — matches SimpleToolCard in ToolsBrowser.tsx (already `text-3xl` at line 68).

---

## Verification Checklist

After all changes, visually verify these surfaces:
- [ ] Home dashboard as `ian.mcclure.student@uky.edu` (student with sessions + courses)
- [ ] Home dashboard as `tiana.the@uky.edu` (student, different course load)
- [ ] Hub page (`/hub`) — service sections, Featured Experiences
- [ ] Hub tools tab (`/hub?tab=tools`) — ToolsBrowser grid
- [ ] `/tools` direct route — ToolCard grid
- [ ] Mobile viewport (375px) — no hidden CTAs, no overflow
- [ ] Confirm no TypeScript errors: `npx tsc --noEmit`

## Risk Notes

- **ToolCard.tsx** is the highest-risk file — used on browse grid, hub tools tab, and home recommendations. All three surfaces must be checked after P0/P1 changes.
- The "Where to Focus" removal (Task 1) is the most aggressive cut. If stakeholders object, it can be restored independently since it was a standalone section.
- No database migrations, no API changes, no new dependencies.
