# First-Run Fast-Follows — Design Spec

**Date:** 2026-04-03
**Status:** Approved
**Scope:** Focus View per-phase tuning, Sandy remembers the intro
**Depends on:** Student First-Run Experience (built 2026-04-03)

---

## Feature 1: Focus View Per-Phase Tuning

### Problem

Focus View currently uses a single fixed section order (`greeting`, `beacon`, `top-strip`, `courses`) for all non-night phases. This means afternoon students see email/calendar when they'd benefit more from quick-action chips, and evening students miss the tomorrow preview that helps them plan ahead.

### Solution

Replace the single `FOCUS_ORDER` constant with a per-phase dictionary, matching the same pattern as the existing `SECTION_ORDER`.

### Design

**File:** `app/components/student-home/StudentHomepage.tsx`

**Change:** Replace `FOCUS_ORDER` and `FOCUS_SECTIONS` with:

```typescript
const FOCUS_ORDER_BY_PHASE: Record<TimePhase, readonly string[]> = {
  morning:   ['greeting', 'beacon', 'top-strip', 'courses'],
  afternoon: ['greeting', 'beacon', 'courses', 'quick-actions'],
  evening:   ['greeting', 'beacon', 'courses', 'tomorrow-preview'],
  night:     ['greeting', 'beacon'],
}
```

**Rationale per phase:**

| Phase | 3rd section | 4th section | Why |
|---|---|---|---|
| morning | top-strip (email/cal/tasks) | courses | Morning = planning. Email and calendar are most useful. |
| afternoon | courses | quick-actions | Afternoon = doing. Courses + quick study actions. |
| evening | courses | tomorrow-preview | Evening = winding down. See what's coming tomorrow. |
| night | — | — | Ultra-minimal. Already approved in original spec. |

**Section order logic update:**

The `sectionOrder` memo currently does:
```typescript
if (homepageView === 'focus') {
  const nightSections = new Set(SECTION_ORDER.night)
  return phase === 'night'
    ? FOCUS_ORDER.filter(s => nightSections.has(s))
    : [...FOCUS_ORDER]
}
```

Replace with:
```typescript
if (homepageView === 'focus') {
  return [...FOCUS_ORDER_BY_PHASE[phase]]
}
```

Night is now handled directly by `FOCUS_ORDER_BY_PHASE.night` — no intersection filter needed. The explicit per-phase lists are more readable and eliminate the implicit filtering that was previously required.

**`FOCUS_SECTIONS` set:** Replace the single set with a function or derive from the phase dictionary. Used nowhere else in the file currently, so it can be removed entirely. If needed in the future, compute as `new Set(FOCUS_ORDER_BY_PHASE[phase])`.

### Files Touched

| File | Change |
|---|---|
| `app/components/student-home/StudentHomepage.tsx` | Replace `FOCUS_ORDER` + `FOCUS_SECTIONS` with `FOCUS_ORDER_BY_PHASE`; simplify `sectionOrder` memo |

---

## Feature 2: Sandy Remembers the Intro

### Problem

After a student's first interaction with Sandy (flipping `sandyIntroSeen` to `true`), Sandy has no awareness that this is a new user. She treats a day-one student the same as someone who's been on the platform for months. A small context nudge would make Sandy warmer and more helpful during the student's first week.

### Solution

Inject a time-limited context block into Sandy's system prompt when the student recently completed their first-run intro. The block expires naturally after 7 days — no cleanup needed.

### Design

**File:** `app/lib/concierge-service.ts`

**Where:** Inside `buildSandyContext()`, which already fetches `SandyPreference` via `getPreferences(userId)` for the behavior preferences section.

**Change:** Extend the `getPreferences` return (or make a separate query) to include `sandyIntroSeen` and `updatedAt` from `SandyPreference`. Then:

```typescript
// After building the preferences section...
if (prefs.sandyIntroSeen && prefs.updatedAt) {
  const daysSinceIntro = (Date.now() - new Date(prefs.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceIntro <= 7) {
    sections.push(`## FIRST-RUN CONTEXT
This student recently started using the platform. Their first interaction with you was within the last week. Be welcoming — reference that they're new, offer to show them around if relevant, but don't be patronizing. After ~7 days this context expires naturally.`)
  }
}
```

**Data flow:**

1. `getPreferences()` in `sandy-preferences-service.ts` already returns `SandyPreferenceData`. Extend the `select` to include `updatedAt`.
2. `buildPreferencesPromptSection()` already receives the prefs object. Add the first-run block at the end if the condition is met.
3. No new API calls — `updatedAt` piggybacks on the existing preferences fetch.

**Service changes:**

| File | Change |
|---|---|
| `app/lib/sandy-preferences-service.ts` | Add `updatedAt` to `SandyPreferenceData` interface and all `select` queries. Add first-run context block to `buildPreferencesPromptSection()`. |

**Timing semantics:**

- `updatedAt` reflects when `sandyIntroSeen` was last set to `true` (via the first-interaction PATCH). This is the correct timestamp because `@updatedAt` in Prisma updates on every write — but `sandyIntroSeen` only flips once, and preferences are rarely changed.
- Edge case: if the student changes their tone/proactivity within the first 7 days, `updatedAt` resets and extends the welcome window slightly. This is acceptable — a student actively customizing Sandy is still "new."
- After 7 days, the block silently stops appearing. No cron, no cleanup.

### Files Touched

| File | Change |
|---|---|
| `app/lib/sandy-preferences-service.ts` | Add `updatedAt` to interface + selects; add first-run block to `buildPreferencesPromptSection()` |

---

## Success Criteria

1. Morning Focus View shows greeting, beacon, email/calendar strip, courses
2. Afternoon Focus View shows greeting, beacon, courses, quick-action chips
3. Evening Focus View shows greeting, beacon, courses, tomorrow preview
4. Night Focus View shows greeting and beacon only (unchanged)
5. Sandy's system prompt includes first-run context for students who completed intro within 7 days
6. After 7 days, first-run context silently disappears from Sandy's prompt
7. No schema changes, no new API routes, no migrations

## Non-Goals

- No progressive disclosure ramp (deferred)
- No collapsible non-academic sections (deferred)
- No context-aware beacon CTAs (deferred)
- No changes to Sandy's greeting text or starter chips
