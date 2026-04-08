# Blueprint: Faculty Homepage Intelligence

> **Sprint Scope:** Enhance existing homepage components with richer data, clickable surfaces, and smarter defaults.
> **Depends On:** Nothing — all changes are to existing components.
> **Estimated Size:** Medium (1 sprint)

---

## Context

The faculty homepage (`FacultyHomepage.tsx`) already has the right structure: Attention Bar, Quick Actions, Your Day zone, and a 3-tab bottom section. This sprint makes every element **smarter and more actionable** without adding new sections.

### Key Files to Modify

| File | Change |
|------|--------|
| `app/components/faculty-home/AttentionBar.tsx` (243 lines) | Add effort indicators per item |
| `app/components/faculty-home/FacultyHomepage.tsx` (602 lines) | Make course cards expandable with at-risk names |
| `app/components/briefing/CalendarBrief.tsx` (134 lines) | Make every event clickable → navigate to relevant page |
| `app/components/briefing/TaskBrief.tsx` (144 lines) | Add source badges + acceptance flow for auto-generated tasks |
| `app/components/faculty-home/CommitteeCard.tsx` (97 lines) | Show action item titles inline |
| `app/components/faculty-home/OfficeHoursCard.tsx` (141 lines) | Clarify "students waiting" semantics |
| `app/lib/faculty/homepage-types.ts` (71 lines) | Extend types for new fields |
| `app/lib/faculty/homepage-aggregator.ts` (189 lines) | Compute effort estimates, comparison data |

---

## Feature 1: Estimated Effort per Attention Bar Item

### What
Each Attention Bar badge should indicate **how much effort** the item requires, so faculty can triage by time available.

### How
Extend the Attention Bar items with effort metadata:

```typescript
// In homepage-types.ts — extend or add:
interface AttentionItem {
  label: string
  count: number
  urgency: 'red' | 'amber' | 'blue'
  // NEW:
  effortHint: string  // e.g., "~5 min (AI-drafted)" or "~30 min (manual review)"
}
```

**For grading items:**
- If all pending submissions have `GradebookEntry.status === 'AI_DRAFT'` → show "(AI-drafted, quick review)"
- If any are `PENDING_REVIEW` with no AI draft → show "(manual review needed)"
- Compute from `homepage-aggregator.ts` by checking gradebook entry statuses

**For tasks:**
- Auto-generated tasks: show "(suggested)" chip
- Self-created: show nothing (assumed intentional)
- Assigned: show "(from [Name])"

### UI
- Effort hint renders as a smaller secondary line below each badge count
- Uses `text-xs text-slate-500` styling, not prominent — just informational

---

## Feature 2: Everything Clickable & Dynamic

### What
Every element on the homepage must navigate somewhere when clicked. No inert display-only cards.

### Rules

| Element | Current Behavior | Target Behavior |
|---------|-----------------|-----------------|
| Calendar events | Display only | Click → if course-related, navigate to course page. If meeting, navigate to Meeting Machine. Otherwise, open Sandy with "Tell me about [event]" |
| Attention Bar badges | Some click, some don't | Every badge clicks → relevant page (gradebook, tasks, advisees, email) |
| Email items | Click to expand | Click to expand + "Open in Sandy" action to compose reply |
| Committee cards | "View committees" opens Sandy | Keep Sandy link, but also make committee name clickable → Meeting Machine workspace |
| Assessment deadlines | Display only | Click → `/compliance` or relevant course page |
| Department feed items | Display only | Click → expand full content or navigate to source |

### Implementation
- Wrap each card/item in a `<button>` or `<Link>` with `cursor-pointer` and hover state
- For Sandy-bound actions, dispatch `sandy-prefill` event
- For page navigation, use `next/navigation` `useRouter().push()`
- Calendar events: match `event.title` against course codes to auto-link

---

## Feature 3: Task Source Badges + Human-in-Loop Acceptance

### What
Tasks should show their origin. Auto-generated tasks appear as **suggestions** that the user explicitly accepts before they become real tasks.

### Data Model Change
In `homepage-aggregator.ts`, each task already comes from the briefing API. Extend the task shape:

```typescript
interface TaskItem {
  id: string
  title: string
  isOverdue: boolean
  dueDate: string | null
  // NEW:
  source: 'auto' | 'self' | 'assigned'
  assignedBy?: string  // Name of person who assigned (if source === 'assigned')
  accepted: boolean    // false for auto-generated suggestions
}
```

### UI Flow
1. **Self-created / Assigned tasks:** Render normally with source badge
   - Self-created: no badge (default)
   - Assigned: small gray pill "From [Name]"
2. **Auto-generated (suggested) tasks:** Render with dashed border + "Suggested" badge
   - Show "Accept" (checkmark) and "Dismiss" (X) buttons
   - On accept → task becomes solid, moves to regular list
   - On dismiss → task fades out, stored as dismissed (don't re-suggest)

### Source Detection Logic (in aggregator)
- Tasks created via Sandy tools → `source: 'auto'`
- Tasks created by user manually → `source: 'self'`
- Tasks from committee action items or admin assignments → `source: 'assigned'`, `assignedBy: [name]`

---

## Feature 4: Clickable Engagement % with Formula Breakdown

### What
The engagement percentage on course cards is currently opaque. Make it clickable to show a tooltip explaining how it's calculated.

### Tooltip Content
```
Engagement: 62%
─────────────────
Assignment completion: 70%
Tool session activity: 55%
Login frequency: 60%
─────────────────
Weighted average (40/30/30)
```

### Implementation
- Wrap engagement % in a `Popover` or `Tooltip` component (use Radix UI or custom)
- Data: engagement breakdown should come from `/api/dashboard` — extend the `courseHealth` response to include sub-metrics
- Extend `DashboardData.courseHealth[]`:
  ```typescript
  interface CourseHealth {
    // existing...
    engagementBreakdown?: {
      assignmentCompletion: number
      toolActivity: number
      loginFrequency: number
    }
  }
  ```
- The aggregator computes these from existing data: `Assignment.submissions.count / Assignment.expected`, `ToolSession.count` per student, `CourseEnrollment.lastAccessedAt` recency

---

## Feature 5: At-Risk Student Names Inline

### What
Course cards currently show "3 at risk" as a number. Show the actual student names in an expandable section.

### UI
```
TEK-301 — Instructional Design
Enrolled: 28 | Engagement: 62% | 3 at risk ▾

[Expanded:]
  • Maria L. — Grade drop (Module 5)
  • James K. — 14 days inactive
  • Devon P. — Missed 3 classes
  [View all in analytics →]
```

### Data
- Already available: `courseHealth[].atRiskCount` exists
- Need to add: `courseHealth[].atRiskStudents: Array<{ name: string, flag: string, detail: string }>`
- Source: `StudentProfile.riskScore > 0.6` → include in course health query
- Limit to top 5 per course (with "X more..." link)

### Privacy
- Only show students enrolled in that faculty member's course
- Names are first name + last initial (not full name on homepage)
- Full details available on click-through to analytics

---

## Feature 6: "vs. Last Term" Comparison Indicator

### What
Add a subtle comparison to previous semester's engagement to contextualize current metrics.

### UI
```
Engagement: 62% (↓ from 68% last term)
```
or
```
Engagement: 87% (↑ from 82% last term)
```

### Implementation
- Store historical engagement snapshots per course per term
- If no previous term data exists, don't show the comparison (graceful degradation)
- Arrow + delta styled: green for improvement, red for decline, gray if within ±2%
- Data source: a new `CourseEngagementHistory` table or computed from `ToolSession` records grouped by semester

### Fallback
For demo/seed data, hardcode reasonable previous-term values in the aggregator. When real data accumulates, switch to computed values.

---

## Feature 7: Committee Action Item Titles Inline

### What
Committee cards currently show "1 action item due" but not *what* it is. Show the title.

### Current Type
```typescript
committees: Array<{
  id: string
  name: string
  nextMeeting: string | null
  actionItemsDue: number
  unreadMinutes: boolean
}>
```

### Extended Type
```typescript
committees: Array<{
  id: string
  name: string
  nextMeeting: string | null
  actionItemsDue: number
  unreadMinutes: boolean
  // NEW:
  nextActionTitle: string | null    // Title of most urgent action item
  unreadMinutesDate: string | null  // Date of the meeting whose minutes are unread
}>
```

### UI
```
Tenure & Promotion Committee
Next meeting: Mar 28, 3:00 PM
⚠ "Review candidate portfolio for Dr. Smith" — due Mar 27
📄 Minutes from Mar 14 — unread
```

---

## Feature 8: Clarify "Students Waiting" in Office Hours

### What
"3 students waiting" is ambiguous. Define and display clearly.

### Semantic Decision
- **"students waiting"** = students who have joined the live office hours queue (real-time)
- **"students flagged"** = students the platform identified as needing attention (AI-detected)

### UI Change
```
Office Hours — Today 2:00-3:30 PM
Queue: 3 students checked in
Top topic: "Midterm review — Module 5"

Flagged (need attention):
  Maria L. — Grade drop, TEK-301
  James K. — 14 days inactive, TEK-301
```

Separate "Queue" (real-time, student-initiated) from "Flagged" (AI-detected, platform-initiated).

---

## Acceptance Criteria

- [ ] Every Attention Bar item shows effort hint
- [ ] Every element on homepage is clickable with appropriate navigation
- [ ] Tasks show source badges; auto-generated tasks require acceptance
- [ ] Engagement % has clickable tooltip with formula breakdown
- [ ] Course cards expand to show at-risk student names (first + last initial)
- [ ] "vs. last term" comparison shows on engagement metrics
- [ ] Committee cards show action item titles and unread minutes dates
- [ ] Office hours card clearly separates "queue" from "flagged"
- [ ] All new fields flow from aggregator → types → API → UI
- [ ] Demo seed data includes realistic values for all new fields

---

## FERPA Notes
- At-risk student names: first name + last initial only on homepage. Full name on click-through.
- Only show students from courses taught by the logged-in educator.
- No cross-course student data visible unless both courses belong to the same educator.
