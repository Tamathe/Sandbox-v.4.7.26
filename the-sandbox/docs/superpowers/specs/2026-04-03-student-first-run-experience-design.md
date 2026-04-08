# Student First-Run Experience — Design Spec

**Date:** 2026-04-03
**Status:** Approved
**Scope:** Progressive disclosure homepage, Sandy intro, metric explainers

## Problem

A second-year med student logging into the platform for the first time sees 14-15 sections on the student homepage. There is no onboarding, no progressive disclosure, and no explanation of metrics or terminology. The result: cognitive overload, distrust of "magic" numbers, and the platform's best feature (Sandy) gets lost in visual noise.

## Solution

A four-part "Student First-Run Experience" that reduces first-session cognitive load by 70%, introduces Sandy as the primary interface, and builds trust through transparent metrics.

### What's In Scope

1. **Focus View** — Simplified homepage showing 4 sections instead of 14
2. **Sandy Intro Message** — One-time proactive welcome with course-specific starters
3. **MetricExplainer** — Reusable tooltip component explaining Studied %, flashcard counts, urgency badges
4. **View Toggle** — User-controlled switch between Focus View and Full Dashboard

### What's Out of Scope (Fast-Follows)

- Context-aware beacon CTAs (e.g., "View Assignment" instead of "Start Studying" for overdue items)
- Collapsible non-academic sections (Campus Life, Dining, UKNow as summary lines)

---

## Design

### 1. Data Layer

**Schema change:** Add 2 fields to the existing `SandyPreference` model in `prisma/schema.prisma`:

```prisma
model SandyPreference {
  // existing fields: userId, tone, proactivityLevel, responseLength, showChips
  homepageView     String   @default("focus")   // "focus" | "full"
  sandyIntroSeen   Boolean  @default(false)
}
```

**First-session detection:**

- No `SandyPreference` record exists for the user → first session → auto-create with defaults (`homepageView: "focus"`, `sandyIntroSeen: false`)
- Record exists → read `homepageView` to determine which view to render
- Lazy-create pattern: record is created on first student homepage load, not on user signup. No migration backfill needed.

**Grandfathering existing users:**

Existing users who already have a `SandyPreference` record will receive `homepageView: "focus"` as the column default. To prevent existing students from suddenly seeing a simplified homepage, the homepage component checks: if the user's `lastSeenAt` timestamp predates the feature deploy date, treat them as `"full"` regardless of the DB default. The deploy-date constant lives in `app/components/student-home/StudentHomepage.tsx` as `FIRST_RUN_DEPLOY_DATE` (ISO string, e.g., `'2026-04-10T00:00:00Z'`). This is a one-time check — on first load post-deploy, their preference is updated to `"full"` via the existing PATCH endpoint and the constant is never consulted again.

**API changes:**

- `GET /api/student/home-bundle` — extend response to include `homepageView: string` and `sandyIntroSeen: boolean` from `SandyPreference`. If no record exists, return `{ homepageView: "focus", sandyIntroSeen: false }` and create the record.
- `PATCH /api/sandy/preferences` — already handles `tone`, `proactivityLevel`, `responseLength`, `showChips`. Extend to also accept `homepageView` and `sandyIntroSeen`. No new route.

### 2. Focus View Rendering

**File:** `app/components/student-home/StudentHomepage.tsx`

**Approach:** Filter, not fork. The existing `SECTION_ORDER` phase dictionary and `renderSection()` switch remain untouched. A filtering layer determines which sections render.

```typescript
const FOCUS_SECTIONS = ['greeting', 'beacon', 'top-strip', 'courses'] as const
const FOCUS_ORDER = ['greeting', 'beacon', 'top-strip', 'courses'] as const
```

**Rendering logic:**

- When `homepageView === "focus"`: iterate `FOCUS_ORDER` (fixed order, ignores phase dictionary). This guarantees the briefing strip is always position 2 (right after beacon, before courses), addressing the audit finding that it was buried at position 5-9.
- When `homepageView === "full"`: iterate `SECTION_ORDER[phase]` as today. No change.
- Night mode in Focus View: filter `FOCUS_ORDER` against the night phase's allowed sections. Result: greeting + beacon only (top-strip and courses are not in the night section list). Wind-down card is not in `FOCUS_SECTIONS`, so night Focus View is ultra-minimal.

**Individual section components are unchanged.** They don't know about Focus View. The homepage simply doesn't call their render case.

**Phase backgrounds still apply in Focus View** — morning amber gradient, evening slate, etc. The visual warmth of the phase system is preserved.

### 3. View Toggle

**Location:** Rendered inline in `StudentHomepage.tsx`, directly below the greeting section.

**Focus View state:**
```
Focus View · Show full dashboard →
```
A single line of text. "Show full dashboard" is a clickable link styled as `text-[#0033A0] hover:underline`.

**Full Dashboard state:**
```
Full Dashboard · Switch to Focus View →
```

**Interaction:**

1. User clicks toggle link
2. Optimistic local state update — view switches immediately
3. Background `PATCH /api/sandy/preferences` with `{ homepageView: "full" }` or `"focus"`
4. No page reload, no loading spinner

**First session behavior:** Toggle shows but defaults to Focus View. The student can switch to Full Dashboard immediately if they want — no forced simplification.

### 4. Sandy First-Run Introduction

**File:** `app/components/concierge/ConciergePanel.tsx`

**Trigger:** `sandyIntroSeen === false` when the student homepage loads.

**Mechanism:** The homepage passes `sandyIntroSeen` status to the concierge context. Sandy's chat component checks this flag on mount. If `false`, it injects a pre-populated assistant message into the local chat history (no API call to Claude, no streaming — just a static message rendered as if Sandy said it).

**Message content:**

```
Hi {firstName}! I'm Sandy — your AI study assistant.

I already know your courses and schedule, so just ask me anything. Here are some things I can help with right now:
```

Followed by 3 course-specific starter chips.

**Starter chip generation:**

Uses enrollment data from the bundle API response. No AI call. Template-based:

- Sort the student's enrolled courses: first by whether they have an upcoming deadline (soonest first), then by lowest studied %, then alphabetical by courseCode. Take the top 3.
- Map each to an action template based on the first matching rule:
  1. Course has an overdue or due-today assignment → `"What's due in {courseCode} this week?"`
  2. Course has studied % below 40% → `"Quiz me on {courseCode} {nextObjective}"` (uses the `nextObjective` field from enrollment data)
  3. Default (no urgency, decent progress) → `"Help me study for {courseCode}"`
- If the student has fewer than 3 courses, show only as many chips as courses. If zero courses (edge case), show 3 generic starters: "What can you help me with?", "Show me my schedule", "What tools are available?"

**Persistence behavior:**

- `sandyIntroSeen` flips to `true` only when the student sends a message or clicks a starter chip (fires `PATCH /api/sandy/preferences` with `{ sandyIntroSeen: true }`)
- If the student ignores Sandy entirely, the intro message reappears on next login
- Once flipped, Sandy loads with her regular page-aware starters from `getPageStarters()` on all subsequent visits

**Desktop vs mobile:**

- Desktop: Intro message appears in the persistent left sidebar — immediately visible alongside the Focus View homepage
- Mobile: Sandy remains a FAB button. When tapped, the bottom sheet opens with the intro message already present. No auto-open — that would be intrusive on mobile.

### 5. MetricExplainer Component

**File:** `app/components/shared/MetricExplainer.tsx` (new file)

**Component API:**

```tsx
<MetricExplainer text="Percentage of course topics you've engaged with through quizzes, flashcards, or study sessions with Sandy." />
```

Single prop: `text` (string). The parent handles positioning (renders inline-flex next to the metric).

**Behavior:**

- Renders an `Info` icon from lucide-react (`size-3.5`, `text-gray-400`)
- Desktop: hover or focus → tooltip appears above the icon
- Mobile: tap → tooltip toggles visible/hidden, tap outside → dismisses
- Tooltip styling: `bg-white rounded-lg shadow-md border border-gray-200 p-2 text-xs text-gray-600 max-w-[240px]`

**Implementation:** CSS-only using Tailwind `group-hover` + absolute positioning. No third-party tooltip library. A `useState` toggle handles mobile tap behavior.

**Applied in 3 locations:**

| Location | Position | Tooltip Text |
|---|---|---|
| Course card — Studied % | Next to the percentage number | "Percentage of course topics you've engaged with through quizzes, flashcards, or study sessions with Sandy." |
| Smart Study Target chip — Flashcard count | Next to the "N cards due" sublabel | "Flashcards are auto-generated from your course materials using spaced repetition. Reviewing due cards strengthens long-term retention." |
| Course card — Urgency badge | Next to "Overdue" / "Due today" / "This week" | "Based on assignment due dates from your course schedule." |

---

## Files Touched

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `homepageView` + `sandyIntroSeen` to `SandyPreference` |
| `app/api/student/home-bundle/route.ts` | Return `homepageView` + `sandyIntroSeen`; lazy-create `SandyPreference` |
| `app/api/sandy/preferences/route.ts` | Extend PATCH to accept `homepageView` + `sandyIntroSeen` |
| `app/components/student-home/StudentHomepage.tsx` | Focus View filtering, view toggle UI, grandfathering check, `MetricExplainer` on course cards |
| `app/components/concierge/ConciergePanel.tsx` | Sandy intro message injection, `sandyIntroSeen` flip on interaction |
| `app/components/shared/MetricExplainer.tsx` | New file — reusable tooltip component |
| `app/components/student-home/QuickActionChips.tsx` | Add `MetricExplainer` to Smart Study Target chip |

---

## Success Criteria

1. A brand-new student sees exactly 4 homepage sections on first login (greeting, beacon, briefing strip, courses)
2. Sandy auto-sends a personalized intro message referencing the student's actual enrolled courses
3. The student can switch to Full Dashboard at any time via a one-click toggle
4. Existing students see no change — they're grandfathered to Full Dashboard
5. Tapping the (i) icon next to any metric reveals a plain-English explanation
6. All behaviors persist across devices (DB-backed, not localStorage)
7. Sandy's intro persists across sessions until the student actually interacts with her

## Non-Goals

- No onboarding tour / tooltip walkthrough overlay
- No forced interaction gates (overlays, mandatory clicks)
- No changes to individual section components (beacon, briefing strip, campus life, etc.)
- No loginCount tracking
- No A/B testing infrastructure for this feature
