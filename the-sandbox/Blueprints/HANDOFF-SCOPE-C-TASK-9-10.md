# Handoff Prompt — Scope C: Tasks 9-10

Copy everything below the line into a new Claude Code instance.

---

## Context

You are building **Scope C: Committee Workflow Overhaul** for the platform, a Next.js 16 + TypeScript + Tailwind v4 app at `c:\AA Code\Educator marketplace\the-sandbox\`. This transforms the committee system from a records archive into a meeting lifecycle tool.

**Full blueprint:** Read `the-sandbox/Blueprints/COMMITTEE-WORKFLOW-OVERHAUL.md` before writing any code — it is the authoritative spec.

**Critical constraints (from CLAUDE.md):**
- Tailwind v4: No `@apply` in CSS. Use utility classes in JSX only. `size-4` not `w-4 h-4`.
- Icons: lucide-react ONLY.
- UI Standard: `border rounded-2xl shadow-sm` cards, `font-extrabold` h1/h2.
- Auth: Every route must call `requireStaffOrAdminUser(req)` before DB access.
- Route pattern: auth → parse → call lib → return. No business logic in route files.

**What was built in Tasks 1-8:**

### Tasks 1-2: Schema + Agenda + Hero Card
- **Schema:** `nextAgenda Json?` added to `Committee` model (migrated via `prisma db push`).
- **Service** `app/lib/staff/committee-service.ts` (~272 lines): `AgendaItem` interface, `updateAgenda()`, `getAgendaWithCarryForward()` (3-tier fallback), `computeNextMeeting()` (now exported).
- **API** `app/api/staff/committees/[id]/agenda/route.ts`: GET + PATCH for agenda CRUD.
- **`AgendaEditor.tsx`** at `app/components/staff/committees/AgendaEditor.tsx`: Reorderable agenda list with title/description/time, move up/down, remove, add. Exports `AgendaItem` type.
- **`NextMeetingHero.tsx`** at `app/components/staff/committees/NextMeetingHero.tsx`: Hero card above tabs. Props include `isInMeeting`, `meetingDuration`. When `isInMeeting=true`: pulsing red dot, "Meeting in Progress", "Return to Meeting" button (green). When not: date/time/location/countdown, agenda preview, "Start Meeting" + "Prep with Sandy" buttons.
- **Committee detail page** `app/staff/committees/[id]/page.tsx`: Renders hero + inline agenda editor above tabs, eagerly fetches action items for hero count.

### Tasks 3-4: Live Notes + Meeting Flow
- **`createMeetingDraft(committeeId)`** added to `app/lib/staff/minutes-service.ts`: Creates a `CommitteeMeeting` in draft status with next meeting number.
- **`updateMeeting()`** in minutes-service now also accepts `rawNotes` field.
- **API** `app/api/staff/committees/[id]/meetings/draft/route.ts`: POST creates draft meeting.
- **`LiveNotesEditor.tsx`** at `app/components/staff/committees/LiveNotesEditor.tsx`: Full-width markdown textarea with:
  - Toolbar: Timestamp button (inserts `[HH:MM]`), elapsed timer, save status indicator, "End Meeting" button (red)
  - Agenda sidebar (right, 200px): clickable items insert `## {title}` headers, highlights active section by cursor position
  - Auto-save every 30s via PATCH to meeting's `rawNotes`
  - `onEnd(finalNotes)` callback does final save and returns notes
- **`CommitteeDetailLayout.tsx`** updated: new `CommitteeTab` type includes `'live-meeting'`. When `isInMeeting=true`, replaces "Generate Minutes" tab with "Live Meeting" tab (Mic icon, red dot, red active state).
- **Committee detail page** wiring:
  - State: `activeMeetingId`, `meetingStartTime`, `meetingDuration`, `prefillNotes`
  - "Start Meeting" → POSTs to draft API → sets active meeting → switches to `live-meeting` tab
  - "End Meeting" → saves final notes → clears active meeting → switches to `generate` tab with `prefillNotes`
  - Duration timer updates every minute
  - If already in meeting, "Start Meeting" becomes "Return to Meeting"

### Tasks 5-6: Section-Editable Minutes + Action Item Confirmation
- **`MinutesCard.tsx`** rewritten for per-section editing:
  - Parses `formattedMinutes` into sections by splitting on `## ` markdown headers
  - Each section gets hover-reveal "Edit" button (inline textarea) and "Revise with Sandy" button (instruction input → Sonnet rewrite)
  - `SectionBlock` sub-component handles edit/revise/cancel per section
  - New props: `committeeId`, `onMinutesUpdated` — saves reconstructed markdown via PATCH
  - Structured data (attendance, agenda, action items, decisions tables) rendered as fallback when no `formattedMinutes` sections exist
- **API** `app/api/staff/committees/[id]/meetings/[meetingId]/revise-section/route.ts`: POST accepts `{ sectionContent, instruction, fullMinutes }`, calls `reviseMinutesSection()`, returns `{ revisedSection }`.
- **`reviseMinutesSection()`** added to `app/lib/staff/minutes-service.ts`: Calls Sonnet with section + instruction + full minutes context.
- **`generateMinutes()`** modified: REMOVED auto-creation of `CommitteeActionItem` records (old step 7) and auto-push to `StaffActionItem` queue (old step 9). Action items now stored in meeting JSON only.
- **`createActionItems()`** added to minutes-service: Bulk creates `CommitteeActionItem` records + pushes to action queue. Used by explicit confirmation flow.
- **`ActionItemConfirmation.tsx`** at `app/components/staff/committees/ActionItemConfirmation.tsx`: Editable table with textarea/datalist owner dropdown/date picker/priority select per row. Add/Remove rows. "Confirm & Create" POSTs to actions route. "Skip" dismisses.
- **Actions API** `app/api/staff/committees/[id]/actions/route.ts`: Added POST handler for bulk action item creation.
- **`MinutesActions.tsx`** updated: "Create Action Items" renamed to "Review Action Items".
- **Committee detail page** updated:
  - `showActionConfirmation` / `pendingActionItems` / `confirmationMeetingId` state
  - "Review Action Items" button opens `ActionItemConfirmation` below `MinutesCard`
  - `handleActionItemsConfirmed` dismisses panel + refreshes action items

### Tasks 7-8: Distribution Preview + Cross-Committee My Actions
- **`DistributionPreview.tsx`** at `app/components/staff/committees/DistributionPreview.tsx` (~160 lines): Recipient list with checkboxes (all on by default), select/deselect all toggle, email subject preview (`Minutes: {name} — Meeting #{num} — {date}`), scrollable markdown body preview, Send/Download .md/Cancel buttons. Send calls existing `POST /api/staff/committees/[id]/meetings/[meetingId]/distribute` with selected recipients. Success feedback with green checkmark, 1.2s auto-dismiss.
- **Committee detail page** updated:
  - `showDistributionPreview` state added
  - `handleDistribute` now opens `DistributionPreview` below `MinutesCard` instead of directly calling the distribute API
  - `handleDistributionSent` dismisses the preview on success
  - `distributing` state kept (as `const [distributing]`) but no longer toggled — distribution is handled inside `DistributionPreview`
- **`GET /api/staff/committees/my-actions/route.ts`** (~55 lines): Returns all open/in-progress `CommitteeActionItem` records across ALL committees for current user. Matches on `ownerUserId` OR fuzzy `ownerName` (case-insensitive contains). Includes committee name via join. Sorted by dueDate (nulls last), then priority. Grouped by committee: `{ committees: [{ id, name, items }], totalCount }`.
- **`/staff/committees/page.tsx`** rewritten (~200 lines):
  - Tab bar at top: "Committees" (default) | "My Actions" (with count badge)
  - "Committees" tab shows existing committee grid (unchanged)
  - "My Actions" tab shows action items grouped by committee name in `border rounded-2xl shadow-sm` cards
  - Each group has a committee name header (Link icon + clickable, navigates to detail page)
  - Reuses `CommitteeActionItemsList` component for rendering each group
  - Count badge fetched on mount via same `/api/staff/committees/my-actions` endpoint
  - Refresh button context-aware (refreshes current tab)
  - Role guard moved after all hooks to satisfy React rules-of-hooks

**Current architecture:**

- **Components (16 in `app/components/staff/committees/`):** `AgendaEditor`, `CommitteeCard`, `CommitteeDetailLayout`, `CommitteeActionItemsList`, `DecisionLog`, `MeetingsList`, `MinutesCard` (with SectionBlock sub-component), `MinutesActions`, `MinutesGeneratorPanel`, `MinutesPreview`, `AttendanceEditor`, `MotionBlock`, `NextMeetingHero`, `LiveNotesEditor`, `ActionItemConfirmation`, `DistributionPreview`
- **Pages:** `/staff/committees/page.tsx` (list + My Actions tabs), `/staff/committees/[id]/page.tsx` (detail with hero, tabs, live meeting, distribution preview, action confirmation)
- **Services:** `committee-service.ts` (~272 lines), `minutes-service.ts` (~500+ lines), `minutes-distribution.ts`
- **API routes (12):** committees CRUD, agenda, meetings, draft, revise-section, actions, distribute, my-actions
- **Schema:** `Committee` (nextAgenda Json?), `CommitteeMeeting` (rawNotes, formattedMinutes, JSON fields), `CommitteeActionItem` (ownerName, ownerUserId?, status, dueDate, priority, notes)

## Goal

Execute ONLY these 2 tasks, then STOP:

### Task 9: Faculty Homepage + Sandy Integration

1. **Update `CommitteeCard.tsx`** on the faculty/staff homepage:
   - Read `app/components/staff/committees/CommitteeCard.tsx` first
   - Add agenda item count to the card: fetch from existing data or add to the `CommitteeOverview` type
   - If the committee has a `nextAgenda` with items, show "Next meeting: {count} agenda items" below the existing meeting info
   - Add a "Start Meeting" quick-action link that navigates to the detail page and triggers meeting start: `router.push(/staff/committees/${id}?tab=live-meeting)`

2. **Update the committees list API** to include agenda item count:
   - Read `app/api/staff/committees/route.ts` and `app/lib/staff/committee-service.ts`
   - Ensure the `getCommittees()` function returns `nextAgenda` (or just the count) in the response so `CommitteeCard` can display it

3. **Update Sandy concierge page context** for `/staff/committees/[id]`:
   - Read `app/lib/concierge-service.ts` — find the `PAGE_DESCRIPTIONS` map or `describeCurrentPage()` function
   - Update or add the `/staff/committees/[id]` entry to include: agenda items (count + titles), meeting status (is meeting in progress?), recent action items count
   - This gives Sandy awareness of the committee's current state when the user is on the detail page

4. **Add Sandy starter chips** for the committees pages:
   - Read `app/lib/concierge-utils.ts` — find `getPageStarters()` function
   - Add/update starters for `/staff/committees` and `/staff/committees/[id]`:
     - List page: "What are my open action items?", "Which committee meets next?", "Summarize recent decisions", "Help me prep for my next meeting"
     - Detail page: "Review the agenda", "What happened last meeting?", "Draft an email about this committee", "Help me write minutes"

### Task 10: End-to-End UX Audit

1. **Full meeting lifecycle audit** — mentally walk through the entire flow and fix any issues:
   - Create/edit agenda on detail page
   - Start meeting → live notes with timestamps and agenda anchors
   - End meeting → auto-transition to generate tab with prefilled notes
   - Generate minutes → section editing (manual + Sandy revise)
   - Review action items → confirm & create
   - Distribution preview → select recipients → send
   - My Actions tab shows the new items
   - Fix any broken wiring, missing state transitions, or dead-end flows

2. **Keyboard accessibility:**
   - Agenda editor: items should be keyboard-navigable (Tab through items, Enter to edit)
   - Live notes: Escape to cancel, Tab doesn't trap focus
   - Distribution preview: checkboxes focusable, Enter on Send
   - Action item confirmation: Tab through editable fields

3. **Mobile layout fixes:**
   - Live notes editor: agenda sidebar should collapse to full-width on mobile (hidden sidebar, show as dropdown or top bar)
   - Distribution preview: recipient list scrollable, buttons stacked on small screens
   - My Actions tab: cards full-width on mobile
   - Committee detail tabs: horizontal scroll if too many tabs

4. **Dead code cleanup:**
   - Remove any unused imports, variables, or functions introduced during Tasks 1-8
   - Check for any `console.log` statements left from debugging
   - Remove the old direct-distribute logic that was replaced by `DistributionPreview` (ensure `distributing` state is clean)

5. **Verification:**
   - Run `npx tsc --noEmit` — must pass with zero errors
   - Run `npm run lint` — no new errors (pre-existing warnings OK)
   - Verify all 16 committee components still import cleanly
   - Check that the `CommitteeDetailLayout` tab types are correct

## Specs

**Files to modify (Task 9):**
- `app/components/staff/committees/CommitteeCard.tsx` — add agenda count + Start Meeting link
- `app/api/staff/committees/route.ts` or `app/lib/staff/committee-service.ts` — include nextAgenda in list response
- `app/lib/concierge-service.ts` — update PAGE_DESCRIPTIONS for committee pages
- `app/lib/concierge-utils.ts` — add/update getPageStarters for committee pages

**Files to audit/fix (Task 10):**
- All 16 files in `app/components/staff/committees/`
- `app/staff/committees/[id]/page.tsx` — detail page wiring
- `app/staff/committees/page.tsx` — list page with My Actions tab
- `app/components/staff/committees/LiveNotesEditor.tsx` — mobile layout
- `app/components/staff/committees/DistributionPreview.tsx` — mobile layout

## Verification

After completing both tasks:
1. Run `npx tsc --noEmit` — must pass with zero errors
2. Run `npm run lint` on all modified files — no new errors (warnings OK)
3. `CommitteeCard` on list page shows agenda item count when available
4. `CommitteeCard` has a "Start Meeting" action
5. Sandy knows about the committee's agenda and meeting status on the detail page
6. Sandy has relevant starter chips on both committee pages
7. Full meeting lifecycle works end-to-end (agenda → live notes → generate → edit → confirm actions → distribute)
8. No keyboard traps in any committee component
9. Mobile layout works for live notes, distribution preview, and My Actions
10. No dead code, unused imports, or debugging artifacts

## Completion

When both tasks are complete and verified, this is the FINAL handoff for Scope C: Committee Workflow Overhaul. All 10 tasks are done. Summarize what was built across the full scope.
