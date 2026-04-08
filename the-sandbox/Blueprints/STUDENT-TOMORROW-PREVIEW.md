# Blueprint 4: Tomorrow Preview Card — Evening Forward-Look

> **Sprint Scope:** Add a "Tomorrow Preview" card that appears after 6 PM, synthesizing tomorrow's schedule + deadlines + prep needed into one forward-looking view.
> **Depends On:** Nothing — uses existing schedule and stakes data.
> **Estimated Size:** Small (half sprint)
> **Deploy Order:** 4 of 10 — no prerequisites (but pairs well with Blueprint 5: Time-Phase Homepage)

---

## Context

Every evening, students ask: "What do I need to do tonight to be ready for tomorrow?" The platform has all the data — tomorrow's class schedule, upcoming deadlines, course prep — but doesn't synthesize it. The homepage is always focused on *today*. After 6 PM, the "today" focus becomes stale. The MiniCalendar lets you tap to see Thursday, and Sandy's briefing shows upcoming deadlines, but **no single card answers the forward-looking question**.

The `DAY-LIFECYCLE.md` blueprint describes "tomorrow preview" and "course prep" for faculty. This blueprint adapts that concept for students.

### Key Files to Create

| File | Purpose |
|------|---------|
| `app/components/student-home/TomorrowPreview.tsx` | **New:** tomorrow preview card |

### Key Files to Modify

| File | Change |
|------|--------|
| `app/components/student-home/StudentHomepage.tsx` | Conditionally render TomorrowPreview after 6 PM |
| `app/lib/student-home-data.ts` | Add `computeTomorrowPreview()` function |

### Key Files to Read

| File | Why |
|------|-----|
| `app/components/student-home/TodayTimeline.tsx` | Schedule data shape + rendering patterns |
| `app/components/student-home/SandyBriefing.tsx` | Stakes/deadline data shape |
| `app/lib/student-home-data.ts` | `SCHEDULE` constant, `getStudentHomeData()` |

---

## Feature: Tomorrow Preview Card

### What

A card that appears on the homepage after 6 PM showing:
1. Tomorrow's class schedule (condensed — times + courses + locations)
2. Deadlines due tomorrow or the next day
3. A suggested departure time for the first class
4. A "prep needed" hint if any deadline falls in a tomorrow class

```
┌─────────────────────────────────────────────────┐
│  TOMORROW · Thursday, March 26                   │
│                                                   │
│  10:30 AM  Evidence (LAW 756)       Grehan 201  │
│   1:00 PM  AI Literacy (TEK-100)    Funkhouser  │
│   7:00 PM  Mock Trial Practice      Law Bldg    │
│                                                   │
│  ⏰ Suggested departure: 10:15 AM               │
│                                                   │
│  📌 Hallucination Hunt (TEK-100) — due in 2 days│
│  📌 Evidence Brief — due Friday                  │
│                                                   │
│  [Prep with Sandy →]                             │
└─────────────────────────────────────────────────┘
```

### Time-Aware Rendering

```typescript
const hour = new Date().getHours()

// Show tomorrow preview from 6 PM onwards
const showTomorrowPreview = hour >= 18

// On weekends (Sat/Sun), show Monday preview all day
const dayOfWeek = new Date().getDay()
const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
const showTomorrowPreview = isWeekend || hour >= 18
```

### Data Computation

Add to `student-home-data.ts`:

```typescript
export interface TomorrowPreviewData {
  dayLabel: string              // "Thursday, March 26"
  classes: Array<{
    time: string                // "10:30 AM"
    courseCode: string
    title: string
    location: string
    walkingMinutes?: number     // From previous class or home
  }>
  suggestedDeparture: string | null  // "10:15 AM" — first class time minus walking
  deadlines: Array<{
    courseCode: string
    title: string
    dueLabel: string            // "due tomorrow", "due in 2 days"
    urgency: 'critical' | 'warning' | 'info'
  }>
  prepHints: Array<{
    courseCode: string
    hint: string                // "Brief due in this class" or "Exam this week"
  }>
}

export function computeTomorrowPreview(
  tomorrowSchedule: TimelineEvent[],
  stakes: StakeItem[],
  walkingMinutes: number        // Default walking time to first class
): TomorrowPreviewData {
  // 1. Get tomorrow's day-of-week, look up SCHEDULE[tomorrow]
  // 2. Filter stakes where daysLeft <= 3 (show upcoming deadlines)
  // 3. Cross-reference: if a stake's courseCode matches a tomorrow class, add prepHint
  // 4. Compute suggestedDeparture: first class startTime minus walkingMinutes
  // 5. Format dayLabel with full date
}
```

### Suggested Departure Logic

```typescript
function computeSuggestedDeparture(
  firstClassTime: string,    // "10:30"
  walkingMinutes: number     // 15
): string {
  // Parse firstClassTime → subtract walkingMinutes → format as "10:15 AM"
  // Add 5-minute buffer for settling in
  // If result is before 6 AM, don't show (unreasonable)
}
```

### Prep Hints

Cross-reference tomorrow's classes with upcoming deadlines:

```typescript
// For each tomorrow class, check if any stake matches courseCode + is due within 2 days
// Examples:
// - "Hallucination Hunt due during this class's window"
// - "Evidence exam this week — review tonight"
// - "Reading response due before class"
```

These hints render as subtle amber annotations next to the relevant class in the schedule.

### UI Specification

```tsx
// TomorrowPreview.tsx

// Card style: standard platform card (border rounded-2xl shadow-sm)
// Header: "TOMORROW · [day, date]" in text-xs uppercase tracking-wider
// Background: subtle gradient from white to slate-50 (distinguishes from today cards)
// Icon: Sunrise (lucide-react) next to header

// Schedule section:
// - Compact list (no full timeline blocks — just time, course, location on one line)
// - Walking icon between items if walkingMinutes > 10
// - Classes without location show "TBD"

// Departure callout:
// - Clock icon + "Suggested departure: 10:15 AM"
// - Render only if first class is before noon (morning classes need departure hints)
// - Text: text-sm text-slate-600, slightly emphasized

// Deadlines section:
// - Only show if deadlines exist within 3 days
// - Pin icon + courseCode + title + dueLabel
// - Urgency coloring: critical=red text, warning=amber, info=blue

// Action button:
// - "Prep with Sandy →" — dispatches sandy-prefill: "Help me prepare for tomorrow"
// - Sandy receives tomorrow's schedule + deadlines in context and generates a prep plan

// Responsive:
// - Mobile: full width, compact padding
// - Desktop: sits in the main content flow, same width as other cards
```

### Placement on Homepage

In `StudentHomepage.tsx`, insert the TomorrowPreview card:

**After 6 PM:** Render **above** Campus Life / UKNow (which will soon hide at 10 PM in night mode). This gives the student a natural "wind-down" flow: review tomorrow → check campus events → sign off.

**On weekends:** Render as the **first card after Sandy's Briefing** since there's no "today" schedule to show.

```tsx
{showTomorrowPreview && (
  <TomorrowPreview data={tomorrowData} />
)}
```

### Edge Cases

- **No classes tomorrow**: Show "No classes tomorrow" with just the deadlines section. If no deadlines either, don't render the card.
- **Friday evening**: Show Monday's preview (skip weekend). Label: "MONDAY · March 30"
- **Holiday/break**: If the schedule is empty for the next weekday, show "No classes scheduled" with a celebratory note.
- **Finals week**: Multiple exams may appear as deadlines. Show all of them with urgency coloring.
- **Student has no enrolled courses**: Don't render the card.

### Sandy Integration

The "Prep with Sandy" button dispatches a `sandy-prefill` event:

```typescript
const handlePrepWithSandy = () => {
  window.dispatchEvent(new CustomEvent('sandy-prefill', {
    detail: {
      message: `Help me prepare for tomorrow. I have: ${classes.map(c => `${c.courseCode} at ${c.time}`).join(', ')}. Deadlines: ${deadlines.map(d => `${d.title} (${d.courseCode}) ${d.dueLabel}`).join(', ')}.`,
      autoSend: true
    }
  }))
}
```

Sandy receives the full context and generates a personalized prep plan:
- "Tonight, spend 30 min reviewing Hearsay Exceptions for Evidence class"
- "Your Hallucination Hunt draft should be mostly done — plan 15 min for final edits"
- "Mock Trial practice at 7 PM — review your opening statement"

---

## What This Does NOT Do

- Does not replace the MiniCalendar (that stays for week-level navigation)
- Does not fetch new data (uses existing schedule + stakes data with different day offset)
- Does not add real calendar integration (still uses simulated schedule — real calendar is a separate blueprint)
- Does not generate AI content on load (Sandy interaction is optional, user-initiated)

---

## Success Criteria

After 6 PM, a student can answer "What do I need to be ready for tomorrow?" in a single glance — without tapping into the calendar, cross-referencing deadlines, or asking Sandy. The card tells them: when to wake up (implicitly via departure time), what classes they have, and what's due.
