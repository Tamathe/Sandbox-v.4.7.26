# The Sandbox — QA Fix Blueprint
### Codex Implementation Guide
### Based on Student UX Walkthrough · 2026-03-15

---

## Overview

24 issues were identified in a full student-role walkthrough of The Sandbox. This blueprint groups them into three execution tiers. Each issue includes the exact file, the problem, and the fix.

Do not make changes beyond what is specified. Do not refactor surrounding code. Do not add comments unless the logic is non-obvious.

---

## Tier 1: Fix Now (4 issues — highest impact)

---

### Fix #10 — Tool Detail: Chat Hidden By Default

**File:** `app/tools/[id]/page.tsx` · Line 90

**Problem:** `showChatbot` initializes to `false` unless the URL has `?inject=` or `?resumeSession=`. Students who navigate to a tool from the Marketplace land on a description page with no visible chat. They have to find and click a button to launch it. The expected behavior when clicking a tool is to use it immediately.

**Fix:**
```tsx
// BEFORE (line 90):
const [showChatbot, setShowChatbot] = useState(!!injectContext || !!resumeSessionId)

// AFTER:
const [showChatbot, setShowChatbot] = useState(true)
```

No other changes needed. The `setShowChatbot` call in any Launch button can remain — it's now a no-op on first render but doesn't hurt.

---

### Fix #4/#5 — Marketplace: Tab Placement + Default to Community Tab

**File:** `app/tools/page.tsx`

**Problem (two related issues):**
- The Marketplace/Community tab switcher is buried ~600px below the page header, below smart sections, search bar, and filter pills. Students don't see it.
- The Marketplace tab only shows tools with `approvalStatus: 'APPROVED'`. On a fresh/demo database, this tab will be empty. Students conclude the platform has no tools.

**Fix — Part A:** Move the tab switcher to the top of the Browse All section, immediately before the search bar. The current order is:

```
[Smart Sections]
[Browse All heading]
[Search bar]
[Filter pills]
[Tab switcher]   ← currently here
[Tool grid]
```

New order:
```
[Smart Sections]
[Browse All heading]
[Tab switcher]   ← move here
[Search bar]
[Filter pills]
[Tool grid]
```

**Fix — Part B:** Change the default active tab from `'marketplace'` to `'community'`.

Find the tab state initialization (look for `useState('marketplace')` or `useState<'marketplace' | 'community'>`) and change it:
```tsx
// BEFORE:
const [activeTab, setActiveTab] = useState<'marketplace' | 'community'>('marketplace')

// AFTER:
const [activeTab, setActiveTab] = useState<'marketplace' | 'community'>('community')
```

---

### Fix #16 — Library Page: Remove QuestPanel

**File:** `app/library/page.tsx`

**Problem:** The library page imports and renders the old DB-backed `QuestPanel` component for students (line 11 import, rendered at ~line 141). The home dashboard was updated to use `StudentQuestWidget` with the UK blue gradient and XP bar. Students see two completely different quest UIs depending on which page they're on.

**Fix:** Remove QuestPanel from the library page entirely. The library is a tool-management surface, not a gamification hub. Students can see their quests on the home dashboard.

Step 1 — Remove the import (line 11):
```tsx
// DELETE this line:
import QuestPanel from '../components/QuestPanel'
```

Step 2 — Remove the rendered component. Find and delete:
```tsx
{currentUser.role === 'STUDENT' && <QuestPanel />}
```

No replacement needed.

---

### Fix #13 — Sandcastle: Affordability Flicker

**File:** `app/sandcastle/page.tsx` · Line 28

**Problem:** `sandBalance` initializes to `null`. The affordability check elsewhere is:
```tsx
canAfford = sandBalance === null || sandBalance >= exp.sandCost
```
While the `/api/xp` call is loading, `null` causes ALL experiences to appear affordable (green "Launch" button). Paid experiences (50 Sand) briefly show as launchable, then flip to locked once the balance loads.

**Fix:** Initialize to `0` instead of `null` so that during load, the worst-case (no balance) is shown.

```tsx
// BEFORE (line 28):
const [sandBalance, setSandBalance] = useState<number | null>(null)

// AFTER:
const [sandBalance, setSandBalance] = useState<number>(0)
```

Then find any `{sandBalance !== null && ...}` conditional guards on the balance display card and remove the null check — the card should always render (it will just show `0` initially):

```tsx
// BEFORE:
{sandBalance !== null && (
  <div ...>...{sandBalance} Sand...</div>
)}

// AFTER:
<div ...>...{sandBalance} Sand...</div>
```

---

## Tier 2: Fix Soon (7 issues)

---

### Fix #11 — Post-Session XP Prompt

**File:** `app/components/ChatInterface.tsx`

**Problem:** After rating a session (End Session → stars → journal note), the student is left on the same tool page with the chat cleared. No feedback that XP was awarded. The motivation loop is broken.

**Fix:** After the session-end + rating submission API call completes successfully, show a dismissible banner. Add new state and render it above the starter questions or below the input:

```tsx
// 1. Add state near other useState declarations:
const [sessionJustCompleted, setSessionJustCompleted] = useState(false)

// 2. After the rating POST succeeds, set:
setSessionJustCompleted(true)

// 3. Add banner in JSX (above starter questions):
{sessionJustCompleted && (
  <div className="flex items-center justify-between rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm">
    <span className="font-semibold text-green-800">Session complete! XP awarded.</span>
    <Link href="/analytics/student" className="font-semibold text-[#0033A0] hover:underline">
      View progress →
    </Link>
    <button
      type="button"
      onClick={() => setSessionJustCompleted(false)}
      className="ml-3 text-green-400 hover:text-green-600"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
)}
```

`Link` is already imported. `X` is already imported from lucide-react.

---

### Fix #6 — Trending Section: Hide When No Sessions Exist

**File:** `app/tools/page.tsx`

**Problem:** The "Trending" smart section sorts by session count. On a fresh/demo database where no sessions exist, all tools have 0 sessions and "Trending" shows DB-order tools. This is misleading.

**Fix:** In the `useMemo` that builds the trending section, check the total sessions. If all tools have 0 sessions, return an empty array so the section doesn't render.

Find the trending useMemo (look for sort by `sessions` or `_count.sessions`). After sorting and slicing, add:

```tsx
// After sorting/slicing to get the top 4:
const totalSessions = sorted.reduce((sum, t) => sum + (t._count?.sessions ?? 0), 0)
return totalSessions > 0 ? sorted : []
```

The existing conditional `{trending.length > 0 && <SmartSection ...>}` will hide the section when empty. If that conditional doesn't already exist, add it.

---

### Fix #17 — Library: "Add to Library" Button for Already-Saved Tools

**File:** `app/library/page.tsx`

**Problem:** The Session History section shows "Add to Library" for all tools, including tools already saved. The API handles uniqueness silently, but students don't get feedback — the button appears broken.

**Fix:** Build a Set of saved tool IDs and check against it in the history row:

```tsx
// Add above the history JSX (library state is already loaded at this point):
const savedToolIds = new Set(library.map(entry => entry.toolId))

// In the history row, replace the unconditional button:
// BEFORE:
<button onClick={() => handleAddToLibrary(entry.toolId)}>
  <Plus className="w-4 h-4" /> Add to Library
</button>

// AFTER:
{savedToolIds.has(entry.toolId) ? (
  <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
    <BookMarked className="w-3.5 h-3.5" /> In Library
  </span>
) : (
  <button onClick={() => handleAddToLibrary(entry.toolId)}>
    <Plus className="w-4 h-4" /> Add to Library
  </button>
)}
```

`BookMarked` is already imported in this file.

---

### Fix #18 — Library: Remove Button Inaccessible on Touch

**File:** `app/library/page.tsx`

**Problem:** The remove button on library cards uses `opacity-0 group-hover:opacity-100`. On touch devices hover never fires, so students on mobile/iPad cannot remove saved tools.

**Fix:** Add `[@media(hover:none)]:opacity-100` to the button's className so it's always visible on touch-only devices:

```tsx
// Find the remove button (X icon inside a `group` parent). Change:
// BEFORE:
className="... opacity-0 group-hover:opacity-100 ..."

// AFTER:
className="... opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 ..."
```

This Tailwind arbitrary variant targets touch-only devices and makes the button persistently visible there. No layout change needed.

---

### Fix #20 — Logo Click Should Navigate Home

**File:** `app/components/Header.tsx`

**Problem:** Clicking the CATS-AI logo doesn't navigate home — it toggles/expands the logo image. Students expect logo click = navigate to `/`.

**Fix:** Find the logo element in Header.tsx. Wrap it in (or replace the current wrapper with) a `Link href="/"`:

```tsx
// BEFORE (logo with toggle behavior):
<button onClick={handleLogoToggle}>
  <Image src="/cats-ai-logo-v2.png" ... />
</button>

// AFTER:
<Link href="/">
  <Image src="/cats-ai-logo-v2.png" ... />
</Link>
```

If there's animated expand behavior that should be preserved, keep it on a separate secondary element. The logo image itself should always be a home link.

---

### Fix #7 — Filter UI Consistency in Marketplace

**File:** `app/tools/page.tsx`

**Problem:** Category uses pill buttons (clear, tappable) but Type, Difficulty, and Sort use `<select>` dropdowns (less prominent, harder on touch). No visual indicator when a non-default filter is active.

**Fix:** Convert the Type, Difficulty, and Sort `<select>` elements to pill-button groups matching the existing Category filter pattern. Example for Difficulty:

```tsx
// BEFORE:
<select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
  <option value="">All Difficulties</option>
  <option value="Introductory">Introductory</option>
  <option value="Intermediate">Intermediate</option>
  <option value="Advanced">Advanced</option>
</select>

// AFTER:
<div className="flex flex-wrap gap-2">
  {['', 'Introductory', 'Intermediate', 'Advanced'].map(d => (
    <button
      key={d}
      type="button"
      onClick={() => setDifficulty(d)}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        difficulty === d
          ? 'border-[#0033A0] bg-[#0033A0] text-white'
          : 'border-gray-200 bg-white text-gray-600 hover:border-[#0033A0]'
      }`}
    >
      {d || 'All'}
    </button>
  ))}
</div>
```

Apply the same pattern to Type and Sort. Remove the `<select>` elements once replaced.

---

## Tier 3: Polish (13 issues)

Complete Tier 1 and 2 first. These are lower-risk, lower-impact changes.

---

### Fix #1 — Stale Hardcoded Due Dates

**File:** `app/page.tsx` — `STUDENT_PROFILES` constant

**Problem:** Due dates are hardcoded to March 2026 and will feel stale after demo day.

**Fix:** Replace hardcoded date strings with relative offsets from `new Date()`. Import `addDays`, `differenceInDays`, `format` from `date-fns` (already installed):

```tsx
// Instead of:
{ title: 'Problem Set 4', dueDate: 'Mar 15, 2026', urgent: true }

// Use:
{
  title: 'Problem Set 4',
  dueDate: format(addDays(new Date(), 0), 'MMM d, yyyy'),  // today
  urgent: true
}
// For other items, use addDays(new Date(), 3), addDays(new Date(), 7), etc.
// urgent: true when differenceInDays(dueDate, new Date()) <= 3
```

---

### Fix #2 — Remove Bounty Board from Student Quick Access

**File:** `app/page.tsx`

**Problem:** Quick Access for students links to `/bounties` — an educator-facing feature.

**Fix:** Find the Quick Access links array for students. Remove the Bounty Board entry. Replace with a link to `/analytics/student` ("My Progress") or `/sandcastle` ("Sandcastle").

---

### Fix #3 — StudentQuestWidget: Hardcoded Streak

**File:** `app/components/StudentQuestWidget.tsx` · `app/page.tsx`

**Problem:** The widget shows "3 Day Streak" regardless of the student's actual streak.

**Fix — Step 1:** Add `streak` to the props interface in `StudentQuestWidget.tsx`:

```tsx
interface StudentQuestWidgetProps {
  sandBalance: number
  xp: number
  level: number
  streak: number  // ADD
}
```

Replace the hardcoded `3 Day Streak` text with `{streak} Day Streak`.

**Fix — Step 2:** In `app/page.tsx`, pass the actual streak value when rendering `StudentQuestWidget`. The streak is already available in `studentProfile` (the same data used for Learning Vitals). Pass it:

```tsx
<StudentQuestWidget
  sandBalance={xpData.sandBalance}
  xp={xpData.totalXP}
  level={levelInfo.level}
  streak={studentProfile.streak}  // ADD
/>
```

---

### Fix #9 — Ask Sandy: Clearer Positioning

**File:** `app/tools/page.tsx`

**Problem:** "Ask Sandy" button is inside the search bar row — students may confuse it with a search action.

**Fix:** Move it below the search bar as a standalone suggestion line:

```tsx
{/* Below the search input: */}
<p className="mt-2 text-xs text-gray-400">
  Not sure what you need?{' '}
  <button
    type="button"
    onClick={openConcierge}
    className="font-semibold text-[#0033A0] hover:underline"
  >
    Ask Sandy →
  </button>
</p>
```

Remove the button from inside the search input row.

---

### Fix #14 — Sandcastle: Sand Balance Skeleton

**File:** `app/sandcastle/page.tsx`

**Problem:** After Fix #13, the balance card always renders. But during load the value shows `0`, which may look wrong. Add a loading state.

**Fix:** Add a `balanceLoading` boolean state. Show a skeleton while loading:

```tsx
const [balanceLoading, setBalanceLoading] = useState(true)

// In the fetch useEffect, set setBalanceLoading(false) after the response resolves

// In the balance card, replace the amount span:
{balanceLoading ? (
  <div className="h-4 w-12 animate-pulse rounded bg-white/30" />
) : (
  <span>{sandBalance} Sand</span>
)}
```

---

### Fix #15 — Hide "Educator Tools" Category Filter from Students

**File:** `app/sandcastle/page.tsx`

**Problem:** Students can click the "Educator Tools" category and see tools not relevant to them.

**Fix:** Filter the category list based on role before rendering pills:

```tsx
const visibleCategories = currentUser.role === 'STUDENT'
  ? CATEGORY_ORDER.filter(c => c !== 'Educator Tools')
  : CATEGORY_ORDER
```

Use `visibleCategories` instead of `CATEGORY_ORDER` in the pill render loop.

---

### Fix #21 — Reorder Learn Sub-Menu

**File:** `app/components/Header.tsx`

**Problem:** Learn dropdown shows Courses first. For students with no assigned courses, this is a dead link. Marketplace is the primary student destination.

**Fix:** Reorder the Learn dropdown:
1. Marketplace (`/tools`)
2. My Library (`/library`) — students only
3. Courses (`/courses`)

---

### Fix #22 — ELI5 Button Grammar

**File:** `app/components/ChatInterface.tsx`

**Problem:** "Explain simpler" is grammatically awkward.

**Fix:**
```tsx
// BEFORE:
Explain simpler

// AFTER:
Simplify this
```

---

### Fix #23 — Empty Chat Input Hint

**File:** `app/components/ChatInterface.tsx`

**Problem:** The Send button looks grey/broken when the input is empty and the user first arrives. Creates "is this working?" doubt.

**Fix:** Add hint text below the input bar, visible only when input is empty and no messages exist:

```tsx
{input.trim() === '' && messages.length === 0 && (
  <p className="mt-1 text-center text-xs text-gray-400">
    Choose a starter question above, or type to begin
  </p>
)}
```

---

### Fix #24 — Chat Container Height Responsiveness

**File:** `app/components/ChatInterface.tsx`

**Problem:** Fixed `h-[600px]` chat container dominates small laptop screens (1280×800).

**Fix:**
```tsx
// BEFORE:
className="... h-[600px] ..."

// AFTER:
className="... h-[500px] lg:h-[600px] ..."
```

---

### Fix #8 — Most Used Sort Should Be Server-Side

**File:** `app/tools/page.tsx` + `app/api/tools/route.ts`

**Problem:** `sort === 'sessions'` fetches the 48 newest tools and sorts client-side. A popular old tool will never appear in Most Used.

**Fix — Client:** Pass the sort param to the API when `sort === 'sessions'`:

```tsx
// In the fetch URL builder, add:
if (sort === 'sessions') params.set('sort', 'sessions')
```

**Fix — Server:** In `app/api/tools/route.ts`, find the Prisma query's `orderBy`. Add a case for `sort === 'sessions'`:

```ts
orderBy: sort === 'sessions'
  ? { sessions: { _count: 'desc' } }
  : sort === 'upvotes'
  ? { upvotes: { _count: 'desc' } }
  : { createdAt: 'desc' }
```

Remove the client-side sort by sessions count once the server handles it.

---

### Fix #12 — Share Button: Touch/HTTP Fallback

**File:** `app/tools/[id]/page.tsx`

**Problem:** `navigator.clipboard.writeText` may fail silently on non-HTTPS or unsupported mobile browsers.

**Fix:** Add a try/catch with an `execCommand` fallback:

```tsx
const handleShare = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href)
  } catch {
    const input = document.createElement('input')
    input.value = window.location.href
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
  }
  setCopied(true)
  setTimeout(() => setCopied(false), 2000)
}
```

---

## Execution Order

Run these in order. Each is independent — they don't depend on each other.

| # | File | Change size |
|---|---|---|
| 1 | `app/tools/[id]/page.tsx` | 1 line (Fix #10) |
| 2 | `app/sandcastle/page.tsx` | 1 line + remove null guard (Fix #13) |
| 3 | `app/library/page.tsx` | Remove import + 1 JSX block (Fix #16) |
| 4 | `app/tools/page.tsx` | JSX reorder + 1 state default (Fix #4/#5) |
| 5 | `app/components/ChatInterface.tsx` | New state + 1 JSX block (Fix #11) |
| 6 | `app/library/page.tsx` | Computed Set + conditional render (Fix #17) |
| 7 | `app/library/page.tsx` | 1 className addition (Fix #18) |
| 8 | `app/components/Header.tsx` | Wrap logo in Link (Fix #20) |
| 9 | `app/tools/page.tsx` | Replace 3 selects with pill buttons (Fix #7) |
| 10 | Polish fixes | #1 #2 #3 #6 #8 #9 #12 #14 #15 #21 #22 #23 #24 |

---

## Files Modified (Summary)

| File | Fixes Applied |
|---|---|
| `app/tools/[id]/page.tsx` | #10, #12 |
| `app/tools/page.tsx` | #4, #5, #6, #7, #8, #9 |
| `app/api/tools/route.ts` | #8 (server-side sort) |
| `app/library/page.tsx` | #16, #17, #18 |
| `app/sandcastle/page.tsx` | #13, #14, #15 |
| `app/components/ChatInterface.tsx` | #11, #22, #23, #24 |
| `app/components/Header.tsx` | #20, #21 |
| `app/components/StudentQuestWidget.tsx` | #3 |
| `app/page.tsx` | #1, #2, #3 (streak prop) |

---

*QA report authored 2026-03-15 · The Sandbox / CATS-AI / University of Kentucky*
