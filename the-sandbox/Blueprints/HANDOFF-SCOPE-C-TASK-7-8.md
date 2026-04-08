# Handoff Prompt — Scope C: Tasks 7-8

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

**What was built in Tasks 1-6:**

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

**Current architecture:**

- **`MinutesCard.tsx`** (~350 lines): Section-editable minutes display with SectionBlock sub-component (edit/revise per section), structured data fallback, action items table, decisions table, MinutesActions buttons. Props: `minutes`, `committeeId`, `onDistribute`, `onFinalize`, `onCreateActionItems`, `onDownload`, `onMinutesUpdated`, `distributing`, `finalizing`.
- **`MinutesActions.tsx`** (91 lines): Distribute / Finalize / Review Action Items / Download buttons. `onCreateActionItems` callback opens ActionItemConfirmation.
- **`ActionItemConfirmation.tsx`** (~170 lines): Editable table, POSTs to `POST /api/staff/committees/[id]/actions` with `{ meetingId, items }`.
- **`generateMinutes()`** in minutes-service: Creates meeting record with extracted data in JSON fields. Does NOT auto-create CommitteeActionItem records.
- **`createActionItems()`** in minutes-service: Bulk creates CommitteeActionItem records + pushes to StaffActionItem queue.
- **Committee.members JSON**: `[{ userId?, name, email, role }]` — available for recipient lists.
- **Distribute endpoint**: `POST /api/staff/committees/[id]/meetings/[meetingId]/distribute/route.ts` — existing route that sends minutes to committee members.

## Goal

Execute ONLY these 2 tasks, then STOP:

### Task 7: Distribution Preview

1. **Build `DistributionPreview.tsx`** at `app/components/staff/committees/DistributionPreview.tsx`:
   ```typescript
   interface DistributionPreviewProps {
     minutes: MinutesData
     committeeMembers: { name: string; role: string; email?: string; userId?: string }[]
     committeeId: string
     onSent: () => void
     onCancel: () => void
   }
   ```
   - Shows recipient list with toggles (checkbox per member, all on by default)
   - Email subject preview: `"Minutes: {committeeName} — Meeting #{meetingNumber} — {date}"`
   - Email body preview: rendered markdown of `formattedMinutes` in a scrollable container
   - "Send" button — calls existing `POST /api/staff/committees/[id]/meetings/[meetingId]/distribute` endpoint (pass selected recipients)
   - "Download" button — downloads `formattedMinutes` as `.md` file (reuse existing download logic)
   - "Cancel" button — dismisses preview
   - Style: `border rounded-2xl shadow-sm` card, alternating recipient rows

2. **Modify `MinutesActions.tsx`:**
   - Replace direct "Distribute" click with opening `DistributionPreview`
   - The `onDistribute` callback should now toggle a `showDistributionPreview` state rather than immediately calling the API

3. **Wire into committee detail page:**
   - Add `showDistributionPreview` state
   - When "Distribute" is clicked on MinutesActions, show `DistributionPreview` below the MinutesCard (similar to how ActionItemConfirmation is shown)
   - Pass `committee.members` for recipient list
   - On send complete, dismiss preview + show success feedback

### Task 8: Cross-Committee "My Actions" Tab

1. **Create API route `app/api/staff/committees/my-actions/route.ts`:**
   - `GET` — returns all open/in-progress `CommitteeActionItem` records across ALL committees for the current user
   - Auth: `requireStaffOrAdminUser`
   - Query: match on `ownerUserId` (if set) OR fuzzy match on `ownerName` against the user's name
   - Include committee name in the response (join or include)
   - Sort by due date (nulls last), then priority
   - Group by committee in the response: `{ committees: [{ id, name, items: CommitteeActionItem[] }] }`

2. **Add "My Actions" tab to `/staff/committees/page.tsx`:**
   - Read the existing committees list page first
   - Add a tab bar at the top: "Committees" (default) | "My Actions" (with count badge)
   - "Committees" tab shows the existing committee list
   - "My Actions" tab shows action items grouped by committee name
   - Reuse `CommitteeActionItemsList` component for rendering each group
   - Each group has a committee name header that links to the committee detail page
   - Fetch count on mount for the badge (can use same endpoint, just count items)

## Specs

**Files to create:**
- `app/components/staff/committees/DistributionPreview.tsx` — recipient toggles + email preview
- `app/api/staff/committees/my-actions/route.ts` — cross-committee action items

**Files to modify:**
- `app/components/staff/committees/MinutesActions.tsx` — change Distribute to open preview
- `app/staff/committees/[id]/page.tsx` — wire DistributionPreview into flow
- `app/staff/committees/page.tsx` — add "My Actions" tab with grouped action items

## Verification

After completing both tasks:
1. Run `npx tsc --noEmit` — must pass with zero errors in modified files
2. Run `npx eslint` on all modified/created files — must pass (warnings OK)
3. "Distribute" button on MinutesActions opens DistributionPreview (not direct send)
4. Recipient toggles work — unchecked members are excluded
5. Email preview shows formatted minutes content
6. "Send" calls distribute endpoint and shows success
7. "Download" downloads `.md` file
8. `/staff/committees` page shows "Committees" and "My Actions" tabs
9. "My Actions" shows action items grouped by committee name
10. Count badge shows total open items
11. Clicking committee name in group header navigates to committee detail

## Next Link

When both tasks are complete and verified, generate the next handoff prompt for **Tasks 9-10** using the blueprint at `the-sandbox/Blueprints/COMMITTEE-WORKFLOW-OVERHAUL.md`. Tasks 9-10 are:
- **Task 9:** Wire faculty homepage `CommitteeCard.tsx` to new features: "Next meeting" shows agenda item count, "Start Meeting" link goes to detail page with live notes. Update Sandy concierge page context for `/staff/committees/[id]` to include agenda items, meeting status, and live notes state.
- **Task 10:** End-to-end UX audit: full meeting lifecycle flow (create agenda → start meeting → take notes → end → generate → edit sections → confirm actions → preview distribution → send). Keyboard accessibility, mobile layout (live notes full-width on mobile). Dead code cleanup. Verify `npx tsc --noEmit` and `npm run lint`.

Include updated context reflecting what was built in Tasks 1-8. Follow the same handoff format.
