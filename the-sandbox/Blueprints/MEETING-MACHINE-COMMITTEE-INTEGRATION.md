# Blueprint 7: Meeting Machine ↔ Committee Integration

> **Sprint Scope:** Wire the four Meeting Machine tools (Agenda Builder, Minutes Taker, Action Items, Follow-up Drafter) into the persistent Committee system so that committee context flows into tools and tool output flows back into committee records — eliminating the current gap where these two systems exist side-by-side but don't talk to each other.
> **Depends On:** None — all prerequisite systems are built (Meeting Machine elevation 4/4, Committee CRUD, faculty homepage CommitteeCard).
> **Estimated Size:** Medium (1 sprint)
> **Deploy Order:** 7 of 8 — build after Blueprints 1–6; standalone from student blueprints

---

## Context

the platform has two fully-built meeting systems that don't know about each other:

1. **Meeting Machine** (`/meeting-machine/*`) — Four Sandy-elevated tools that generate agendas, minutes, action items, and follow-up emails. Each tool uses Sandy's interview mode to collect information from scratch via `useMeetingMachineTool.ts`. No persistence — output lives in the browser session only. Cross-tool pipeline passes data via `sessionStorage`.

2. **Committee Management** (`/staff/committees/*`) — Persistent committee entities with members, cadence, meeting templates, minutes history, action items with lifecycle tracking (`open → in-progress → complete`), and auto-push to the staff action queue. Minutes generation exists here too (Sonnet-powered via `minutes-service.ts`), but it's a separate paste-your-notes flow unaware of Meeting Machine.

**The gap:** A faculty member chairing the Curriculum Committee must:
- Manually re-enter attendees, meeting context, and open action items every time they use Meeting Machine
- Copy-paste generated minutes from Meeting Machine into the committee detail page (or use the committee's own generator separately)
- Track action items in two places — Meeting Machine's one-shot output vs. committee's persistent `CommitteeActionItem` tracker
- Navigate to `/meeting-machine` and `/staff/committees/[id]` as unrelated destinations
- Click committee rows on the faculty homepage, which dispatch Sandy messages instead of navigating to the actual data

**The fix:** Make Meeting Machine committee-aware. When launched from a committee context, tools pre-fill with committee data. When output is generated, offer to save it back to the committee record. The faculty homepage CommitteeCard becomes the launchpad.

### Key Files to Modify

| File | Change |
|------|--------|
| `app/lib/meeting-machine-preflight.ts` | Add `committeeContext` to preflight when `committeeId` provided |
| `app/lib/meeting-machine-elevation-service.ts` | Inject committee context into interview system prompts |
| `app/hooks/useMeetingMachineTool.ts` | Accept `committeeId` from URL, pass to preflight, enable save-back |
| `app/meeting-machine/[slug]/page.tsx` | Read `committeeId` query param, show committee banner, add save-back UI |
| `app/components/faculty-home/CommitteeCard.tsx` | Replace Sandy dispatch with direct links + Meeting Machine quick actions |
| `app/staff/committees/[id]/page.tsx` | Add Meeting Machine action bar above tabs |
| `app/api/staff/committees/[id]/meetings/route.ts` | Accept `source: 'meeting-machine'` to store tool output as meeting record |
| `app/components/staff/committees/MeetingMachineActions.tsx` | **New:** Quick-action buttons linking committee → Meeting Machine tools |

### Key Files to Read

| File | Why |
|------|-----|
| `app/lib/meeting-machine-preflight.ts` | Current preflight shape — extend, don't replace |
| `app/lib/staff/committee-service.ts` | `getMeetingPrep()` already builds committee context package |
| `app/lib/staff/minutes-service.ts` | Existing minutes generation + action item creation logic |
| `app/lib/meeting-machine-elevation-service.ts` | Interview prompts — where committee context gets injected |
| `app/hooks/useMeetingMachineTool.ts` | Tool lifecycle hook — where save-back triggers |
| `app/components/faculty-home/CommitteeCard.tsx` | Current Sandy-dispatch behavior to replace |
| `app/lib/faculty/homepage-types.ts` | `FacultyHomepageV2Data['committees']` shape |

---

## Architecture: Committee Context Bridge

### The Bridge Pattern

Committee context flows through URL query params — no new API routes needed for the connection itself. The existing `getMeetingPrep()` in `committee-service.ts` already loads everything we need; we just reshape it into the preflight.

```
Faculty Homepage CommitteeCard
  → click "Prep Agenda"
  → /meeting-machine/agenda-builder?committeeId=abc123
  → preflight loads committee data alongside user data
  → Sandy interview skips questions she already knows
  → output generated
  → "Save to Curriculum Committee" button appears
  → POST /api/staff/committees/abc123/meetings (source: 'meeting-machine')
  → committee record updated, user returned to committee detail page
```

### URL Contract

All Meeting Machine tools accept an optional `committeeId` query parameter:

```
/meeting-machine/agenda-builder?committeeId={id}
/meeting-machine/minutes-taker?committeeId={id}
/meeting-machine/action-items?committeeId={id}
/meeting-machine/follow-up-drafter?committeeId={id}
```

When present, the tool enters **committee mode** — preflight includes committee data, Sandy's interview adapts, and save-back UI appears.

---

## Feature 1: Committee-Aware Preflight

### What

Extend `getMeetingMachinePreflight()` to load committee context when a `committeeId` is provided, so Sandy starts the interview already knowing who's in the room, what's on the agenda, and what action items are outstanding.

### Data Model

Add a `committeeContext` field to the existing `MeetingMachinePreflight` interface:

```typescript
// In meeting-machine-preflight.ts — new type

export interface CommitteeContext {
  id: string
  name: string
  type: string                    // governance, academic, compliance, etc.
  cadence: string | null          // weekly, biweekly, monthly, as-needed
  meetingDay: string | null
  meetingTime: string | null
  meetingLocation: string | null
  members: Array<{
    name: string
    email: string
    role: 'chair' | 'member' | 'secretary' | 'ex-officio'
  }>
  agendaTemplate: string | null   // recurring agenda items (newline-delimited)
  openActionItems: Array<{
    action: string
    ownerName: string
    dueDate: string | null
    priority: string
    status: string
  }>
  lastMeeting: {
    date: string
    meetingNumber: number
    decisions: unknown[] | null
    formattedMinutes: string | null
  } | null
  nextMeetingNumber: number       // auto-incremented from last meeting
}

// Extended preflight shape — backward compatible
export interface MeetingMachinePreflight {
  user: { name: string; email: string; department: string | null; college: string | null; role: 'STUDENT' | 'EDUCATOR' | 'ADMIN' }
  knownContacts: Array<{ name: string; role: string; context: string }>
  courses: Array<{ code: string; title: string; role: 'instructor' | 'student' }>
  writingStyle: string | null
  committeeContext: CommitteeContext | null  // NEW — null when no committeeId
}
```

### Implementation

Reuse `getMeetingPrep()` from `committee-service.ts` — it already loads the committee, open action items, last meeting, and suggested agenda. Reshape its output:

```typescript
export async function getMeetingMachinePreflight(
  userId: string,
  committeeId?: string    // NEW optional param
): Promise<MeetingMachinePreflight> {
  const [base, committeeContext] = await Promise.all([
    buildBasePreflight(userId),                      // existing logic extracted
    committeeId ? buildCommitteeContext(committeeId) : null,
  ])

  // In committee mode, inject committee members as known contacts
  if (committeeContext) {
    for (const member of committeeContext.members) {
      if (!base.knownContacts.some(c => c.name === member.name)) {
        base.knownContacts.push({
          name: member.name,
          role: 'professor',
          context: `${member.role} of ${committeeContext.name}`,
        })
      }
    }
  }

  return { ...base, committeeContext }
}

async function buildCommitteeContext(committeeId: string): Promise<CommitteeContext> {
  const prep = await getMeetingPrep(committeeId)  // from committee-service.ts
  const members = (prep.committee.members as CommitteeMember[]) ?? []

  return {
    id: prep.committee.id,
    name: prep.committee.name,
    type: prep.committee.type,
    cadence: prep.committee.cadence,
    meetingDay: prep.committee.meetingDay,
    meetingTime: prep.committee.meetingTime,
    meetingLocation: prep.committee.meetingLocation,
    members: members.map(m => ({ name: m.name, email: m.email, role: m.role })),
    agendaTemplate: prep.committee.agendaTemplate,
    openActionItems: prep.openActionItems.map(ai => ({
      action: ai.action,
      ownerName: ai.ownerName,
      dueDate: ai.dueDate?.toISOString() ?? null,
      priority: ai.priority,
      status: ai.status,
    })),
    lastMeeting: prep.lastMeeting ? {
      date: prep.lastMeeting.date.toISOString(),
      meetingNumber: prep.lastMeeting.meetingNumber,
      decisions: prep.lastMeeting.decisions as unknown[] | null,
      formattedMinutes: prep.lastMeeting.formattedMinutes,
    } : null,
    nextMeetingNumber: (prep.lastMeeting?.meetingNumber ?? 0) + 1,
  }
}
```

### Preflight API Change

Each Meeting Machine preflight route (`/api/meeting-machine/[tool]/preflight/route.ts`) already receives a POST body. Add `committeeId` as an optional field:

```typescript
const { committeeId } = await req.json()
const preflight = await getMeetingMachinePreflight(auth.user.id, committeeId)
```

No new routes needed. Existing calls without `committeeId` get `committeeContext: null` — fully backward compatible.

---

## Feature 2: Committee-Aware Sandy Interview

### What

When Sandy runs the interview for a committee-linked Meeting Machine tool, she skips questions whose answers are already known from committee context and references prior meetings, open action items, and member names naturally.

### How

Inject committee context into the interview system prompts in `meeting-machine-elevation-service.ts`. Each tool gets a tailored committee block appended to its system prompt:

```typescript
function buildCommitteeBlock(ctx: CommitteeContext, tool: string): string {
  const lines: string[] = [
    `\n## Committee Context — ${ctx.name}`,
    `Type: ${ctx.type} | Cadence: ${ctx.cadence ?? 'as needed'}`,
    `Location: ${ctx.meetingLocation ?? 'TBD'}`,
    `Members: ${ctx.members.map(m => `${m.name} (${m.role})`).join(', ')}`,
  ]

  if (ctx.openActionItems.length > 0) {
    lines.push(`\nOpen action items from previous meetings:`)
    for (const ai of ctx.openActionItems) {
      lines.push(`- "${ai.action}" — ${ai.ownerName} (${ai.priority}, ${ai.status})`)
    }
  }

  if (ctx.lastMeeting) {
    lines.push(`\nLast meeting: #${ctx.lastMeeting.meetingNumber} on ${ctx.lastMeeting.date}`)
  }

  // Tool-specific instructions
  switch (tool) {
    case 'agenda-builder':
      lines.push(`\nDo NOT ask about attendees, meeting cadence, or location — they are above.`)
      lines.push(`Start by asking what NEW topics to add beyond the template and action item review.`)
      if (ctx.agendaTemplate) lines.push(`\nRecurring agenda template:\n${ctx.agendaTemplate}`)
      break

    case 'minutes-taker':
      lines.push(`\nThis is meeting #${ctx.nextMeetingNumber}. Pre-fill attendees from member list.`)
      lines.push(`Ask the user to paste their raw notes or transcript. Skip introductory questions.`)
      break

    case 'action-items':
      lines.push(`\nShow the user the existing open items above first, then ask for new meeting notes to extract additional items.`)
      break

    case 'follow-up-drafter':
      lines.push(`\nDraft per-member follow-up emails. Use member names and roles above.`)
      lines.push(`Reference each person's specific action items in their email.`)
      break
  }

  return lines.join('\n')
}
```

### Interview Phase Shortcuts

In committee mode, Sandy skips known-answer phases — the interview is shorter because she already has the roster, cadence, and history:

| Tool | Normal Phases | Committee Mode Phases | What's Skipped |
|------|--------------|----------------------|----------------|
| Agenda Builder | 4 (who, when, topics, duration) | 2 (new topics, special items) | Attendees, cadence, recurring items |
| Minutes Taker | 3 (meeting details, attendees, notes) | 1 (paste notes) | Meeting metadata, attendee list |
| Action Items | 2 (context, notes) | 1 (paste notes — existing items shown) | Committee context |
| Follow-up Drafter | 3 (attendees, decisions, items) | 1 (confirm decisions + items) | Recipient list |

Sandy acknowledges the committee context naturally in her opening message:

> "I can see this is for the **Curriculum Committee** — your biweekly group with Dr. Chen, Prof. Marks, and 4 others. You have 3 open action items from meeting #7. What new topics should we add to the agenda?"

### Chip Adaptation

First-turn chips in committee mode reflect the shortened flow:

```typescript
// Agenda Builder — committee mode chips
['Review open action items first', 'Skip to new topics', 'Use last meeting\'s format']

// Minutes Taker — committee mode chips
['Paste my notes', 'Record from transcript', 'Start from agenda']

// Action Items — committee mode chips
['Show existing items', 'Paste new meeting notes', 'Mark items complete']

// Follow-up Drafter — committee mode chips
['Draft all follow-ups', 'Chair summary only', 'Action item reminders only']
```

---

## Feature 3: Save-Back to Committee Records

### What

After Meeting Machine generates output in committee mode, a "Save to [Committee Name]" button appears that writes the output back to the committee's persistent meeting record — creating a `CommitteeMeeting` with formatted minutes, action items, and decisions.

### UI: Save-Back Banner

When `committeeId` is present and generation is complete, show a save-back banner above the generated content:

```
┌─────────────────────────────────────────────────────────────────┐
│  🏛 Curriculum Committee · Meeting #8                          │
│                                                                 │
│  [Save to Committee]              [Copy Only]                  │
│                                                                 │
│  Saving creates a meeting record with minutes, action items,   │
│  and decisions in the committee's history.                      │
└─────────────────────────────────────────────────────────────────┘
```

Standard card style: `rounded-2xl border border-gray-200 bg-white p-5`.

### Save-Back Handler

```typescript
// In useMeetingMachineTool.ts — new function

async function saveToCommittee() {
  setSaving(true)
  try {
    const res = await fetch(`/api/staff/committees/${committeeId}/meetings`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        source: 'meeting-machine',
        tool: currentTool,           // 'agenda-builder' | 'minutes-taker' | etc.
        rawNotes: interviewState.collectedNotes ?? '',
        formattedOutput: generatedOutput,
        date: new Date().toISOString(),
        attendees: preflight.committeeContext?.members.map(m => m.name),
      }),
    })

    if (res.ok) {
      const { meetingId } = await res.json()
      router.push(`/staff/committees/${committeeId}?tab=meetings&meeting=${meetingId}`)
    }
  } finally {
    setSaving(false)
  }
}
```

### API Extension

Extend the existing `POST /api/staff/committees/[id]/meetings` route to accept Meeting Machine output. The route already creates `CommitteeMeeting` records — add a branch for `source: 'meeting-machine'`:

```typescript
// When source === 'meeting-machine':
// - Skip Sonnet re-generation (output is already formatted by Meeting Machine)
// - Store formattedOutput as formattedMinutes
// - Parse action items from generated output using existing extraction logic
// - Create CommitteeMeeting with status 'draft'
// - Create CommitteeActionItem records
// - Push action items to staff action queue (existing behavior in minutes-service.ts)

interface MeetingMachineInput {
  source: 'meeting-machine'
  tool: string
  rawNotes: string
  formattedOutput: string
  date: string
  attendees?: string[]
}
```

The existing minutes generation path (`source` absent) remains unchanged — this is purely additive.

### Tool-Specific Save Behavior

| Tool | What Gets Saved | `CommitteeMeeting` Fields |
|------|-----------------|---------------------------|
| Agenda Builder | Agenda stored for the upcoming meeting | `agendaItems` (JSON), status `'draft'`, no `formattedMinutes` yet |
| Minutes Taker | Full minutes with extracted action items + decisions | `formattedMinutes`, `actionItems`, `decisions`, `rawNotes` |
| Action Items | New action items linked to most recent meeting | Creates `CommitteeActionItem` records, links to existing or new meeting |
| Follow-up Drafter | Distribution draft attached to meeting | `distributionStatus: 'draft'` + generated email content in meeting metadata |

---

## Feature 4: Faculty Homepage Committee Quick Actions

### What

Replace the current Sandy-dispatch behavior on `CommitteeCard.tsx` with direct navigation links. Each committee row gets contextual quick-action buttons that launch the right Meeting Machine tool or navigate to the committee detail page.

### Current Behavior (to replace)

Clicking a committee row dispatches a `sandy-prefill` CustomEvent:
```typescript
window.dispatchEvent(new CustomEvent('sandy-prefill', {
  detail: { message: `Tell me about ${committee.name}...`, autoSend: true }
}))
```

This requires Sandy to interpret the request and doesn't leverage the structured committee data we already have.

### New Behavior

Each committee row becomes a `Link` to `/staff/committees/[id]`. Quick action buttons appear contextually based on meeting proximity:

```
┌─────────────────────────────────────────────────────────────────┐
│  Curriculum Committee                                           │
│  Next: Mar 28, 10:00 AM                                        │
│                                                                 │
│  ⚠ "Update assessment rubric" — due Mar 28                     │
│  📄 Minutes from Mar 14 — unread                                │
│                                                                 │
│  [2 action items due]  [Unread minutes]                         │
│                                                                 │
│  [Prep Agenda →]  [Generate Minutes →]                          │
└─────────────────────────────────────────────────────────────────┘
```

### Quick Action Logic

Which quick actions appear depends on meeting proximity and committee state:

```typescript
interface CommitteeQuickAction {
  label: string
  href: string
  icon: 'calendar' | 'file-text' | 'list-checks' | 'mail'
}

function getQuickActions(committee: CommitteeData): CommitteeQuickAction[] {
  const actions: CommitteeQuickAction[] = []
  const now = new Date()
  const nextMeeting = committee.nextMeeting ? new Date(committee.nextMeeting) : null
  const daysUntil = nextMeeting
    ? Math.ceil((nextMeeting.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null

  // 3 days before meeting: prep agenda
  if (daysUntil !== null && daysUntil <= 3 && daysUntil > 0) {
    actions.push({
      label: 'Prep Agenda',
      href: `/meeting-machine/agenda-builder?committeeId=${committee.id}`,
      icon: 'calendar',
    })
  }

  // Meeting day or 1 day after: generate minutes
  if (daysUntil !== null && daysUntil <= 0 && daysUntil >= -1) {
    actions.push({
      label: 'Generate Minutes',
      href: `/meeting-machine/minutes-taker?committeeId=${committee.id}`,
      icon: 'file-text',
    })
  }

  // Has open action items: review them
  if (committee.actionItemsDue > 0) {
    actions.push({
      label: 'Review Actions',
      href: `/staff/committees/${committee.id}?tab=actions`,
      icon: 'list-checks',
    })
  }

  // Has unread minutes: view them
  if (committee.unreadMinutes) {
    actions.push({
      label: 'View Minutes',
      href: `/staff/committees/${committee.id}?tab=meetings`,
      icon: 'file-text',
    })
  }

  return actions.slice(0, 2)  // Max 2 quick actions to keep card compact
}
```

### Footer Link

The "View committees" footer link changes from Sandy dispatch to a simple `Link`:

```tsx
<Link
  href="/staff/committees"
  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0033A0] transition-colors hover:text-[#00277A]"
>
  View committees
  <ArrowRight className="size-4" />
</Link>
```

---

## Feature 5: Committee Detail → Meeting Machine Links

### What

The committee detail page (`/staff/committees/[id]`) gets a "Meeting Machine" action bar that links out to the four tools with committee context pre-filled.

### UI

A new `MeetingMachineActions` component rendered between the committee header and the tab layout:

```
┌─────────────────────────────────────────────────────────────────┐
│  Meeting Machine                                                │
│  Launch tools pre-filled with Curriculum Committee context       │
│                                                                 │
│  [📋 Build Agenda]  [📝 Generate Minutes]                       │
│  [✅ Extract Actions]  [📧 Draft Follow-ups]                    │
└─────────────────────────────────────────────────────────────────┘
```

### Component

```tsx
// app/components/staff/committees/MeetingMachineActions.tsx — NEW FILE

'use client'

import Link from 'next/link'
import { Calendar, FileText, ListChecks, Mail } from 'lucide-react'

interface MeetingMachineActionsProps {
  committeeId: string
  committeeName: string
}

const TOOLS = [
  { slug: 'agenda-builder', label: 'Build Agenda', icon: Calendar },
  { slug: 'minutes-taker', label: 'Generate Minutes', icon: FileText },
  { slug: 'action-items', label: 'Extract Actions', icon: ListChecks },
  { slug: 'follow-up-drafter', label: 'Draft Follow-ups', icon: Mail },
] as const

export default function MeetingMachineActions({ committeeId, committeeName }: MeetingMachineActionsProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-extrabold text-gray-900">Meeting Machine</h3>
      <p className="mt-1 text-xs text-gray-500">
        Launch tools pre-filled with {committeeName} context
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {TOOLS.map(({ slug, label, icon: Icon }) => (
          <Link
            key={slug}
            href={`/meeting-machine/${slug}?committeeId=${committeeId}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-[#0033A0]"
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </div>
    </section>
  )
}
```

Render in `app/staff/committees/[id]/page.tsx` between the committee header and `CommitteeDetailLayout`:

```tsx
{committee && (
  <MeetingMachineActions committeeId={committee.id} committeeName={committee.name} />
)}
```

---

## Feature 6: Action Item Lifecycle Bridge

### What

Close the loop on action items so they flow seamlessly between the faculty homepage, the committee detail page, and Meeting Machine's action item extraction.

### Current State

- `CommitteeActionItem` records exist in the database with `open → in-progress → complete` lifecycle
- They auto-push to `StaffActionItem` queue on creation (in `minutes-service.ts`)
- Faculty homepage `CommitteeCard` shows action item count + next title inline
- Meeting Machine's Action Items tool extracts items from notes but doesn't know about existing committee items

### A. Previous Action Item Review in Minutes

When generating minutes in committee mode, Sandy automatically includes a "Review of Previous Action Items" section at the top. This is injected via the committee block in the system prompt (Feature 2). The Sonnet generation prompt receives the open items list and produces:

```markdown
## Review of Previous Action Items

| # | Action | Owner | Status | Notes |
|---|--------|-------|--------|-------|
| 1 | Update assessment rubric | Dr. Chen | Complete | Completed Mar 20 |
| 2 | Draft policy memo for dean | Prof. Marks | In Progress | Expected Mar 30 |
| 3 | Schedule guest speaker | Katie T. | Open | No update |
```

This already works with the existing `minutes-service.ts` generation — the committee block just provides the data that Sandy uses to format the review section.

### B. Action Item Status Sync

When a `CommitteeActionItem` is marked complete on the committee detail page, the existing `PATCH /api/staff/committees/[id]/actions/[actionId]` endpoint updates the record. The auto-push to `StaffActionItem` happens at creation time — status sync from committee → staff queue is a new addition:

```typescript
// In the action item PATCH handler, after updating CommitteeActionItem:
// Find the corresponding StaffActionItem (matched by metadata.committeeActionItemId)
// Update its status to match
await prisma.staffActionItem.updateMany({
  where: {
    metadata: { path: ['committeeActionItemId'], equals: actionItemId },
  },
  data: { status: newStatus === 'complete' ? 'DONE' : 'IN_PROGRESS' },
})
```

### C. Meeting Machine → New Action Items

When Meeting Machine extracts action items in committee mode and the user saves back (Feature 3):
1. Each item is saved as a `CommitteeActionItem` linked to the new `CommitteeMeeting`
2. Auto-pushed to `StaffActionItem` queue with priority mapping (`critical → P0`, `high → P1`, `medium → P2`, `low → P3`)
3. Chair is default assignee (existing behavior in `minutes-service.ts`)
4. Items appear immediately on the faculty homepage `CommitteeCard` after save

No new logic needed — the existing `createActionItemsFromMeeting()` in `minutes-service.ts` handles steps 1–3. The save-back handler (Feature 3) just needs to call it.

---

## Feature 7: Committee Context Banner in Meeting Machine

### What

When a Meeting Machine tool is opened with `committeeId`, show a compact context banner at the top of the page confirming which committee the tool is linked to, with an escape hatch to use the tool in standalone mode.

### UI

```
┌─────────────────────────────────────────────────────────────────┐
│  🏛 Linked to: Curriculum Committee                 [Unlink ×]  │
│  6 members · Biweekly Tuesdays · 3 open action items           │
└─────────────────────────────────────────────────────────────────┘
```

Uses `rounded-2xl border border-blue-200 bg-blue-50 p-4` to distinguish from content cards.

### Implementation

In `app/meeting-machine/[slug]/page.tsx`:

```typescript
const searchParams = useSearchParams()
const committeeId = searchParams.get('committeeId')
```

If present:
- Preflight call includes `committeeId`
- Banner renders above the split-panel layout using data from `preflight.committeeContext`
- Clicking "Unlink" calls `router.replace(pathname)` (removes query param) and re-runs preflight without committee context
- Tool reverts to standalone mode seamlessly

---

## Feature 8: Cross-Tool Pipeline with Committee Context

### What

Meeting Machine already supports a cross-tool pipeline via `sessionStorage` (e.g., agenda → minutes → action items → follow-up). In committee mode, the `committeeId` persists through the pipeline automatically.

### How

The existing pipeline in `useMeetingMachineTool.ts` stores output in `sessionStorage` keyed by tool slug. Extend the stored data to include `committeeId`:

```typescript
// When navigating to next tool in pipeline:
sessionStorage.setItem(`mm-pipeline-${nextTool}`, JSON.stringify({
  previousOutput: generatedOutput,
  previousTool: currentTool,
  committeeId,   // NEW — carries forward
}))

router.push(`/meeting-machine/${nextTool}${committeeId ? `?committeeId=${committeeId}` : ''}`)
```

The complete pipeline flow in committee mode:

```
Agenda Builder (committeeId=abc)
  → "Continue to Minutes Taker" chip →
Minutes Taker (committeeId=abc, agenda context loaded)
  → "Continue to Action Items" chip →
Action Items (committeeId=abc, minutes context loaded)
  → "Continue to Follow-up Drafter" chip →
Follow-up Drafter (committeeId=abc, actions context loaded)
  → "Save All to Committee" button →
POST /api/staff/committees/abc/meetings (complete meeting record)
  → redirect to /staff/committees/abc?tab=meetings
```

The final "Save All to Committee" at the pipeline end creates a single `CommitteeMeeting` record with agenda, minutes, action items, and distribution draft — the complete meeting package in one save.

---

## Data Flow Summary

```
                    Faculty Homepage
                    ┌──────────────┐
                    │ CommitteeCard │── click row ──→ /staff/committees/[id]
                    │              │── quick action → /meeting-machine/[tool]?committeeId=X
                    └──────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────┐
    │         Committee Detail Page                 │
    │  ┌────────────────────────────────────────┐   │
    │  │  MeetingMachineActions                 │   │
    │  │  [Agenda] [Minutes] [Actions] [Follow] │   │
    │  └─────────────┬──────────────────────────┘   │
    │                │                              │
    │  Meetings tab ←── save-back ────────┐        │
    │  Actions tab  ←── new items ────────┤        │
    │  Decisions tab ←── decisions ────────┤        │
    └──────────────────────────────────────┤────────┘
                                           │
                    ┌──────────────────────┴───────────────┐
                    │       Meeting Machine (committee mode)│
                    │  ┌─────────────────────────────────┐  │
                    │  │  Committee Context Banner        │  │
                    │  │  "Linked to: Curriculum Comm."  │  │
                    │  └─────────────────────────────────┘  │
                    │                                       │
                    │  Sandy Interview (shortened phases)   │
                    │  → pre-filled members, agenda, items  │
                    │  → output generated                   │
                    │  → [Save to Committee] button         │
                    │                                       │
                    │  Pipeline: Agenda → Minutes → Actions │
                    │            → Follow-ups → Save All    │
                    └───────────────────────────────────────┘
```

---

## What This Does NOT Do

- Does not create new database models — uses existing `Committee`, `CommitteeMeeting`, `CommitteeActionItem`
- Does not replace the committee detail page's built-in minutes generator — that remains as an alternative path for users who prefer paste-and-generate without Sandy interview
- Does not add calendar integration or meeting scheduling — stays with cadence-based heuristic in `computeNextMeeting()`
- Does not add document storage (OneDrive/SharePoint) — that's Blueprint 8 (University Systems Integration Hub)
- Does not change Meeting Machine tools for non-committee use — standalone mode is completely unchanged; `committeeContext: null` is the default
- Does not add committee creation from Meeting Machine — committees are created in `/staff/committees`
- Does not add real-time notifications for minutes distribution — uses existing distribution draft flow in `minutes-distribution.ts`

---

## Success Criteria

- [ ] Faculty member clicks "Prep Agenda" on CommitteeCard 3 days before a meeting → lands in Agenda Builder with all members, recurring template, and open action items pre-loaded → Sandy asks only "What new topics for this meeting?"
- [ ] After a meeting, "Generate Minutes" opens Minutes Taker with committee pre-filled → user pastes raw notes → Sandy generates parliamentary-style minutes → "Save to Curriculum Committee" creates a `CommitteeMeeting` record visible on committee detail page
- [ ] Action items extracted by Meeting Machine appear on committee's action items tab AND on faculty homepage CommitteeCard within the same page load
- [ ] Full pipeline (Agenda → Minutes → Actions → Follow-ups) carries `committeeId` through all 4 tools → offers single "Save All" at the end
- [ ] CommitteeCard rows are clickable `Link` elements to `/staff/committees/[id]` — no more Sandy dispatch for committee navigation
- [ ] "Unlink" button on committee banner in Meeting Machine reverts tool to standalone mode without page reload
- [ ] Standalone Meeting Machine use (no `committeeId`) is completely unaffected — no regression in any of the 4 tools
- [ ] Action item status changes on committee detail page sync to corresponding `StaffActionItem` records
- [ ] `MeetingMachineActions` component renders on committee detail page with 4 tool links
- [ ] Demo seed data: at least 2 committees have past meetings with agendas, minutes, and action items that exercise the full integration
