# Blueprint 1: "Right Now" Priority Card — Zero-Swipe Morning Glance

> **Sprint Scope:** Add a single, non-scrolling priority card above the 3-column strip that shows the 1 most urgent item from each domain (deadline, email, next class) — scannable in under 3 seconds.
> **Depends On:** Nothing — uses existing data from `getStudentHomeData()` and current API endpoints.
> **Estimated Size:** Small (half sprint)
> **Deploy Order:** 1 of 10 — no prerequisites

---

## Context

The student homepage's 3-column strip (Schedule / Inbox / Calendar) collapses to a horizontal snap-scroll carousel on mobile, requiring swipes to see email or calendar after viewing the schedule. A student checking their phone in bed at 7:15 AM wants **one screen, zero swipes** for the critical stuff. This card surfaces the single most urgent item from each data domain in 3 lines, always visible, no interaction required.

Think: Apple's "Morning Summary" — three lines, zero interaction.

### Key Files to Modify

| File | Change |
|------|--------|
| `app/components/student-home/StudentHomepage.tsx` | Insert RightNowCard above the 3-column strip |
| `app/components/student-home/RightNowCard.tsx` | **New:** compact priority card component |
| `app/lib/student-home-data.ts` | Add `computeRightNow()` helper that picks top items |

### Files to Read (context only)

| File | Why |
|------|-----|
| `app/components/student-home/BeaconCard.tsx` | Urgency color system to reuse |
| `app/components/student-home/SandyBriefing.tsx` | Stakes/deadline data shape |
| `app/components/student-home/TodayTimeline.tsx` | Timeline event shape |
| `app/components/student-home/InboxPreview.tsx` | Email preview shape |

---

## Feature: Right Now Priority Card

### What

A compact, always-visible card rendered **between the BeaconCard and the 3-column strip** showing exactly 3 lines:

```
┌─────────────────────────────────────────────────┐
│  RIGHT NOW                                       │
│  📅 Evidence (LAW 756) — 9:00 AM, Grehan 201    │
│  📧 FAFSA Renewal — respond today               │
│  📌 Hallucination Hunt — due in 3 days           │
└─────────────────────────────────────────────────┘
```

If any domain has nothing urgent, that line doesn't render (card can be 1-3 lines). If all three are empty (rare — means no classes, no email, no deadlines), the card doesn't render at all.

### Data Selection Logic

Add to `student-home-data.ts`:

```typescript
export interface RightNowData {
  nextClass: {
    courseCode: string
    title: string
    time: string        // "9:00 AM"
    location: string    // "Grehan 201"
    minutesUntil: number
  } | null
  urgentEmail: {
    sender: string
    subject: string
    urgency: 'respond-today' | 'this-week'
  } | null
  topDeadline: {
    courseCode: string
    title: string
    dueLabel: string    // "due in 3 days", "due today", "overdue"
    urgency: 'critical' | 'warning' | 'info'
  } | null
}

export function computeRightNow(
  timeline: TimelineEvent[],
  stakes: StakeItem[],
  emails: EmailPreview[]
): RightNowData {
  // nextClass: first TimelineEvent where type === 'class' and startTime > now
  // urgentEmail: first email with urgency 'respond-today', fallback to 'this-week'
  // topDeadline: first StakeItem sorted by daysLeft ascending (overdue first)
}
```

### Priority Rules

1. **Next class**: The next class that hasn't started yet. If current time is during a class, show that class with "NOW" label instead of time. If no more classes today, show "No more classes today" or omit the line.
2. **Urgent email**: First email with `respond-today` urgency. If none, first `this-week`. If none, omit the line.
3. **Top deadline**: StakeItem with lowest `daysLeft`. If overdue → show in red. If today → amber. If this week → blue. If nothing due within 7 days, omit.

### UI Specification

```tsx
// RightNowCard.tsx
// Renders below BeaconCard, above the 3-column strip
// Card style: matches platform standard — border rounded-2xl shadow-sm, p-4
// Background: white (light) / slate-900 (dark)
// Title: "RIGHT NOW" — text-xs font-semibold text-slate-500 uppercase tracking-wider

// Each line:
// - Icon: Calendar for class, Mail for email, Pin for deadline (lucide-react)
// - Text: single line, truncated with text-ellipsis if needed
// - Urgency dot: colored circle matching urgency level (reuse BeaconCard's color system)
// - Entire line is tappable: class → scrolls to timeline, email → /messages, deadline → course page

// Mobile: full width, no horizontal scroll
// Desktop: same width as the 3-column grid below it (max-w matches parent)
```

### Responsive Behavior

- **Mobile**: This card is the key value — it eliminates the need to swipe through the carousel. Always visible above the scroll area.
- **Desktop**: Still useful as a quick-scan, but less critical since all 3 columns are visible simultaneously. Render it but allow it to be less prominent (slightly smaller text).
- **Night mode (10 PM–6 AM)**: Transform into a "Tomorrow" variant — show first class tomorrow, top deadline tomorrow. Reuse the same component with different data source.

### Integration Point

In `StudentHomepage.tsx`, insert between BeaconCard and the top strip:

```tsx
{/* Existing: BeaconCard */}
<BeaconCard beacon={simData.beacon} />

{/* NEW: Right Now Card */}
<RightNowCard
  nextClass={rightNow.nextClass}
  urgentEmail={rightNow.urgentEmail}
  topDeadline={rightNow.topDeadline}
/>

{/* Existing: 3-column strip */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
```

### Edge Cases

- **No classes today** (weekend/break): Omit class line entirely. Card may only show email + deadline.
- **All caught up**: No urgent emails, no upcoming deadlines, no classes → don't render the card at all. The BeaconCard's `all-clear` type already handles the "nothing to worry about" state.
- **Overdue items**: If a deadline is overdue, show it in red with "OVERDUE" label. This takes priority over any other deadline.
- **Multiple urgent items**: Only show THE top 1 per domain. The goal is glanceability, not completeness. Sandy's Briefing handles the full list.

---

## What This Does NOT Do

- Does not replace the 3-column strip (that stays for detail)
- Does not replace Sandy's Briefing (that stays for insights/actions)
- Does not add any new API calls (uses data already fetched by StudentHomepage)
- Does not persist state (pure render from props)

---

## Success Criteria

A student opening the homepage on mobile can answer three questions **without scrolling or swiping**:
1. When is my next class and where?
2. Do I have any urgent emails?
3. What's my most pressing deadline?
