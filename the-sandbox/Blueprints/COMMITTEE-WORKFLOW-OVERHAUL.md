# Blueprint: Committee Workflow Overhaul (Scope C)

> **Sprint Scope:** Shift committees from a records archive to a meeting lifecycle tool — agenda management, live notes, section-editable minutes, confirmed action assignments, distribution preview, and cross-committee aggregation.
> **Depends On:** None — independent of Scopes A, B, D.
> **Estimated Size:** Large (5 handoff prompts, 10 tasks)
> **Audit Steps Addressed:** 7 (Committee Work), 8 (Meeting Lifecycle), 9 (Action Tracking)
> **Origin:** Morgan Rivera day-in-the-life UX audit, 2026-03-26

---

## Context

The committee system (`/staff/committees`) is a mature AI-powered governance platform: 2 pages, 2 services (623 LOC), 11 components (1,171 LOC), 10 API routes. Minutes generation via Claude Sonnet works well. But the UX treats committees as a **records archive** rather than a **meeting lifecycle tool**. Morgan chairs 3 committees and hits these friction points daily:

1. **No agenda management** — agendaTemplate field exists on Committee but is never exposed in UI. Morgan writes agendas in a separate doc.
2. **Generate Minutes tab always visible** — should only appear after a meeting happens, not as a permanent tab.
3. **No live notes** — Morgan takes notes during meetings in Notepad, then pastes into the generator. No timestamps, no structure.
4. **One-shot minutes** — AI generates full minutes; editing means regenerating everything. No per-section revision.
5. **Action items not confirmed** — AI extracts actions but Morgan can't reassign or adjust before finalizing. Owner names may not match real users.
6. **No distribution preview** — "Distribute" button sends to unknown recipients with no preview of the email content.
7. **No cross-committee view** — Morgan has no single screen showing "all my action items across all committees."

### Current Architecture (What Exists)

**Component tree:**
```
/staff/committees/page.tsx (136 lines) — list page
/staff/committees/[id]/page.tsx (427 lines) — detail page
  ├── CommitteeDetailLayout.tsx (56 lines) — 4 tabs: Meetings, Actions, Decisions, Generate
  ├── MeetingsList.tsx (101 lines) — meeting table
  ├── CommitteeActionItemsList.tsx (181 lines) — action items with toggle/notes
  ├── DecisionLog.tsx (114 lines) — searchable decisions
  ├── MinutesGeneratorPanel.tsx (193 lines) — input + generate
  ├── MinutesCard.tsx (323 lines) — full minutes display
  ├── MinutesActions.tsx (91 lines) — Distribute/Finalize/Create Items/Download
  ├── MinutesPreview.tsx (88 lines) — compact preview
  ├── AttendanceEditor.tsx (62 lines) — toggle present/absent
  ├── MotionBlock.tsx (44 lines) — motion display
  └── CommitteeCard.tsx (108 lines) — summary card for list page
```

**Service:** `app/lib/staff/committee-service.ts` (222 lines)
- `getCommittees(userId)`, `getCommittee(committeeId)`, `createCommittee(input)`, `updateCommittee(committeeId, input)`, `getUpcomingMeetings(userId)`, `getMeetingPrep(committeeId)`

**Minutes service:** `app/lib/staff/minutes-service.ts` (401 lines)
- `generateMinutes(input)`, `regenerateMinutes(meetingId)`, `updateActionItemStatus(actionId, status, notes?)`, `getCommitteeHistory(committeeId)`, `getMeeting(meetingId)`, `updateMeeting(meetingId, updates)`, `getOpenActionItems(committeeId)`

**Schema:** `Committee` (members as JSON array), `CommitteeMeeting` (rawNotes, formattedMinutes, agendaItems, decisions, actionItems as JSON), `CommitteeActionItem` (ownerName, ownerUserId?, status lifecycle)

**API routes (10):** Full CRUD + generation + distribution under `/api/staff/committees/`

---

## What Changes

### 1. "Next Meeting" Hero Card

Replace the static committee detail header with a dynamic hero showing the next meeting context.

**On committee detail page**, above tabs:
- Date + time + location (from cadence computation)
- Draft agenda (from `agendaTemplate` or last meeting's carried-forward items)
- Attached docs count (future — placeholder for now)
- "Prep with Sandy" button → dispatches `sandy-prefill` with committee context
- "Start Meeting" button → switches to live notes mode

### 2. Editable Agenda

**New component: `AgendaEditor.tsx`**
- Renders agenda items as a reorderable list (drag handle or up/down buttons)
- Each item: title (editable), optional description, time allocation (optional)
- "Add item" button at bottom
- Carries forward unresolved items from previous meeting automatically
- Persisted to committee via new `nextAgenda` JSON field on Committee model
- "Use as template" saves current agenda as `agendaTemplate`

### 3. Live Notes Editor

**New component: `LiveNotesEditor.tsx`**
- Markdown textarea with auto-timestamps (click "Timestamp" button inserts `[HH:MM]`)
- Agenda sidebar showing items as clickable anchors (clicking inserts `## [Agenda Item Title]` header)
- Auto-save every 30s to `CommitteeMeeting.rawNotes` via PATCH
- "End Meeting" button transitions to minutes generation (pre-populated with live notes)
- Meeting timer shows elapsed time since "Start Meeting"

### 4. Section-Editable Minutes

**Modify `MinutesCard.tsx`** to support per-section editing:
- Each agenda item section gets an "Edit" button
- Clicking opens inline textarea with the section's markdown
- "Revise with Sandy" button per section → calls Sonnet to rewrite just that section given the original notes + user instructions
- Save updates only that section in `formattedMinutes` (split by `## ` headers)
- No more full-regeneration for minor edits

### 5. Action Item Assignment Confirmation

**New component: `ActionItemConfirmation.tsx`**
- After minutes generation, show extracted actions in an editable table
- Each row: action text (editable), owner (dropdown of committee members + freetext), due date (date picker), priority (dropdown)
- "Confirm & Create" button creates the `CommitteeActionItem` records
- Until confirmed, action items exist only in the meeting's JSON — not as separate records
- This replaces the current auto-creation in `generateMinutes()`

### 6. Distribution Preview

**New component: `DistributionPreview.tsx`**
- Before sending, show: recipient list (all committee members), email subject, email body preview (rendered markdown)
- Toggle individual recipients on/off
- "Send" button triggers actual distribution
- "Download PDF" alternative for offline distribution

### 7. Cross-Committee Action Items View

**New page or tab:** "My Actions" aggregation
- Shows all open/in-progress action items across all committees for the current user
- Grouped by committee, sorted by due date
- Status toggle, notes editing (reuses `CommitteeActionItemsList` component)
- Accessible from staff homepage sidebar or as a tab on `/staff/committees`

---

## Schema Changes

```prisma
model Committee {
  // ... existing fields ...
  nextAgenda    Json?    // NEW — [{ title, description?, timeMinutes? }]
}
```

Single field addition. Migration: `npx prisma migrate dev --name add-next-agenda-to-committee`.

No other schema changes — live notes use existing `rawNotes` field, section edits use existing `formattedMinutes` field.

---

## Task Decomposition (2-Task Handoff Chains)

### Handoff 1: Next Meeting Hero + Agenda Editor
**Task 1:** Add `nextAgenda` JSON field to Committee schema. Run migration. Add `updateAgenda(committeeId, agenda)` to committee-service. Create `PATCH /api/staff/committees/[id]/agenda` route. Build `AgendaEditor.tsx` component (reorderable list, add/remove/edit items, time allocation).

**Task 2:** Build "Next Meeting" hero card on committee detail page. Shows date/time/location, agenda preview (from `nextAgenda` or `agendaTemplate`), "Prep with Sandy" button (sandy-prefill), "Start Meeting" button. Carries forward unresolved action items from last meeting into agenda suggestions. Replace static header area above tabs.

### Handoff 2: Live Notes + Meeting Flow
**Task 3:** Build `LiveNotesEditor.tsx` — markdown textarea with timestamp insertion, agenda item anchors sidebar, auto-save (PATCH meeting rawNotes every 30s), elapsed timer. Add `createMeetingDraft(committeeId)` to minutes-service that creates a CommitteeMeeting in "in-progress" status.

**Task 4:** Wire "Start Meeting" → LiveNotesEditor → "End Meeting" flow. Start creates draft meeting record (in-progress status). End transitions to MinutesGeneratorPanel pre-filled with live notes. Update CommitteeDetailLayout tabs: hide "Generate" tab when no meeting in progress; show "Live Meeting" tab when active. Add meeting status indicator in hero card.

### Handoff 3: Section-Editable Minutes + Action Confirmation
**Task 5:** Modify `MinutesCard.tsx` for per-section editing. Add "Edit" button per agenda section. Inline textarea for manual edits. "Revise with Sandy" button per section calls new `POST /api/staff/committees/[id]/meetings/[meetingId]/revise-section` route (sends section index + instruction to Sonnet, returns revised section only). Save updates to `formattedMinutes`.

**Task 6:** Build `ActionItemConfirmation.tsx` — editable table of extracted actions after generation. Owner dropdown (committee members), date picker, priority selector. "Confirm & Create" creates CommitteeActionItem records. Modify `generateMinutes()` to NOT auto-create action item records — store in meeting JSON only. Move record creation to explicit confirmation step.

### Handoff 4: Distribution Preview + Cross-Committee View
**Task 7:** Build `DistributionPreview.tsx` — recipient list with toggles, email subject/body preview (rendered markdown), "Send" and "Download" buttons. Replace direct "Distribute" button with "Preview Distribution" that opens this component. Wire to existing distribute endpoint.

**Task 8:** Add "My Actions" tab to `/staff/committees` page. New API: `GET /api/staff/committees/my-actions` returns all open/in-progress action items across all committees for current user. Reuse `CommitteeActionItemsList` component. Group by committee name, sort by due date. Show count badge on tab.

### Handoff 5: Polish + Integration
**Task 9:** Wire faculty homepage `CommitteeCard.tsx` to new features: "Next meeting" shows agenda item count, "Start Meeting" link goes to detail page with live notes. Update Sandy concierge page context for `/staff/committees/[id]` to include agenda items, meeting status, and live notes state.

**Task 10:** End-to-end UX audit: full meeting lifecycle flow (create agenda → start meeting → take notes → end → generate → edit sections → confirm actions → preview distribution → send). Keyboard accessibility, mobile layout (live notes full-width on mobile). Dead code cleanup. Verify `npx tsc --noEmit` and `npm run lint`.

---

## Acceptance Criteria

1. Next Meeting hero shows date/time/location/agenda on committee detail page
2. Agenda items are editable, reorderable, and persist to `nextAgenda` field
3. Live notes editor with timestamps and agenda anchors
4. "Start Meeting" creates draft; "End Meeting" transitions to generation
5. Per-section editing in minutes card (manual + Sandy revision)
6. Action items require explicit confirmation before becoming records
7. Distribution preview shows recipients + email content before sending
8. "My Actions" aggregates all open items across committees
9. `npx tsc --noEmit` and `npm run lint` pass after every handoff
10. Full meeting lifecycle works end-to-end without page navigation
