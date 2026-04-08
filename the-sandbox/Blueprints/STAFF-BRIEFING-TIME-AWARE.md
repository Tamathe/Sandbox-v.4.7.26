# Blueprint: Staff Briefing — Time-Aware Dashboard & Triage Overhaul

> **Sprint Scope:** Transform the staff homepage from a static morning snapshot into a living, time-aware instrument that adapts throughout the day. Redesign the KPI strip as micro traffic lights, restructure the sidebar from 7 cards to 3, and add afternoon/evening delta modes.
> **Depends On:** Nothing — purely refactors existing staff homepage components and briefing service.
> **Estimated Size:** Medium (5 handoff prompts, 10 tasks)
> **Audit Steps Addressed:** 1 (KPI strip context), 2 (sidebar overload), 14 (end-of-day staleness)
> **Origin:** Morgan Rivera day-in-the-life UX audit, 2026-03-26

---

## Context

The staff homepage (`StaffHomepage.tsx`) currently renders a single-shot briefing fetched from `/api/staff/briefing`. The briefing service (`briefing-service.ts`) assembles greeting, schedule, action queue, insights, budget pulse, alerts, and Sandy recommendations in one parallel fetch. The greeting is time-aware ("Good morning/afternoon/evening") but the **content** is not — the same narrative, KPI counts, and sidebar cards render identically at 8 AM and 5 PM.

### Current Architecture (What Exists)

**Page entry:** `app/page.tsx` → `<StaffHomepage />` (line 596-598)

**Component:** `app/components/staff/StaffHomepage.tsx` (432 lines)
- Fetches `/api/staff/briefing` once on mount
- Renders: greeting + narrative → KPI strip (4 tiles) → QuickActionsBar → StaffBriefingLayout (2-col: left + right)
- Left column: ActionQueueCard, BriefingInsightsCard, BudgetPulseCard
- Right column: ActionCenterCard, EmailPreviewCard, TodayScheduleCard, UpcomingMeetingsCard, AlertsCard, My Tasks inline card, SandyRecommendationsCard (7 cards total)
- `buildBriefingNarrative()` generates a static sentence from briefing data — never updates
- `KPITile` component: plain border, raw count, optional "urgent" red text

**API:** `app/api/staff/briefing/route.ts` → `getDailyBriefing(userId)` in `app/lib/staff/briefing-service.ts`
- Assembles 6 data sources in parallel: calendar, action queue, insights, budget, alerts, scheduled comms
- Generates Sandy recommendations from assembled context
- Returns everything in one payload

**Sidebar cards (7):**
1. `ActionCenterCard.tsx` — 2x2 grid of counts (action_queue, committee, approval, task). Fetches `/api/staff/action-center`. **Redundant** with ActionQueueCard in left column.
2. `EmailPreviewCard.tsx` — Shows 5 emails with triage dots. Fetches `/api/assistant/email/inbox`. Read-only.
3. `TodayScheduleCard.tsx` — Lists all calendar events. Highlights current event with blue left border. No action buttons.
4. `UpcomingMeetingsCard.tsx` — Committee meetings with next-date and open action items. Fetches `/api/staff/committees/upcoming`.
5. `AlertsCard.tsx` — Critical/warning/info alerts with dismiss buttons.
6. My Tasks inline card — Shows overdue + due-today counts. Links to /tasks.
7. `SandyRecommendationsCard.tsx` — Priority-sorted recommendations with action buttons. **Buried at bottom of sidebar.**

---

## What Changes

### 1. KPI Strip → Micro Traffic Lights

**Current:** 4 plain tiles with raw counts + optional red "urgent" text.
**Target:** 4 tiles, each with a colored status indicator (green/amber/red), contextual label, and count.

| Tile | Green | Amber | Red |
|---|---|---|---|
| Actions | 0 P0, ≤5 total | 0 P0, >5 total OR any P1 | Any P0 |
| Meetings | 0-2 meetings | 3-4 meetings | 5+ meetings |
| Budget | On track, no variances | On track but flagged variances exist | Over pace |
| Alerts | 0 alerts | Warning-only alerts | Any critical alert |

Each tile shows:
- A colored left border (4px) indicating status
- The count (large)
- A contextual label (not just "4 critical" but "4 critical — act now" vs "On track" vs "Heavy day")

### 2. Sidebar Restructure: 7 Cards → 3 Cards

**Remove:**
- `ActionCenterCard` — redundant with ActionQueueCard in left column
- `UpcomingMeetingsCard` — merge relevant data into "Next Up" card
- `EmailPreviewCard` — demote to left column below BudgetPulse (it's content, not quick-action)
- My Tasks inline card — merge into "Next Up" or keep as 4th card if needed

**New sidebar (3 cards, in order):**

1. **Sandy Says** (move from bottom to top) — Sandy's recommendations are the most actionable content; they should be first, not last.

2. **Next Up** — The single most imminent event/obligation with a prep/join action:
   - Shows the next calendar event that hasn't ended yet (time, title, location)
   - If a committee meeting: adds "X open action items" + link to committee page
   - Countdown: "Starts in 47 minutes" or "Happening now"
   - Below the hero event: compact list of remaining events today (max 3 more)
   - If no events remain: "No more events today" with a checkmark

3. **Fires Only** — Only shows if there are P0/critical items or critical alerts. Hidden when clear.
   - Combines P0 action items + critical alerts into one urgent card
   - Each item has a one-click action (resolve/dismiss/view)
   - If empty: card doesn't render at all (saves space)

**Moved to left column (below BudgetPulse):**
- `EmailPreviewCard` — becomes a left-column card since it's content-heavy, not glanceable

### 3. Time-Aware Briefing Narrative

**Approach:** Option C — cached morning briefing + lightweight delta section.

The briefing API gets a new optional query parameter: `?mode=delta`. When called without it (or `mode=full`), it returns the full briefing as today. When called with `mode=delta`, it returns a lightweight object:

```typescript
interface BriefingDelta {
  resolvedSince: number      // action items resolved since morning
  newSince: number           // new action items since morning
  meetingsCompleted: number  // meetings that have ended
  meetingsRemaining: number  // meetings still ahead
  budgetChanged: boolean     // any budget variance change
  newAlerts: number          // alerts created since morning
  greeting: string           // time-appropriate greeting
  narrative: string          // delta narrative sentence
  timeMode: 'morning' | 'afternoon' | 'evening'
}
```

**Client behavior:**
- On mount: fetch full briefing (as today)
- Store the briefing timestamp in component state
- Every 30 minutes (or on tab refocus after 30+ min): fetch `?mode=delta`
- Merge delta into display: update greeting, prepend delta narrative above morning narrative, update KPI counts

**Time modes:**
- **Morning** (before 12:00): Full briefing as-is. Narrative: "4 critical items need your attention, 3 meetings today."
- **Afternoon** (12:00-16:00): Delta prepended. "Since this morning: 3 actions resolved, 1 new P0 added. 2 meetings remain." Morning narrative still visible below in muted text.
- **Evening** (after 16:00): Day-in-review mode. "Today: 7 actions resolved, 2 carry over. All meetings complete. A&S budget variance flagged." Morning narrative hidden, replaced entirely by wrap-up.

### 4. Progressive Loading

**Current:** Single `/api/staff/briefing` call — entire page is skeleton until it returns.

**Target:** Split into 3 progressive stages:
1. **Instant** (client-side, no fetch): Greeting (time-based, uses cached user name from auth context), KPI strip skeleton with last-known values from `sessionStorage`
2. **Fast** (briefing API): KPI strip populates, narrative renders, sidebar cards render
3. **Lazy** (individual card fetches): ActionQueueCard, EmailPreviewCard fetch their own detailed data as they do today

This means the user sees a meaningful page within 100ms, not after a 1-2s API round trip.

---

## Files to Create

| File | Purpose |
|---|---|
| `app/components/staff/KPIStrip.tsx` | New component: 4 micro traffic light tiles with status logic |
| `app/components/staff/NextUpCard.tsx` | New sidebar card: next event hero + remaining events compact list |
| `app/components/staff/FiresCard.tsx` | New sidebar card: P0 actions + critical alerts combined (conditional render) |

## Files to Modify

| File | Changes |
|---|---|
| `app/components/staff/StaffHomepage.tsx` | Replace inline KPITile with KPIStrip component; restructure sidebar from 7→3 cards; add delta fetch logic with 30-min interval; move EmailPreviewCard to left column; add sessionStorage caching for progressive load |
| `app/lib/staff/briefing-service.ts` | Add `getDailyBriefingDelta()` function; add `timeMode` to greeting logic |
| `app/api/staff/briefing/route.ts` | Accept `?mode=delta` query param; route to delta function |
| `app/components/staff/SandyRecommendationsCard.tsx` | No structural changes — just moves position in parent layout |

## Files to Delete

| File | Reason |
|---|---|
| `app/components/staff/ActionCenterCard.tsx` | Redundant with ActionQueueCard. Remove import from StaffHomepage. |

---

## Schema Changes

**None.** This scope is purely UI + service refactoring. All data already exists in the briefing payload. The delta computation reads from the same models (StaffActionItem, StaffAlert, etc.) with timestamp filters.

---

## API Changes

### Modified: `GET /api/staff/briefing`

**New query parameter:** `mode` (optional)
- `mode=full` (default): Returns `DailyBriefing` as today
- `mode=delta`: Returns `BriefingDelta` (lightweight, no insights/recommendations/full budget)

**Delta response shape:**
```typescript
{
  delta: {
    resolvedSince: number
    newSince: number
    meetingsCompleted: number
    meetingsRemaining: number
    budgetChanged: boolean
    newAlerts: number
    greeting: string
    narrative: string
    timeMode: 'morning' | 'afternoon' | 'evening'
    // Updated counts for KPI strip
    kpiCounts: {
      actionTotal: number
      actionP0: number
      actionP1: number
      meetingsToday: number
      meetingsRemaining: number
      budgetOnTrack: boolean
      budgetFlaggedVariances: number
      alertsTotal: number
      alertsCritical: number
    }
  }
}
```

---

## Component Specifications

### `KPIStrip.tsx`

```typescript
interface KPIStripProps {
  actions: { total: number; p0: number; p1: number }
  meetings: { total: number; remaining: number }
  budget: { onTrack: boolean; flaggedVariances: number; remainingFormatted: string }
  alerts: { total: number; critical: number }
}
```

Each tile renders:
- `border-l-4` with computed color (green/amber/red)
- Background tint matching status (green-50/amber-50/red-50 at 50% opacity)
- Count in `text-xl font-extrabold`
- Status label in `text-xs font-medium` with matching color
- Tile is clickable — scrolls to relevant section (actions → action queue, meetings → next up, budget → budget pulse, alerts → fires card)

Status computation logic (pure function, no side effects):
```typescript
function getActionStatus(p0: number, p1: number, total: number): 'green' | 'amber' | 'red'
function getMeetingStatus(total: number): 'green' | 'amber' | 'red'
function getBudgetStatus(onTrack: boolean, flaggedVariances: number): 'green' | 'amber' | 'red'
function getAlertStatus(critical: number, total: number): 'green' | 'amber' | 'red'
```

### `NextUpCard.tsx`

```typescript
interface NextUpCardProps {
  events: ScheduleEvent[]  // today's schedule from briefing
  committees?: UpcomingMeeting[]  // from committees/upcoming
}
```

Renders:
- Hero section: next un-ended event with large time, title, location, countdown ("Starts in X min" / "Happening now" / "Ended")
- If the next event matches a committee meeting (by title fuzzy match): show open action items count + "Prep" link
- Below hero: compact list of remaining events (time + title only, max 3)
- If no future events: green checkmark + "No more events today"

Uses `setInterval` (60s) to update countdown without re-fetching.

### `FiresCard.tsx`

```typescript
interface FiresCardProps {
  p0Actions: ActionItem[]      // P0 items from briefing
  criticalAlerts: StaffAlert[] // severity=critical from briefing
  onResolveAction: (id: string) => void
  onDismissAlert: (id: string) => void
}
```

Renders:
- Only renders if `p0Actions.length + criticalAlerts.length > 0`
- Red-tinted header: "Needs Attention" with fire count badge
- Combined list: P0 actions first (with inline "Resolve" button), then critical alerts (with "Dismiss" button)
- Each item: one-line title + source badge ("Action" / "Alert") + age

---

## Service Specifications

### `getDailyBriefingDelta(userId: string, since: string): Promise<BriefingDelta>`

Added to `app/lib/staff/briefing-service.ts`.

**Logic:**
1. Parse `since` as ISO timestamp (the time the full briefing was fetched)
2. Count action items with `resolvedAt >= since` → `resolvedSince`
3. Count action items with `createdAt >= since AND status = 'pending'` → `newSince`
4. Get today's calendar events, partition into completed (endTime < now) vs remaining → `meetingsCompleted`, `meetingsRemaining`
5. Count alerts with `createdAt >= since` → `newAlerts`
6. Check budget: compare current `onTrack` against a simple re-fetch → `budgetChanged`
7. Compute current KPI counts (lightweight — just counts, no full items)
8. Determine `timeMode` from current hour
9. Build `narrative` string from delta values
10. Build `greeting` from time mode

**Narrative templates:**
- Afternoon: "Since this morning: {resolved} action{s} resolved{, {new} new item{s}}{. {remaining} meeting{s} remaining}."
- Evening: "Today: {resolved} action{s} resolved, {carryover} carry over to tomorrow. {meetingsSummary}. {budgetNote}."

---

## Data Flow

### Full Briefing (Morning / Initial Load)
```
User opens homepage
  → StaffHomepage mounts
  → Renders instant skeleton with sessionStorage-cached KPI values
  → Fetches GET /api/staff/briefing
  → briefing-service.getDailyBriefing(userId)
    → parallel: calendar, actionQueue, insights, budget, alerts, comms
    → generateRecommendations(context)
  → Response: full DailyBriefing
  → Client: populate KPI strip, narrative, sidebar cards
  → Client: cache briefingTimestamp + KPI values in sessionStorage
  → Client: dispatch sandy-briefing-context event
```

### Delta Refresh (Afternoon/Evening or Tab Refocus)
```
30-min interval fires OR tab becomes visible after 30+ min
  → Fetches GET /api/staff/briefing?mode=delta&since={briefingTimestamp}
  → briefing-service.getDailyBriefingDelta(userId, since)
    → lightweight counts only (no full items, no recommendations)
  → Response: BriefingDelta
  → Client: update greeting, prepend delta narrative, update KPI counts
  → Client: update sessionStorage cache
```

---

## Edge Cases

| Case | Handling |
|---|---|
| No action items at all | KPI tile shows "0" with green status, "All clear" label |
| No meetings today | NextUpCard shows "No events scheduled" with empty-state illustration |
| No P0s and no critical alerts | FiresCard doesn't render at all — sidebar shows only 2 cards |
| Delta fetch fails | Silently keep current state — don't blank the page |
| User opens page at 5 PM for first time | Full briefing fetched, but `timeMode` is "evening" so greeting + narrative use evening templates. No delta (no morning baseline to diff against). |
| sessionStorage unavailable | Skip progressive load — show normal skeleton, no cached values |
| Budget data missing (no units) | KPI budget tile shows "$0" with gray status, "No data" label |

---

## Acceptance Criteria

1. KPI strip tiles show colored left borders (green/amber/red) based on status logic
2. Sidebar shows exactly 3 cards: Sandy Says → Next Up → Fires (conditional)
3. ActionCenterCard is removed; EmailPreviewCard moves to left column below BudgetPulse
4. At 2 PM, the greeting says "Good afternoon" and a delta narrative appears if the page was loaded earlier
5. At 5 PM, the greeting says "Good evening" and shows a day-in-review summary
6. KPI tiles are clickable — scroll to their relevant section
7. NextUpCard shows countdown that updates every 60s without re-fetching
8. FiresCard only renders when P0 actions or critical alerts exist
9. Page shows cached KPI values from sessionStorage instantly, then updates when API responds
10. `npx tsc --noEmit` and `npm run lint` pass

---

## Task Decomposition (2-Task Handoff Chains)

### Handoff 1: KPI Strip + ActionCenterCard Removal
**Task 1:** Create `KPIStrip.tsx` with micro traffic light tiles, status computation functions, click-to-scroll behavior. Replace inline `KPITile` in `StaffHomepage.tsx`.
**Task 2:** Remove `ActionCenterCard.tsx`. Remove its import and usage from `StaffHomepage.tsx`. Move `EmailPreviewCard` from right sidebar to left column (below `BudgetPulseCard`).

### Handoff 2: Sidebar Restructure — NextUpCard + FiresCard
**Task 3:** Create `NextUpCard.tsx` — next event hero with countdown, remaining events compact list, committee meeting detection.
**Task 4:** Create `FiresCard.tsx` — conditional P0 actions + critical alerts combined card. Wire both new cards into `StaffHomepage.tsx` right sidebar, replacing removed cards.

### Handoff 3: Sandy Says Reorder + Sidebar Final Layout
**Task 5:** Reorder sidebar: SandyRecommendationsCard first, NextUpCard second, FiresCard third (conditional). Remove UpcomingMeetingsCard and My Tasks inline card from sidebar. Verify 3-card max layout.
**Task 6:** Add progressive loading — cache last-known KPI values in sessionStorage, render them instantly on mount, then update when API responds. Add skeleton states for new sidebar cards.

### Handoff 4: Delta Briefing Service + API
**Task 7:** Add `getDailyBriefingDelta()` to `briefing-service.ts` with all delta computation logic (resolved count, new count, meetings completed/remaining, new alerts, budget changed, KPI counts, narrative templates).
**Task 8:** Modify `GET /api/staff/briefing` to accept `?mode=delta&since=ISO` query param. Route to delta function when mode=delta.

### Handoff 5: Client-Side Delta Integration + Time Modes
**Task 9:** In `StaffHomepage.tsx`: store `briefingTimestamp` on initial fetch. Add 30-minute interval + tab-refocus handler that fetches delta. Merge delta into display state (update greeting, KPI counts, prepend delta narrative).
**Task 10:** Implement time-mode rendering: morning (full narrative), afternoon (delta prepended, morning muted below), evening (day-in-review replaces morning narrative). Update `buildBriefingNarrative()` to accept timeMode parameter.
