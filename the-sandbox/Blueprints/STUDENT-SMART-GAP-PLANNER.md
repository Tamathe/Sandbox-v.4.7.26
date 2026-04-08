# Blueprint 6: Smart Gap Planner — Turn Dead Time Into Productive Time

> **Sprint Scope:** Detect schedule gaps > 30 minutes and proactively suggest an optimized plan combining study, meals, errands, and transit — rendered as an inline card in the timeline.
> **Depends On:** Blueprint 3 (Just Study Launcher) for the study action handler. Can be built without it — just uses generic study links instead.
> **Estimated Size:** Medium (1 sprint)
> **Deploy Order:** 6 of 10

---

## Context

The student's TodayTimeline already shows gap indicators: "45m free — Lunch?" These are static text labels. The platform knows the student's schedule, deadlines, weak concepts, study patterns, and (to a limited extent) campus dining hours. But it doesn't synthesize this into a **gap-specific plan**.

This blueprint turns dead gaps into **actionable micro-plans**: "You have 75 min free. Review Hearsay Exceptions (20 min) → Grab lunch at Champions Kitchen (30 min) → Walk to Funkhouser (12 min) → 13 min buffer."

This is the highest-leverage engagement feature for the student homepage — it captures the moment when students are most likely to waste time scrolling social media and redirects them toward productive activity with zero decision-making required.

### Key Files to Create

| File | Purpose |
|------|---------|
| `app/components/student-home/GapPlanCard.tsx` | **New:** inline gap plan rendered within the timeline |
| `app/lib/student-home/gap-planner.ts` | **New:** gap detection + plan generation logic |

### Key Files to Modify

| File | Change |
|------|--------|
| `app/components/student-home/TodayTimeline.tsx` | Replace static gap labels with GapPlanCard |
| `app/lib/student-home-data.ts` | Extend TimelineEvent type with gap plan data |

### Key Files to Read

| File | Why |
|------|-----|
| `app/components/student-home/TodayTimeline.tsx` | Gap detection + timeline rendering |
| `app/lib/student-home-data.ts` | Schedule structure, stakes, walking times |
| `app/lib/sr-scheduler.ts` | Due flashcard counts |
| `app/lib/student-context-api.ts` | Weak concepts per course |

---

## Feature: Gap Detection & Plan Generation

### Gap Detection

A gap is any period between two consecutive timeline events (classes, office hours, events) that is ≥ 30 minutes.

```typescript
export interface ScheduleGap {
  startTime: string          // "10:15" — end of previous event
  endTime: string            // "13:00" — start of next event
  durationMinutes: number    // 165
  previousEvent: TimelineEvent
  nextEvent: TimelineEvent
  walkingMinutesToNext: number  // Walking time to next class location
}

export function detectGaps(timeline: TimelineEvent[]): ScheduleGap[] {
  // Sort events by startTime
  // For each consecutive pair, compute gap duration
  // Include only gaps >= 30 minutes
  // Include gap before first class (morning free time) if > 30 min after 7 AM
  // Include gap after last class (evening free time) — handled by evening phase, not here
}
```

### Plan Generation

For each gap, generate a plan that fills the available time with the highest-priority activities:

```typescript
export interface GapPlan {
  gap: ScheduleGap
  activities: GapActivity[]
  bufferMinutes: number        // Leftover time after all activities
}

export interface GapActivity {
  type: 'study' | 'meal' | 'walk' | 'review' | 'break' | 'errand'
  label: string                // "Review Hearsay Exceptions"
  sublabel: string             // "Weak concept in Evidence"
  durationMinutes: number
  action?: SmartStudyAction    // Tappable action (reuse from Blueprint 3)
  icon: string                 // lucide-react icon name
}
```

### Plan Generation Algorithm

```typescript
export function generateGapPlan(
  gap: ScheduleGap,
  stakes: StakeItem[],
  srDueCount: number,
  weakConcepts: WeakConcept[],
  mealWindows: MealWindow[]    // Breakfast: 7-10, Lunch: 11-2, Dinner: 5-8
): GapPlan {
  const available = gap.durationMinutes
  const activities: GapActivity[] = []
  let remaining = available

  // 1. Reserve walking time to next class (non-negotiable)
  const walkTime = gap.walkingMinutesToNext + 5  // +5 min buffer to settle in
  remaining -= walkTime

  // 2. Check if gap overlaps a meal window
  const mealNeeded = overlapsWindow(gap, mealWindows) && remaining >= 30
  if (mealNeeded) {
    activities.push({
      type: 'meal',
      label: getMealLabel(gap),  // "Grab lunch" / "Quick breakfast"
      sublabel: getNearestDining(gap.previousEvent.location),  // "Champions Kitchen nearby"
      durationMinutes: 30,
      icon: 'utensils'
    })
    remaining -= 30
  }

  // 3. Fill remaining time with study activities (priority order)
  if (remaining >= 5 && srDueCount >= 3) {
    const reviewTime = Math.min(remaining, 10)  // SR review: 5-10 min max
    activities.push({
      type: 'review',
      label: `Review ${srDueCount} flashcards`,
      sublabel: '5-min quick review',
      durationMinutes: reviewTime,
      action: { type: 'flashcard-quick-review' },
      icon: 'rotate-ccw'
    })
    remaining -= reviewTime
  }

  if (remaining >= 15) {
    // Find the most relevant study target
    const nextClassCourse = gap.nextEvent.courseCode
    const relevantStake = stakes.find(s => s.daysLeft <= 5)
    const relevantConcept = weakConcepts.find(c =>
      c.courseCode === nextClassCourse || c.courseCode === relevantStake?.courseCode
    )

    if (relevantConcept) {
      activities.push({
        type: 'study',
        label: `Study ${relevantConcept.concept}`,
        sublabel: `${relevantConcept.courseCode} — mastery ${Math.round(relevantConcept.mastery * 100)}%`,
        durationMinutes: Math.min(remaining, 30),
        action: { type: 'tutor', courseId: '...', courseName: relevantConcept.courseCode, concept: relevantConcept.concept },
        icon: 'book-open'
      })
      remaining -= Math.min(remaining, 30)
    } else if (relevantStake) {
      activities.push({
        type: 'study',
        label: `Work on ${relevantStake.title}`,
        sublabel: `${relevantStake.courseCode} — ${relevantStake.dueLabel}`,
        durationMinutes: Math.min(remaining, 30),
        icon: 'pencil'
      })
      remaining -= Math.min(remaining, 30)
    }
  }

  // 4. Add walking time at the end
  activities.push({
    type: 'walk',
    label: `Walk to ${gap.nextEvent.location || gap.nextEvent.courseCode}`,
    sublabel: `${gap.walkingMinutesToNext} min`,
    durationMinutes: walkTime,
    icon: 'footprints'
  })

  return {
    gap,
    activities,
    bufferMinutes: Math.max(0, remaining)
  }
}
```

### Meal Window Defaults

```typescript
const DEFAULT_MEAL_WINDOWS: MealWindow[] = [
  { name: 'breakfast', start: '07:00', end: '10:00' },
  { name: 'lunch',     start: '11:00', end: '14:00' },
  { name: 'dinner',    start: '17:00', end: '20:00' },
]

// Future: when dining integration is available (Blueprint 9),
// use real dining hall hours instead of defaults
```

---

## UI: GapPlanCard Component

### Inline Timeline Integration

The GapPlanCard renders **inside the TodayTimeline** where the static gap label currently appears:

```
┌─────────────────────────────────────────────────┐
│ 9:00   Evidence (LAW 756)        Grehan 201     │
│ 10:15  ─ end ─                                  │
│                                                   │
│ ┌─ 2h 45m FREE ─────────────────────────────┐   │
│ │                                             │   │
│ │  📖 Study Hearsay Exceptions    30 min     │   │
│ │     Evidence — mastery 38%    [Start →]    │   │
│ │                                             │   │
│ │  🍴 Grab lunch                  30 min     │   │
│ │     Champions Kitchen nearby               │   │
│ │                                             │   │
│ │  🔄 Review 5 flashcards        10 min     │   │
│ │     Quick SR review           [Review →]   │   │
│ │                                             │   │
│ │  🚶 Walk to Funkhouser         15 min     │   │
│ │                                             │   │
│ │  ⏸ 40 min buffer                           │   │
│ └─────────────────────────────────────────────┘   │
│                                                   │
│ 13:00  AI Literacy (TEK-100)     Funkhouser     │
└─────────────────────────────────────────────────┘
```

### Visual Design

```tsx
// GapPlanCard.tsx

// Container: dashed border (border-dashed), rounded-xl, bg-slate-50
// Slightly indented from the main timeline to visually distinguish it as a "gap filler"

// Header: "[duration] FREE" with a subtle clock icon
// Activities: vertical list with icon + label + duration on each line
// Action buttons: small "[Start →]" or "[Review →]" links (text-[#0033A0], text-sm)
// Buffer: if > 10 min remaining, show as "⏸ [N] min buffer" in muted text

// Collapse behavior:
// - Gaps < 45 min: show as single-line summary "45m free — Study Hearsay (30m) + walk (12m)"
// - Gaps 45-120 min: show 2-3 activities, expandable
// - Gaps > 120 min: show full plan with all activities visible

// Mobile: full width, same vertical flow
// Desktop: same width as timeline, consistent padding
```

### Interaction

- **Tapping an activity with an action**: Launches the relevant tool (Study Buddy, Flashcard Review, etc.)
- **Tapping the gap header**: Toggles expand/collapse
- **"Customize" link** (optional, low priority): Opens Sandy with "I have [N] minutes free between classes. What should I do?" for a personalized recommendation beyond the algorithm.

---

## Smart Context: What to Study During a Gap

The algorithm prioritizes study for the **next class's course** or the **most urgent deadline's course**. This is intentional — studying right before a class primes the student's working memory for that subject.

```typescript
// Priority logic for study target selection:
// 1. Weak concept in NEXT CLASS's course (priming)
// 2. Assignment due within 3 days in ANY course (urgency)
// 3. Weakest concept across all courses (remediation)
// 4. General review for lowest-progress course
```

---

## Edge Cases

- **No gaps ≥ 30 min**: Don't render any GapPlanCards. The timeline shows back-to-back classes with walking directions only.
- **Only 1 class today**: Large gap before and after. The pre-class gap gets a morning plan. The post-class gap is handled by the evening phase (Blueprint 5), not this card.
- **Overlapping events**: If events overlap (e.g., office hours during a free period), the gap is reduced by the overlap.
- **Weekend/no classes**: No timeline → no gaps → no cards. Weekend study is handled by Sandy's briefing + Quick Action Chips.
- **Gap exactly at meal time**: Meal activity takes priority over study.
- **Student has no stakes/weak concepts**: Fill with generic suggestions ("Review today's lecture notes," "Check email").

---

## Future Enhancements (Not This Sprint)

- **Dining integration** (Blueprint 9): Replace "Champions Kitchen nearby" with real menu + wait time
- **Location awareness**: If student's location is known, adjust walking time from current location rather than from the previous class
- **Transit integration**: "Bus 5 arrives in 8 min at Rose St stop — take it to save 20 min"
- **Social layer**: "3 classmates have the same gap — suggest a group study session?"
- **Learning from behavior**: Track which gap suggestions the student follows → improve future recommendations

---

## What This Does NOT Do

- Does not add real dining data (uses heuristic meal windows — dining API is Blueprint 9)
- Does not add location awareness (uses building-to-building walking times from timeline data)
- Does not replace Sandy's study recommendations (complements them with timeline-specific context)
- Does not persist gap plans (recomputed on each page load from current schedule + academic state)
- Does not require any new API endpoints (all data already available from homepage fetch)

---

## Success Criteria

A student with a 2-hour gap between classes sees a **specific, actionable plan** that fills the entire gap with zero decision-making required. The plan accounts for meals, study priorities, walking time, and buffer — and each study item is one tap away from launching the right tool.
