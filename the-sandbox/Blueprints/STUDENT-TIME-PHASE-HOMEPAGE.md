# Blueprint 5: Time-Phase-Aware Student Homepage

> **Sprint Scope:** Make the student homepage evolve throughout the day — morning triage mode, afternoon study mode, evening wind-down mode — by reordering, showing/hiding, and transforming existing widgets based on time-of-day.
> **Depends On:** Blueprint 1 (Right Now Card), Blueprint 4 (Tomorrow Preview). Can be built without them but references their components.
> **Estimated Size:** Medium (1 sprint)
> **Deploy Order:** 5 of 10 — build after Blueprints 1 and 4

---

## Context

The student homepage currently has one layout that renders identically at 7 AM and 7 PM. The only time-awareness is:
- Greeting changes ("Good morning" / "Good afternoon" / "Good evening")
- Night mode (10 PM–6 AM) hides Campus Life, UKNow, Continue, Learning Recap
- Beacon switches to `rest` type at night with crisis resources

But a student's needs shift dramatically across the day:
- **Morning (6 AM–11 AM)**: "What's happening today? Am I prepared?"
- **Afternoon (11 AM–5 PM)**: "What should I study between classes?"
- **Evening (5 PM–10 PM)**: "What homework should I do? What's tomorrow look like?"
- **Night (10 PM–6 AM)**: "How was today? Wind down. Tomorrow prep." (existing night mode)

This blueprint makes the homepage **time-phase-aware** by reordering sections and swapping emphasis — not by adding entirely new features, but by **curating what's already there** for the time of day.

### Key Files to Modify

| File | Change |
|------|--------|
| `app/components/student-home/StudentHomepage.tsx` | Add phase logic, reorder sections per phase |
| `app/lib/student-home-data.ts` | Add `getTimePhase()` utility + phase-specific data transforms |
| `app/components/student-home/SandyBriefing.tsx` | Adjust insight priority ordering per phase |
| `app/components/student-home/QuickActionChips.tsx` | Swap chip set per phase |

### Key Files to Read

| File | Why |
|------|-----|
| `app/components/student-home/StudentHomepage.tsx` | Current section ordering |
| `app/components/student-home/BeaconCard.tsx` | Beacon type selection logic |

---

## Architecture: Time Phases

### Phase Definitions

```typescript
export type TimePhase = 'morning' | 'afternoon' | 'evening' | 'night'

export function getTimePhase(): TimePhase {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'night'  // 10 PM – 6 AM
}
```

### Section Ordering by Phase

Each phase reorders the same components. No sections are removed (except night mode's existing behavior) — they're just prioritized differently.

```typescript
const SECTION_ORDER: Record<TimePhase, string[]> = {
  morning: [
    'beacon',
    'right-now-card',       // Blueprint 1 — most urgent items glance
    'quick-actions',
    'top-strip',            // Schedule / Inbox / Calendar
    'sandy-briefing',       // Full briefing with all insights
    'courses',
    'announcements',
    'campus-life',
    'uknow-feed',
    'continue-tools',
    'learning-recap',
  ],
  afternoon: [
    'beacon',
    'quick-actions',        // Smart Study chip prominent (Blueprint 3)
    'sandy-briefing',       // Study-action nudges prioritized
    'courses',              // Course cards with progress + due dates
    'top-strip',            // Schedule demoted (already in class)
    'campus-life',
    'continue-tools',
    'announcements',
    'uknow-feed',
    'learning-recap',
  ],
  evening: [
    'beacon',
    'tomorrow-preview',     // Blueprint 4 — top position in evening
    'quick-actions',
    'sandy-briefing',       // Evening study plan emphasis
    'courses',              // What to work on tonight
    'learning-recap',       // Moved up: reflect on today's progress
    'top-strip',            // Tomorrow's schedule in calendar
    'campus-life',          // Weekend events discovery
    'announcements',
    'uknow-feed',
    'continue-tools',
  ],
  night: [
    'beacon',               // Rest beacon with crisis resources
    'tomorrow-preview',     // Blueprint 4
    'wind-down',            // New: day summary + mood check (see Feature 3)
    'learning-recap',       // Reflect on today
    // Everything else hidden (existing night mode behavior)
  ],
}
```

### Implementation in StudentHomepage.tsx

Instead of hardcoding section order in JSX, use a section renderer:

```tsx
const phase = getTimePhase()
const sectionOrder = SECTION_ORDER[phase]

// Render sections in phase-appropriate order
return (
  <div className="space-y-6">
    {sectionOrder.map(section => {
      switch (section) {
        case 'beacon':
          return <BeaconCard key={section} beacon={simData.beacon} />
        case 'right-now-card':
          return rightNowData ? <RightNowCard key={section} {...rightNowData} /> : null
        case 'tomorrow-preview':
          return tomorrowData ? <TomorrowPreview key={section} data={tomorrowData} /> : null
        case 'quick-actions':
          return <QuickActionChips key={section} actions={phaseActions} />
        case 'top-strip':
          return <TopStrip key={section} {...stripProps} />
        case 'sandy-briefing':
          return <SandyBriefing key={section} {...briefingProps} insightPriority={phase} />
        case 'courses':
          return <CourseCards key={section} {...courseProps} />
        case 'wind-down':
          return <WindDownCard key={section} {...windDownProps} />
        // ... etc
        default:
          return null
      }
    })}
  </div>
)
```

---

## Feature 1: Phase-Specific Sandy Briefing Priority

### What

Sandy's briefing card reorders its insights based on the time phase, putting the most relevant category first.

### How

Add an `insightPriority` prop to `SandyBriefing`:

```typescript
// Insight category sort order per phase
const INSIGHT_PRIORITY: Record<TimePhase, SandyInsightCategory[]> = {
  morning: ['academic', 'email-action', 'financial', 'study-action', 'career', 'wellness'],
  afternoon: ['study-action', 'academic', 'email-action', 'career', 'financial', 'wellness'],
  evening: ['study-action', 'academic', 'wellness', 'email-action', 'career', 'financial'],
  night: ['wellness', 'study-action', 'academic', 'email-action', 'career', 'financial'],
}
```

In `SandyBriefing.tsx`, sort the insights array by the phase-specific priority before rendering:

```typescript
const sortedInsights = [...insights].sort((a, b) => {
  const priority = INSIGHT_PRIORITY[insightPriority]
  return priority.indexOf(a.category) - priority.indexOf(b.category)
})
```

### Morning: Collapse to Top 3

In the morning phase, Sandy's briefing shows **only the top 3 insights** with a "Show all [N] insights" toggle. This keeps the morning glance fast:

```tsx
const [expanded, setExpanded] = useState(false)
const displayInsights = phase === 'morning' && !expanded
  ? sortedInsights.slice(0, 3)
  : sortedInsights

// Render toggle if collapsed
{phase === 'morning' && sortedInsights.length > 3 && !expanded && (
  <button onClick={() => setExpanded(true)} className="text-sm text-[#0033A0]">
    Show all {sortedInsights.length} insights
  </button>
)}
```

---

## Feature 2: Phase-Specific Quick Action Chips

### What

The Quick Action Chips change based on time phase to surface the most relevant actions.

### How

```typescript
const PHASE_CHIPS: Record<TimePhase, QuickAction[]> = {
  morning: [
    { label: 'Smart Study Target', icon: 'book-open', smart: true }, // Blueprint 3
    { label: 'My Schedule', icon: 'calendar', action: 'scroll-to-timeline' },
    { label: 'Check Email', icon: 'mail', href: '/messages' },
    { label: 'Sandy', icon: 'sparkles', action: 'open-sandy' },
  ],
  afternoon: [
    { label: 'Smart Study Target', icon: 'book-open', smart: true },
    { label: 'Quick Quiz', icon: 'target', action: 'study-buddy-quiz' },
    { label: 'Study Room', icon: 'users', href: '/community' },
    { label: 'My Library', icon: 'library', href: '/library' },
  ],
  evening: [
    { label: 'Smart Study Target', icon: 'book-open', smart: true },
    { label: 'Tomorrow', icon: 'sunrise', action: 'scroll-to-tomorrow' },
    { label: 'My Library', icon: 'library', href: '/library' },
    { label: 'Wellness', icon: 'heart', href: '/wellness-hub/mindfulness' },
  ],
  night: [
    { label: 'Tomorrow', icon: 'sunrise', action: 'scroll-to-tomorrow' },
    { label: 'Mindfulness', icon: 'heart', href: '/wellness-hub/mindfulness' },
    { label: 'Sleep Log', icon: 'moon', href: '/wellness-hub/sleep' },
    { label: 'Sandy', icon: 'sparkles', action: 'open-sandy' },
  ],
}
```

---

## Feature 3: Evening Wind-Down Card

### What

A new card that replaces the hidden daytime widgets during night mode (10 PM–6 AM). Instead of a sparse homepage, the student sees a "Wind Down" section.

### UI

```
┌─────────────────────────────────────────────────┐
│  YOUR DAY                                        │
│                                                   │
│  📚 2 study sessions · 45 min total              │
│  📝 3 flashcards reviewed                        │
│  📖 Attended 2 classes                           │
│                                                   │
│  How are you feeling?                            │
│  [😊] [😐] [😔] [😫] [🤩]                      │
│                                                   │
│  💤 First class tomorrow: 10:30 AM               │
│     Aim for lights out by 11:00 PM (8 hrs)      │
│                                                   │
│  [5-min breathing exercise →]                    │
└─────────────────────────────────────────────────┘
```

### Data

```typescript
interface WindDownData {
  daySummary: {
    studySessions: number
    studyMinutes: number
    flashcardsReviewed: number
    classesAttended: number
  }
  sleepSuggestion: {
    firstClassTomorrow: string    // "10:30 AM"
    suggestedBedtime: string      // "11:00 PM"
    targetHours: number           // 8
  } | null
}
```

**Day summary** pulls from:
- Session telemetry for today's date (study sessions + minutes)
- FlashcardState reviews where `reviewedAt` is today
- Timeline events that have passed (classes attended)

This data is already available via `/api/analytics/student` and the existing session tracking — just needs to be filtered to today.

**Sleep suggestion** computes:
```typescript
// First class tomorrow (from tomorrow's schedule)
// Subtract target sleep (8 hours) → suggested bedtime
// Only show if first class is before 2 PM (afternoon classes don't need early bedtime hints)
```

### Mood Check-In

The emoji mood buttons are a **1-tap interaction** that:
1. Stores the mood in `SessionTelemetry` or a lightweight `MoodEntry` extension
2. Sandy acknowledges: "Got it. Rest well, Tiana." (brief, not conversational)
3. Over time, mood data enriches Sandy's understanding of the student's wellbeing patterns

This is **not** a full Wellness Hub feature — it's a micro-interaction that takes 1 second. The Wellness Hub's Mindfulness Coach handles deeper engagement.

### Breathing Exercise Link

Links to `/wellness-hub/mindfulness` with a query param to auto-start a 5-minute breathing exercise: `/wellness-hub/mindfulness?mode=breathing&duration=5`.

---

## Feature 4: Beacon Phase Awareness

### What

The beacon's type selection in `computeBeacon()` already considers time-of-day for the `rest` beacon. Extend it to be phase-aware:

```typescript
// Enhance computeBeacon in student-home-data.ts:

function computeBeacon(hour: number, stakes: StakeItem[], phase: TimePhase): BeaconItem {
  // Night: rest beacon (existing)
  if (phase === 'night') return restBeacon()

  // Morning: morning-briefing beacon (existing)
  if (phase === 'morning' && hour < 9) return morningBriefingBeacon(stakes)

  // Evening: if all assignments are caught up, celebration beacon
  if (phase === 'evening' && !stakes.some(s => s.urgency === 'critical')) {
    return { type: 'all-clear', urgency: 'celebration', message: "You're caught up. Nice work today." }
  }

  // Default: urgency-based beacon (existing logic)
  return urgencyBasedBeacon(stakes)
}
```

---

## Transition Handling

Phases change while the student may have the page open. Two approaches:

**Option A (Recommended): Refresh on visibility change.**
When the page regains focus (tab switch, phone unlock), re-compute the phase. If it changed, re-render with the new section order. Use `document.addEventListener('visibilitychange', ...)`.

**Option B: Timer-based.**
Set a timeout for the next phase boundary. E.g., if it's 4:55 PM (afternoon phase), set a 5-minute timer to switch to evening phase. This feels over-engineered for the benefit.

Implement Option A:

```tsx
const [phase, setPhase] = useState(getTimePhase())

useEffect(() => {
  const handler = () => {
    if (document.visibilityState === 'visible') {
      setPhase(getTimePhase())
    }
  }
  document.addEventListener('visibilitychange', handler)
  return () => document.removeEventListener('visibilitychange', handler)
}, [])
```

---

## Visual Phase Indicators

Subtle visual cues that the homepage is in a different phase:

- **Morning**: Warm gradient accent (amber-50 to white) on the page background top area
- **Afternoon**: Default (no special treatment)
- **Evening**: Cool gradient accent (slate-50 to white)
- **Night**: Dark background (existing dark mode behavior if enabled, otherwise very subtle indigo-50)

These are **extremely subtle** — a barely perceptible background tint, not a theme change. The content reordering is the primary signal.

---

## What This Does NOT Do

- Does not add new data fetching (all data already fetched, just displayed differently)
- Does not change the fundamental component library (same cards, different order)
- Does not force users into a phase (scrolling reveals all sections regardless of phase)
- Does not require server-side phase computation (client-side only, based on local time)
- Does not persist phase preference (always computed from current time)

---

## Success Criteria

A student who opens the homepage at 7 AM, 2 PM, 7 PM, and 11 PM sees **four meaningfully different layouts** — morning triage, afternoon study focus, evening planning, and night wind-down — all from the same URL, same components, just thoughtfully reordered and contextually curated.
