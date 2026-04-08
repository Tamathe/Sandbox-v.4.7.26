# Crisis Command Center v2 — Phase 4 Handoff Prompt

## Context
You are continuing the Crisis Command Center v2 build for the University of Kentucky platform. The full architecture spec is at `docs/superpowers/specs/2026-04-04-crisis-command-center-v2-design.md` — read it first.

The project is a Next.js 16.x app at `c:\AA Code\Educator marketplace\the-sandbox\`. Read `the-sandbox/CLAUDE.md` for coding conventions before writing any code.

## Current state: Phases 1–3 of the v2 spec are complete:

### Phase 1 (Schema & Emergency Access):
- Prisma schema updated: `CrisisDocumentSnapshot` model, `CrisisMessage` model, `assignedToId`/`assignedTo` on `CrisisDocument`, `expectedDocumentCount` on `CrisisIncident`, snapshots/messages relations, User relations (`CrisisSnapshotCreator`, `CrisisMessageUser`, `CrisisDocumentAssignee`). DB synced via `prisma db push`, client regenerated.
- `CrisisAlertButton` component in `app/components/crisis-comms/CrisisAlertButton.tsx` — ADMIN/STAFF only, ShieldAlert icon, polls `/active-count` every 60s, pulse + badge when active incidents exist.
- `GET /api/crisis-comms/command-center/active-count` — counts incidents in DRAFTING/ACTIVE/CONTAINED.
- `CrisisAlertButton` integrated into `Header.tsx` (desktop icons + mobile menu).

### Phase 2 (Quick Start & Room Code):
- `InitiateRequest.title` is now `string | null`.
- `initiateIncident` split into `createIncident` (fast, returns roomCode) + `assessIncident` (slow, runs AI). Legacy `initiateIncident` wraps both. New API routes: `POST /create`, `POST /assess`.
- Hook (`useCommandCenter`) uses two-step flow: `pendingRoomCode` and `loadingStep` available during loading.
- `InitiationPhase` has Quick Start emergency section (severity 3, null title, single textarea) above "Standard Initiation". Loading screen shows 4-step progress indicator + room code with copy button.
- Joiner holding state: "Waiting for situation assessment..." shown when assessment not yet available.

### Phase 3 (Emergency Text Alert & Document Priority):
- **DocumentType union** expanded: added `EMERGENCY_TEXT_ALERT` and `AFTER_ACTION_REPORT` to `types.ts`.
- **DistributionMeta** interface + `DISTRIBUTION_META` record added to `types.ts` — maps all 10 document types to channel, charLimit, copyLabel, and integration mode.
- **DOCUMENT_TITLES** in `command-center-service.ts` updated with both new types.
- **Generation prompts** added in `prompts.ts`:
  - `EMERGENCY_TEXT_ALERT`: 160-char SMS limit, Clery Act format (WHAT→WHERE→WHAT TO DO→WHERE to get updates), "UK ALERT:" prefix, no suspect descriptions, imperative voice.
  - `AFTER_ACTION_REPORT`: Placeholder framework with 6 sections, `[TO BE COMPLETED POST-INCIDENT]` markers.
- **Assessment prompt** updated: includes `EMERGENCY_TEXT_ALERT` and `AFTER_ACTION_REPORT` in document type list, specifies default severity-3 ordering: `EMERGENCY_TEXT_ALERT → WEBSITE_BANNER → PRESS_STATEMENT → INTERNAL_EMAIL → PARENT_NOTIFICATION → TALKING_POINTS → SOCIAL_TWITTER → SOCIAL_FACEBOOK → SOCIAL_INSTAGRAM`.
- **AssessmentPhase.tsx** rewritten: document type section replaced with reorderable priority list.
  - Selected types shown at top with numbered order, drag handles (`GripVertical` icon), document type icons, and remove buttons.
  - Drag-to-reorder via pointer events (`onPointerDown`/`onPointerMove`/`onPointerUp`) — no external DnD library.
  - Unselected types in an "Available" section below with `Plus` icon add buttons.
  - Confirmed order passed through to `confirmAssessment`.
- **CHAR_LIMITS** in `WorkspacePhase.tsx`: added `EMERGENCY_TEXT_ALERT: 160`.
- **DocumentIcon.tsx**: added `MessageSquareWarning` for `EMERGENCY_TEXT_ALERT`, `FileText` for `AFTER_ACTION_REPORT`.
- **SeverityLevel** type: `assessIncident` parameter typed as `SeverityLevel` (was `number`), matching route type updated.
- `confirmAssessment` in the service uses `.map()` on `assessment.suggestedDocumentTypes` which preserves the user-set order — verified, no changes needed.

## Goal — Phase 4: Per-Document Status Controls & Print/Assessment Panel
Execute ONLY these two tasks, then STOP:

### Task 7: Per-Document Status Controls
Spec reference: Section 1.6

- Each document card in the left sidebar of `WorkspacePhase.tsx` already shows a `DocumentStatusBadge` — now add colored styling:
  - `DRAFT` → gray
  - `REVIEW` → yellow/amber
  - `READY` → blue
  - `SENT` → green
- Add a status action button to the document editor header bar:
  - DRAFT → "Send to Review" button
  - REVIEW → "Mark Ready" button
  - READY → "Mark as Sent" button
  - SENT → editor becomes read-only with a locked banner
- Add a dropdown on the status badge to move status backward (e.g., READY → REVIEW)
- Add new timeline event type: `DOCUMENT_STATUS_CHANGED` to `TimelineAction` in `types.ts`
  - Metadata: `{ documentType, oldStatus, newStatus }`
- Update `command-center-service.ts`:
  - Add `updateDocumentStatus(userId, documentId, newStatus)` function that updates the document status, creates a timeline event with `DOCUMENT_STATUS_CHANGED` action, and returns the updated document
- Update `PATCH /api/crisis-comms/command-center/documents/[id]/route.ts` to accept `status` in the update payload
- Update `useCommandCenter` hook to expose a `updateDocumentStatus` action that calls the API and refreshes state
- When a document is `SENT`, the textarea should be `readOnly` and show a banner: "This document has been marked as sent and is locked."
- The `formatAction` helper in `WorkspacePhase.tsx` should include `DOCUMENT_STATUS_CHANGED`

### Task 8: Print Stylesheet + View/Edit Assessment Panel
Spec reference: Sections 1.7 and 1.8

**Print:**
- Create `app/crisis-comms-print.css` with `@media print` rules:
  - Hide sidebar, timeline, header, navigation, all buttons
  - Render document title, content, status, incident metadata (date, severity, room code)
  - Clean serif font, readable paper size
  - Talking Points special treatment: section headers bold, "DO NOT SAY" in bordered box
- Import the print CSS in `app/crisis-comms/command-center/page.tsx`
- Add a "Print" button (lucide `Printer` icon) in the document editor header bar in `WorkspacePhase.tsx` that calls `window.print()`

**View/Edit Assessment Panel:**
- Add a "View Assessment" button to the workspace top bar (near the status control)
- Clicking it opens a slide-over panel (right side, similar to the mobile timeline pattern already in `WorkspacePhase.tsx`) showing the current assessment
- The panel displays: summary, severity, affected populations, key facts, unknowns, immediate actions
- All fields are editable (reuse `EditableList` pattern from `AssessmentPhase.tsx`)
- A "Save & Regenerate" button at the bottom:
  - Saves the updated assessment to the incident
  - Offers to regenerate selected documents with the new assessment
  - Does NOT auto-regenerate — user chooses which documents to regenerate via checkboxes
- The assessment data comes from `incident.assessment` (JSON string) — parse it to `AssessmentResult`

## Key Files to Read First
- `app/lib/crisis-comms/command-center/types.ts` — current type definitions (updated in Phase 3)
- `app/lib/crisis-comms/command-center/command-center-service.ts` — service functions
- `app/components/crisis-comms/command-center/WorkspacePhase.tsx` — main workspace UI
- `app/components/crisis-comms/command-center/StatusBadge.tsx` — existing status badge components
- `app/hooks/useCommandCenter.ts` — client-side state management hook
- `app/api/crisis-comms/command-center/documents/[id]/route.ts` — document update API
- `app/crisis-comms/command-center/page.tsx` — command center page

## Verification
- `npx eslint` on all changed files — zero errors
- `NODE_OPTIONS="--max-old-space-size=8192" npx tsc --noEmit` — clean (ignore pre-existing virtual-clinic and sandcastle errors)
- `NODE_OPTIONS="--max-old-space-size=8192" npm run build` — compiles successfully (note: there's a pre-existing `_not-found` trace error in the build finalization step that is unrelated to code changes)

## Specs
- Architecture doc: `docs/superpowers/specs/2026-04-04-crisis-command-center-v2-design.md`
- Project conventions: `CLAUDE.md` (Tailwind v4, Prisma v7 PrismaPg adapter, lucide-react only, withErrorHandling wrapper on all routes, Pattern A headers)

## Next Link
When both tasks are complete and verification passes, generate the Phase 5 Handoff Prompt following this same format. Phase 5 covers:
- Task 9: AI Edit versioning with snapshots (CrisisDocumentSnapshot model, diff view)
- Task 10: Document assignment (assignedToId, avatar display, assignment dropdown)

Include full context of what was completed in Phases 1–4 so the next instance has no gaps.
