# Architecture: Student Homepage v2

**Status:** Approved — ready to execute
**Date:** 2026-03-24
**Scope:** 7 improvements to the student homepage, designed as a sequential prompt chain

---

## Context

The student homepage was restructured in v1 to:
- Remove the PulseBar (GPA, credits, meals, streak numbers)
- Move Schedule / Inbox / Calendar to a 3-column top strip
- Fold "What's at Stake" into Sandy's Briefing as "Coming Up" due dates
- Convert Campus Life to tabbed layout with expandable details

This document covers 7 follow-up improvements. Each is scoped as an independent task with a continuation prompt for execution in a fresh Claude instance.

---

## Current State

| Component | File | Status |
|---|---|---|
| StudentHomepage | `app/components/student-home/StudentHomepage.tsx` | Restructured — 3-col strip, Sandy briefing with Coming Up |
| SandyBriefing | `app/components/student-home/SandyBriefing.tsx` | Has `stakes` prop, Coming Up section |
| CampusLife | `app/components/student-home/CampusLife.tsx` | Tabbed + expandable |
| BeaconCard | `app/components/student-home/BeaconCard.tsx` | 9 beacon types, full card with gradients |
| InboxPreview | `app/components/student-home/InboxPreview.tsx` | Fetches `/api/assistant/email/inbox` — returns `null` if empty |
| MiniCalendar | `app/components/student-home/MiniCalendar.tsx` | Fetches `/api/assistant/calendar` — returns `null` if empty |
| PulseBar | `app/components/student-home/PulseBar.tsx` | No longer imported — can be left as-is |
| StakesBoard | `app/components/student-home/StakesBoard.tsx` | No longer imported — can be left as-is |
| Data service | `app/lib/student-home-data.ts` | Generates all synthetic data including quickActions |

### Key Finding

The email (`/api/assistant/email/inbox`) and calendar (`/api/assistant/calendar`) API routes **exist and are functional** — they are NOT dead routes. The problem is the demo student (`tiana.the.student@uky.edu`) has no seeded email or calendar data, so both components return `null` and vanish from the 3-column strip. The fix is synthetic fallback data in the components, not new routes.

---

## Task Sequence

Each task is independent and should be executed in order. After each task, verify with `npx tsc --noEmit 2>&1 | grep student-home` (expect 0 errors from changed files).

---

### Task 1: Synthetic Fallback Data for Inbox & Calendar

**Goal:** The 3-column top strip (Schedule | Inbox | Calendar) should always show content in demo mode. When the API returns empty, fall back to realistic synthetic data.

**Files to modify:**
- `app/components/student-home/InboxPreview.tsx`
- `app/components/student-home/MiniCalendar.tsx`

**Design:**

**InboxPreview fallback** — If the API returns 0 emails, populate with synthetic data:

| From | Subject | Time |
|---|---|---|
| Prof. Rodriguez | Re: Con Law office hours Thursday | 2h ago |
| UK Financial Aid | FAFSA Renewal Reminder — Deadline April 15 | 5h ago |
| Career Services | Spring Career Fair — RSVP Open | 1d ago |

Mark the first two as unread.

**MiniCalendar fallback** — If the API returns 0 events, populate with synthetic data derived from Tiana's class schedule (already defined in `student-home-data.ts` as `SCHEDULE`). Map each class to a calendar event with proper ISO timestamps for the current week. This ensures the weekly dots and day-detail view are always populated.

**Implementation notes:**
- Import `getTimelineForDay` from `student-home-data.ts` for the calendar fallback
- Add fallback logic AFTER the fetch completes (not replacing the fetch)
- Keep the existing loading/empty patterns — just replace the "return null on empty" with "use fallback data"

**Verification:** Load the student homepage. All 3 columns should show content. InboxPreview shows 3 emails. MiniCalendar shows class dots for Mon-Fri.

---

### Task 2: Quick Action Chips Below Greeting

**Goal:** Render a row of contextual pill-style quick actions between the greeting and the BeaconCard.

**Files to modify:**
- `app/components/student-home/StudentHomepage.tsx` — render chips
- New component: `app/components/student-home/QuickActionChips.tsx`

**Design:**

A horizontally scrollable row of pill buttons. Each pill has:
- An icon (from lucide-react, mapped from `iconName`)
- Label text
- Optional badge (e.g., "3d" in red for urgent deadlines)

The data already exists: `simData.quickActions` returns 3-4 items from `buildQuickActions()` in `student-home-data.ts`. Currently this data is generated but never rendered.

**Styling:**
- `flex items-center gap-2 overflow-x-auto pb-1` container
- Each pill: `flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:border-[#0033A0]/30 hover:text-[#0033A0] transition-all whitespace-nowrap shadow-sm`
- Badge: `text-[10px] font-bold px-1.5 py-0.5 rounded-full` with dynamic color
- Icon mapping: `{ 'book-open': BookOpen, sparkles: Sparkles, 'graduation-cap': GraduationCap, users: Users, target: Target, compass: Compass, calendar: Calendar, briefcase: Briefcase }`

**Placement in StudentHomepage layout:**
```
Greeting + student info
QuickActionChips           ← NEW
BeaconCard
3-column strip...
```

**Verification:** 3-4 pills visible. "Study: Hallucination Hunt" pill has a red "3d" badge. Clicking pills navigates correctly.

---

### Task 3: Slim Down BeaconCard to Alert Bar

**Goal:** Reduce the BeaconCard from a full card with gradients/body text to a compact single-line alert bar. This eliminates redundancy with Sandy's Briefing (which now has Coming Up and insights).

**Files to modify:**
- `app/components/student-home/BeaconCard.tsx`

**Design:**

Replace the current multi-line card with a compact alert bar:
- Single row: `[icon] [title] — [subtitle] [action button]`
- Background color based on urgency: critical=red-50, warning=amber-50, info=blue-50, celebration=green-50
- Left border accent (4px) matching urgency color
- No body text, no secondary action, no GPA progress bar
- Keep the scholarship type's title/subtitle but lose the progress visualization
- Rest type keeps the crisis resources line as a subtle footer

**Height target:** ~48px single line instead of current ~120-200px card.

**Styling:**
```
flex items-center gap-3 px-4 py-2.5 rounded-xl border-l-4
[urgency-border-color] [urgency-bg-color]
```

- Title: `text-sm font-bold text-gray-900`
- Subtitle: `text-sm text-gray-600` (separated by em dash)
- Action: `text-xs font-semibold text-[#0033A0]` link
- Icon: `size-5` in a `size-8 rounded-lg` container

**Special case — rest beacon (late night):**
- Keep the compact bar format
- Below it, show a subtle `text-xs text-gray-400` line: "UK Counseling: (859) 257-8701 · Crisis Text Line: Text HOME to 741741"

**Verification:** BeaconCard is visually ~48px tall. All 9 beacon types render correctly as single-line bars. Scholarship shows title + subtitle inline. Rest mode has crisis footer.

---

### Task 4: Surface Due Dates on Course Cards

**Goal:** Each course card in "My Courses" shows the next assignment due for that course, connecting it to the Coming Up list.

**Files to modify:**
- `app/components/student-home/StudentHomepage.tsx` — pass stakes data to course cards

**Design:**

In the course card rendering section, cross-reference `simData.stakes` with each `course.courseCode`. If a matching stake exists, replace the "Next: [objective title]" line with:

```
Due: [stake.title] — [stake.dueLabel]    [urgency badge]
```

Example: `Due: Hallucination Hunt — Mar 27    This week`

**Logic:**
```typescript
const courseStake = simData.stakes.find(s => s.courseCode === course.courseCode)
```

If no matching stake, fall back to the existing `nextObjective` display. The urgency badge reuses the same styling as Sandy's Coming Up section (small pill with urgency color).

**Note:** The stakes data uses course codes like "TEK-100", "LAW 756", etc. The enrollment API returns `courseCode` on each course. These should match directly.

**Verification:** TEK-100 card shows "Due: Hallucination Hunt — Mar 27 · This week". LAW 756 shows "Due: Evidence Rules Exam — Apr 3 · Next week". Courses with no upcoming stakes still show the objective fallback.

---

### Task 5: Wire Campus Life "Learn More" Links

**Goal:** The "Learn more" buttons in expanded Campus Life cards should navigate somewhere meaningful.

**Files to modify:**
- `app/lib/student-home-data.ts` — add `href` field to `CampusLifeItem`
- `app/components/student-home/CampusLife.tsx` — use href in "Learn more" link

**Design:**

Add an optional `href` field to the `CampusLifeItem` interface:
```typescript
export interface CampusLifeItem {
  // ... existing fields
  href?: string
}
```

Set hrefs in `buildCampusLife()`:
- Basketball: `/community` (Community Pulse page)
- Dining: `/hub` (Hub has campus info)
- Career Fair: `/hub` (Career resources)
- Law Mixer: `/community`

In `CampusLife.tsx`, change the "Learn more" button to a `Link` component if `href` exists:
```tsx
{item.href ? (
  <Link href={item.href} className="...">Learn more <ArrowRight /></Link>
) : (
  <span className="... text-gray-300 cursor-not-allowed">Learn more</span>
)}
```

Also wire the top-level "See all" button to `/community`.

**Verification:** Clicking "Learn more" on basketball navigates to `/community`. "See all" navigates to `/community`.

---

### Task 6: Evening/Night Mode Adjustments

**Goal:** After 10 PM, the homepage should feel calmer — reduce campus activity noise, surface wellness content.

**Files to modify:**
- `app/components/student-home/StudentHomepage.tsx` — conditional rendering based on `simData.isLateNight`
- `app/lib/student-home-data.ts` — may need a `isEvening` flag (17:00-22:00)

**Design:**

When `simData.isLateNight` is true (10 PM - 6 AM):
1. **Hide Campus Life section entirely** — events aren't actionable at midnight
2. **Hide UKNow Feed** — news can wait
3. **Hide "Continue Where You Left Off"** — don't encourage more screen time
4. **Keep visible:** Greeting, Beacon (rest mode), top strip (tomorrow's schedule), Sandy's Briefing (wellness-focused insights already rotate by time), My Courses (still useful for checking)

When it's evening (5 PM - 10 PM) — no layout changes needed, the beacon already says "Classes done" and Sandy's insights rotate to wellness/evening content. This is handled.

**Implementation:**
```tsx
{!simData.isLateNight && (
  <div className="mt-10 space-y-5">
    <AnnouncementsBanner ... />
    <CampusLife ... />
    <UKNowFeed ... />
    {libraryEntries.length > 0 && ( ... )}
    {email && <LearningRecapCard ... />}
  </div>
)}
```

**Verification:** Set system clock to 11 PM (or temporarily override `isLateNight` to `true`). Campus Life, UKNow, Continue, and Learning Recap should all disappear. Beacon shows rest mode. Sandy shows wellness insights.

---

### Task 7: Mobile Polish — Swipeable Top Strip

**Goal:** On mobile, the 3-column top strip (Schedule | Inbox | Calendar) becomes a horizontally swipeable card strip instead of stacking vertically.

**Files to modify:**
- `app/components/student-home/StudentHomepage.tsx` — wrap top strip in swipeable container

**Design:**

On `lg:` and above, keep the current `grid grid-cols-3` layout. On mobile, use a horizontal scroll snap container:

```tsx
<div className="mt-6">
  {/* Desktop: 3-column grid */}
  <div className="hidden lg:grid lg:grid-cols-3 gap-4">
    <TodayTimeline ... />
    <InboxPreview ... />
    <MiniCalendar ... />
  </div>

  {/* Mobile: horizontal scroll snap */}
  <div className="lg:hidden flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4">
    <div className="snap-center flex-shrink-0 w-[85vw]">
      <TodayTimeline ... />
    </div>
    <div className="snap-center flex-shrink-0 w-[85vw]">
      <InboxPreview ... />
    </div>
    <div className="snap-center flex-shrink-0 w-[85vw]">
      <MiniCalendar ... />
    </div>
  </div>
</div>
```

Add scroll indicators (3 dots below the strip) showing which card is currently in view. Use an IntersectionObserver on each card to track visibility.

**Scroll indicator component** (inline, no new file needed):
- 3 dots in a row, `size-1.5 rounded-full`
- Active dot: `bg-[#0033A0]`, inactive: `bg-gray-200`
- Centered below the swipe strip

**Verification:** Resize browser to mobile width. Cards should be swipeable horizontally with snap behavior. Dots indicate current card. On desktop, normal 3-column grid.

---

## Execution Sequence

These tasks are designed to be executed in order, one per Claude instance. Each prompt below is self-contained — copy-paste it into a fresh Claude Code session to execute that task.

### Prompt 1 → Task 1: Synthetic Fallback Data

```
Read ARCHITECTURE-STUDENT-HOMEPAGE-V2.md in the-sandbox/ directory, then execute Task 1 (Synthetic Fallback Data for Inbox & Calendar).

Files to modify:
- the-sandbox/app/components/student-home/InboxPreview.tsx
- the-sandbox/app/components/student-home/MiniCalendar.tsx

Read both files first, then implement the changes described in Task 1 of the architecture doc. When the API returns empty data, fall back to synthetic demo emails and calendar events derived from Tiana's class schedule.

After implementing, run: npx tsc --noEmit 2>&1 | grep -E "InboxPreview|MiniCalendar"
Expect 0 errors. Then stop.
```

### Prompt 2 → Task 2: Quick Action Chips

```
Read ARCHITECTURE-STUDENT-HOMEPAGE-V2.md in the-sandbox/ directory, then execute Task 2 (Quick Action Chips Below Greeting).

Create a new component: the-sandbox/app/components/student-home/QuickActionChips.tsx
Modify: the-sandbox/app/components/student-home/StudentHomepage.tsx

Read StudentHomepage.tsx and the-sandbox/app/lib/student-home-data.ts (specifically the QuickAction interface and buildQuickActions function) first. Then implement the chips component and wire it into the homepage between the greeting and BeaconCard.

After implementing, run: npx tsc --noEmit 2>&1 | grep -E "QuickAction|StudentHomepage"
Expect 0 errors. Then stop.
```

### Prompt 3 → Task 3: Slim BeaconCard

```
Read ARCHITECTURE-STUDENT-HOMEPAGE-V2.md in the-sandbox/ directory, then execute Task 3 (Slim Down BeaconCard to Alert Bar).

File to modify: the-sandbox/app/components/student-home/BeaconCard.tsx

Read the current BeaconCard.tsx first. It currently renders 9 beacon types as full cards with gradients, body text, and progress visualizations. Replace it with a compact single-line alert bar (~48px height). Keep all 9 types working. Rest mode keeps the crisis resources footer.

After implementing, run: npx tsc --noEmit 2>&1 | grep BeaconCard
Expect 0 errors. Then stop.
```

### Prompt 4 → Task 4: Due Dates on Course Cards

```
Read ARCHITECTURE-STUDENT-HOMEPAGE-V2.md in the-sandbox/ directory, then execute Task 4 (Surface Due Dates on Course Cards).

File to modify: the-sandbox/app/components/student-home/StudentHomepage.tsx

Read StudentHomepage.tsx and the-sandbox/app/lib/student-home-data.ts (specifically the StakeItem interface and buildStakes function). Cross-reference simData.stakes with each enrollment course's courseCode. If a matching stake exists, show the due date and urgency badge on the course card instead of the generic "Next objective" line.

After implementing, run: npx tsc --noEmit 2>&1 | grep StudentHomepage
Expect 0 errors. Then stop.
```

### Prompt 5 → Task 5: Campus Life Links

```
Read ARCHITECTURE-STUDENT-HOMEPAGE-V2.md in the-sandbox/ directory, then execute Task 5 (Wire Campus Life "Learn More" Links).

Files to modify:
- the-sandbox/app/lib/student-home-data.ts (add href to CampusLifeItem interface + buildCampusLife)
- the-sandbox/app/components/student-home/CampusLife.tsx (use href in Learn more button)

Read both files first, then add the href field and wire up navigation. The "See all" button should link to /community.

After implementing, run: npx tsc --noEmit 2>&1 | grep -E "CampusLife|student-home-data"
Expect 0 errors. Then stop.
```

### Prompt 6 → Task 6: Night Mode

```
Read ARCHITECTURE-STUDENT-HOMEPAGE-V2.md in the-sandbox/ directory, then execute Task 6 (Evening/Night Mode Adjustments).

File to modify: the-sandbox/app/components/student-home/StudentHomepage.tsx

Read the file first. When simData.isLateNight is true (already computed in student-home-data.ts for 10PM-6AM), hide the Campus Life, UKNow, Continue Where You Left Off, and Learning Recap sections. Keep the greeting, beacon, top strip, Sandy's briefing, and My Courses visible.

After implementing, run: npx tsc --noEmit 2>&1 | grep StudentHomepage
Expect 0 errors. Then stop.
```

### Prompt 7 → Task 7: Mobile Swipe Strip

```
Read ARCHITECTURE-STUDENT-HOMEPAGE-V2.md in the-sandbox/ directory, then execute Task 7 (Mobile Polish — Swipeable Top Strip).

File to modify: the-sandbox/app/components/student-home/StudentHomepage.tsx

Read the file first. Replace the single grid for the top strip with two versions: a hidden lg:grid for desktop (3 columns) and a horizontal scroll-snap container for mobile (3 swipeable cards at 85vw each). Add 3-dot scroll indicators using IntersectionObserver.

After implementing, run: npx tsc --noEmit 2>&1 | grep StudentHomepage
Expect 0 errors. Then stop.
```

---

## Post-Execution Checklist

After all 7 tasks are complete, run in a final session:

```
Run the following checks on the-sandbox/:
1. npx tsc --noEmit — verify 0 new errors in student-home components
2. Load the student homepage as tiana.the.student@uky.edu and verify:
   - 3-column strip shows Schedule, Inbox (3 emails), Calendar (class dots)
   - Quick action chips appear below greeting
   - BeaconCard is a compact alert bar
   - Sandy's Briefing has "Coming Up" section with 5 assignments
   - Course cards show due dates
   - Campus Life tabs work, "Learn more" navigates
   - After 10 PM: campus sections hidden
   - Mobile: top strip is swipeable with dot indicators
```

---

## Files Changed (Summary)

| File | Tasks |
|---|---|
| `app/components/student-home/StudentHomepage.tsx` | 2, 4, 6, 7 |
| `app/components/student-home/InboxPreview.tsx` | 1 |
| `app/components/student-home/MiniCalendar.tsx` | 1 |
| `app/components/student-home/QuickActionChips.tsx` | 2 (NEW) |
| `app/components/student-home/BeaconCard.tsx` | 3 |
| `app/components/student-home/CampusLife.tsx` | 5 |
| `app/lib/student-home-data.ts` | 5 |
