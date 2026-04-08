# Crisis Command Center v2 — Production Architecture Design

**Date:** 2026-04-04
**Status:** Approved
**Scope:** Tier 1 (Core Crisis Loop) + Tier 2 (Trust & Speed) + Tier 3 (Collaboration & Closure)

---

## Overview

Production-grade upgrade of the Crisis Command Center. Transforms it from a drafting tool into a complete crisis management surface: one-click emergency access, Clery-compliant emergency text alerts, progressive document generation, AI edit versioning, real-time team collaboration, and post-incident reporting.

**Design Principles:**
- A crisis comms director should go from "shots fired" to "first draft ready" in under 90 seconds
- Generate-only for all distribution channels (no send integrations in v1), architected for future API pluggability
- Collaboration via 30-second polling (no WebSockets), with a transport abstraction layer for future upgrade
- Every destructive AI edit is reversible via version snapshots

---

## Scoping Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Emergency Text Alert delivery | Generate-only (copy to mass notification system) | University owns SMS infrastructure; we provide speed-of-drafting value |
| Real-time collaboration | 30-second polling, `SyncProvider` abstraction | Solo dev on Vercel; polling covers 95% of war-room coordination needs |
| Print/export | `@media print` for individual docs; `@react-pdf/renderer` for incident package | Spokesperson needs one clean page in 10 seconds; President's office needs the full package |
| Emergency header button | ADMIN + STAFF only, always visible, pulses when active incident exists | Fast lane without false-activation risk; arriving at the page doesn't initiate anything |
| Title field | Optional; AI auto-generates from assessment if omitted | Under stress, writing a title is friction |

---

## Tier 1: Core Crisis Loop

### 1.1 Emergency Header Button

**Component:** `CrisisAlertButton` in `app/components/Header.tsx`

- Rendered for `ADMIN` and `STAFF` roles only (check `session.user.role`)
- Default state: `Shield` icon from lucide-react, red-tinted, links to `/crisis-comms/command-center`
- Active incident state: pulses with red glow + badge showing count of active incidents
- Active incident detection: `GET /api/crisis-comms/command-center/active-count`
  - Returns `{ count: number }` — count of incidents with status in `['DRAFTING', 'ACTIVE', 'CONTAINED']` created by any user
  - Client polls this every 60 seconds via `useEffect` interval (only for ADMIN/STAFF)
  - Cache-Control: `private, max-age=30`

**Files to touch:**
- `app/components/Header.tsx` — add `CrisisAlertButton` to nav
- `app/components/crisis-comms/CrisisAlertButton.tsx` — new component
- `app/api/crisis-comms/command-center/active-count/route.ts` — new API route

### 1.2 Quick Start Mode

**Changes to `InitiationPhase` component:**

- New top section with a prominent red button: **"EMERGENCY — Active Threat"**
- Clicking it:
  1. Pre-fills severity to 3
  2. Opens a single textarea: "What's happening right now?"
  3. Title field is hidden (auto-generated from AI assessment)
  4. Submits to the same `initiate` endpoint with `title: null`
- The existing "New Incident" form (title + paste area) remains below as "Standard Initiation"

**Service changes:**
- `initiateIncident(userId, input)` accepts `title` as `string | null`
- If `title` is null, after assessment completes, the service generates a title from `assessment.summary` (first sentence, truncated to 60 chars)
- The title is backfilled on the `CrisisIncident` record

**Files to touch:**
- `app/components/crisis-comms/command-center/InitiationPhase.tsx` — add quick start UI
- `app/lib/crisis-comms/command-center/command-center-service.ts` — optional title logic
- `app/lib/crisis-comms/command-center/types.ts` — update `InitiateRequest` type

### 1.3 Room Code at Initiation

**Current behavior:** Room code generated during `initiateIncident`, but only visible after assessment phase.

**New behavior:**
- Room code is generated and returned immediately in the `initiateIncident` response
- The loading/assessment screen displays the room code prominently with a copy button: "Share this code with your team while the AI assesses"
- Team members who join via room code before assessment completes see a holding state: "Waiting for situation assessment..."

**Implementation:**
- The `initiateIncident` service already generates `roomCode` before the AI call — no backend change needed
- The hook needs to store `roomCode` in state immediately from the initiation response, before the assessment completes
- The loading screen component receives `roomCode` as a prop

**Files to touch:**
- `app/hooks/useCommandCenter.ts` — store roomCode during loading state
- `app/components/crisis-comms/command-center/InitiationPhase.tsx` — show room code in loading screen
- `app/components/crisis-comms/command-center/WorkspacePhase.tsx` — handle "waiting for assessment" state for joiners

### 1.4 Emergency Text Alert Document Type

**New enum value:** `EMERGENCY_TEXT_ALERT`

**Schema change:**
- `CrisisDocument.type` is a `String` field (not a Prisma enum). The `DocumentType` TypeScript union in `types.ts` is the source of truth for valid values.
- Add `'EMERGENCY_TEXT_ALERT'` and `'AFTER_ACTION_REPORT'` to the TypeScript `DocumentType` union.
- No Prisma migration needed for the type values themselves — they're just strings. The migration is only for the new models (`CrisisDocumentSnapshot`, `CrisisMessage`) and new fields (`assignedToId`, `expectedDocumentCount`).

**Prompt constraints** (added to `prompts.ts`):
- 160 characters max (SMS segment limit)
- Clery Act format: WHAT → WHERE → WHAT TO DO → WHERE to get updates
- No suspect descriptions unless confirmed by law enforcement
- No speculation, no hedging
- Action-oriented imperative voice

**Example output:**
```
UK ALERT: Active threat reported near Student Center. Shelter in place. Lock doors. Silence phones. Do NOT evacuate unless directed by UKPD. Updates: uky.edu/alert
```

**Distribution metadata type:**
```typescript
interface DistributionMeta {
  channel: 'sms' | 'email' | 'web' | 'social' | 'print' | 'internal'
  charLimit?: number
  copyLabel: string
  integration: 'manual' | 'api'
}

const DISTRIBUTION_META: Record<DocumentType, DistributionMeta> = {
  EMERGENCY_TEXT_ALERT: { channel: 'sms', charLimit: 160, copyLabel: 'Copy for Mass Notification System', integration: 'manual' },
  PRESS_STATEMENT:      { channel: 'print', copyLabel: 'Copy Press Statement', integration: 'manual' },
  INTERNAL_EMAIL:       { channel: 'email', copyLabel: 'Copy for Email', integration: 'manual' },
  SOCIAL_TWITTER:       { channel: 'social', charLimit: 280, copyLabel: 'Copy for X/Twitter', integration: 'manual' },
  SOCIAL_INSTAGRAM:     { channel: 'social', charLimit: 2200, copyLabel: 'Copy for Instagram', integration: 'manual' },
  SOCIAL_FACEBOOK:      { channel: 'social', copyLabel: 'Copy for Facebook', integration: 'manual' },
  PARENT_NOTIFICATION:  { channel: 'email', copyLabel: 'Copy for Parent Email', integration: 'manual' },
  WEBSITE_BANNER:       { channel: 'web', copyLabel: 'Copy for Website', integration: 'manual' },
  TALKING_POINTS:       { channel: 'internal', copyLabel: 'Copy Talking Points', integration: 'manual' },
  AFTER_ACTION_REPORT:  { channel: 'internal', copyLabel: 'Copy Report', integration: 'manual' },
}
```

**Files to touch:**
- `prisma/schema.prisma` — no change needed for document type values (they're strings); migration is for new models only (Phase 1)
- `app/lib/crisis-comms/command-center/types.ts` — update `DocumentType` enum + add `DistributionMeta`
- `app/lib/crisis-comms/command-center/prompts.ts` — add generation prompt for emergency text alert
- `app/lib/crisis-comms/command-center/command-center-service.ts` — include in generation flow
- `app/components/crisis-comms/command-center/AssessmentPhase.tsx` — show in document type grid

### 1.5 Document Priority Ordering

**Assessment phase changes:**
- `AssessmentResult.suggestedDocumentTypes` is treated as an ordered list (already is in the prompt; now UI respects order)
- Default severity 3 order: `EMERGENCY_TEXT_ALERT` → `WEBSITE_BANNER` → `PRESS_STATEMENT` → `INTERNAL_EMAIL` → `PARENT_NOTIFICATION` → `TALKING_POINTS` → `SOCIAL_TWITTER` → `SOCIAL_FACEBOOK` → `SOCIAL_INSTAGRAM`
- Document type checkboxes in the assessment phase get drag handles for user reordering
- The confirmed order is passed to `confirmAssessment` and documents generate in that sequence

**Files to touch:**
- `app/components/crisis-comms/command-center/AssessmentPhase.tsx` — drag-to-reorder UI
- `app/lib/crisis-comms/command-center/types.ts` — ensure `ConfirmAssessmentRequest` includes ordered array
- `app/lib/crisis-comms/command-center/prompts.ts` — update default ordering in assessment prompt

### 1.6 Per-Document Status Controls

**UI changes to workspace:**
- Each document card in the left sidebar shows a colored status badge:
  - `DRAFT` → gray
  - `REVIEW` → yellow
  - `READY` → blue
  - `SENT` → green
- The document editor header bar gets a status action button:
  - DRAFT → "Send to Review"
  - REVIEW → "Mark Ready"
  - READY → "Mark as Sent"
  - SENT → editor locked, read-only banner
- Status can be moved backward (e.g., READY → REVIEW) via a dropdown menu on the status badge

**New timeline event type:** `DOCUMENT_STATUS_CHANGED`
- Metadata: `{ documentType, oldStatus, newStatus }`

**API:** Uses existing `PATCH /documents/{id}` endpoint — add `status` to the update payload

**Files to touch:**
- `app/components/crisis-comms/command-center/WorkspacePhase.tsx` — status badges, action buttons, read-only lock
- `app/lib/crisis-comms/command-center/command-center-service.ts` — handle status updates + timeline event
- `app/api/crisis-comms/command-center/documents/[id]/route.ts` — accept `status` in PATCH body

### 1.7 Print Stylesheet

**Implementation:**
- New CSS file: `app/crisis-comms-print.css` imported in the command center page
- `@media print` rules:
  - Hide sidebar, timeline, header, navigation, all buttons
  - Render document title, content, status, incident metadata (date, severity, room code)
  - Clean serif font, readable paper size
  - Talking Points special treatment: section headers bold, "DO NOT SAY" in bordered box
- "Print" button in document header bar triggers `window.print()`

**Files to touch:**
- `app/crisis-comms-print.css` — new file
- `app/crisis-comms/command-center/page.tsx` — import print CSS
- `app/components/crisis-comms/command-center/WorkspacePhase.tsx` — add Print button

### 1.8 View/Edit Assessment Panel

**Implementation:**
- Button in workspace top bar: "Assessment" (next to status dropdown)
- Opens a slide-over panel from the right
- Shows full assessment: severity, summary, key facts, unknowns, immediate actions, affected populations
- All fields editable (same editing UX as the assessment phase)
- Save button persists changes to the incident's `assessment` JSON field

**New timeline event type:** `ASSESSMENT_UPDATED`
- Metadata: `{ changedFields: string[] }`

**Does NOT re-generate documents.** User manually applies changes to documents via AI Edit.

**Files to touch:**
- `app/components/crisis-comms/command-center/AssessmentPanel.tsx` — new slide-over component
- `app/components/crisis-comms/command-center/WorkspacePhase.tsx` — add Assessment button + panel mount
- `app/lib/crisis-comms/command-center/command-center-service.ts` — add `updateAssessment` function
- `app/api/crisis-comms/command-center/[id]/assessment/route.ts` — new PATCH endpoint

---

## Tier 2: Trust & Speed

### 2.1 Progressive Document Streaming

**Current behavior:** `confirmAssessment` generates all documents in parallel, returns only when all complete.

**New behavior:**
- `confirmAssessment` updates incident status to `DRAFTING` and returns immediately
- Document generation happens server-side sequentially in priority order
- The hook transitions to workspace phase immediately and starts polling `GET /command-center/{id}` every 3 seconds
- As each document appears in the response, it renders in the sidebar with a fade-in animation
- First completed document auto-selects into the editor
- Documents still generating show as skeleton cards with shimmer + type label
- Failed documents show error state with "Retry" button
- Polling stops when `documents.length === expectedCount`

**Implementation approach:**
- `confirmAssessment` updates the incident status and sets `expectedDocumentCount`, then uses Next.js `waitUntil()` (available in `next/server`) to run document generation after the response is sent. This keeps the work alive on Vercel serverless without blocking the response.
- Fallback: if `waitUntil` is unavailable, generate the first document synchronously (so the user sees something immediately) and kick off the rest via a self-invoking fetch to a `/generate-next` internal endpoint.
- The client polls `GET /command-center/{id}` every 3 seconds to discover new documents — no streaming/SSE needed.
- A new field on the incident: `expectedDocumentCount` (set at confirmation time) so the client knows when generation is complete.

**Files to touch:**
- `app/lib/crisis-comms/command-center/command-center-service.ts` — split confirmAssessment into immediate return + background generation
- `app/hooks/useCommandCenter.ts` — add generation polling logic
- `app/components/crisis-comms/command-center/WorkspacePhase.tsx` — skeleton cards, fade-in, auto-select

### 2.2 Generation Progress Indicator

**Workspace top bar** during generation:
- "Generating documents... 2 of 7 complete"
- Updates on each poll cycle

**Initiation loading screen** step indicator:
- Step 1: "Creating incident..." (room code appears here)
- Step 2: "Analyzing situation..."
- Step 3: "Identifying audiences & channels..."
- Step 4: "Assessment ready" (auto-transition)
- Steps advance on timed intervals (cosmetic, not tied to backend stages)

**Files to touch:**
- `app/components/crisis-comms/command-center/WorkspacePhase.tsx` — progress label
- `app/components/crisis-comms/command-center/InitiationPhase.tsx` — step indicator in loading state

### 2.3 Version Snapshots

**New Prisma model:**
```prisma
model CrisisDocumentSnapshot {
  id          String   @id @default(cuid())
  documentId  String
  document    CrisisDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)
  content     String   @db.Text
  source      String   // 'manual_edit' | 'ai_revision' | 'initial_generation'
  instruction String?  // AI edit instruction, if applicable
  createdById String
  createdBy   User     @relation(fields: [createdById], references: [id])
  createdAt   DateTime @default(now())

  @@index([documentId, createdAt])
}
```

**Snapshot creation points:**
- `generateDocument`: creates snapshot with source `initial_generation` after first save
- `updateDocument`: creates snapshot of current content (source `manual_edit`) before applying new content
- `aiEditDocument`: creates snapshot of current content (source `ai_revision`, includes `instruction`) before applying revision

**Files to touch:**
- `prisma/schema.prisma` — add `CrisisDocumentSnapshot` model + relation on `CrisisDocument`
- `app/lib/crisis-comms/command-center/command-center-service.ts` — create snapshots in update/aiEdit functions

### 2.4 Undo After AI Edit

**Behavior:**
- After AI revision completes, an "Undo" button appears in the editor toolbar
- 30-second auto-dismiss timer (visual countdown ring)
- Clicking "Undo" restores the most recent snapshot content and saves it
- After 30 seconds, button fades out — snapshot still accessible via Version History

**Implementation:**
- Hook stores `lastSnapshot: { content: string, id: string } | null` in state after AI edit
- Undo is a client-side content restore + `PATCH /documents/{id}` with the snapshot content
- Timer managed by `useEffect` with `setTimeout`

**Files to touch:**
- `app/hooks/useCommandCenter.ts` — add `lastSnapshot` state, undo logic
- `app/components/crisis-comms/command-center/WorkspacePhase.tsx` — undo button with timer

### 2.5 Version History Panel

**UI:**
- "History" button in document header bar
- Opens slide-over showing all snapshots for current document, newest first
- Each entry: timestamp, source label (e.g., "AI revision: Make it shorter"), truncated preview (80 chars)
- Clicking a snapshot shows inline diff: removed text in red strikethrough, added text in green highlight
- "Restore this version" button replaces current content + creates `DOCUMENT_RESTORED` timeline event

**Diff algorithm:**
- Client-side word-level diff (split by whitespace, compare sequences, highlight additions/removals)
- No external library — simple LCS-based implementation, ~50 lines
- Same diff logic reused for AI Edit Diff View (Section 2.6)

**API:** `GET /api/crisis-comms/command-center/documents/{id}/snapshots`
- Returns `CrisisDocumentSnapshot[]` ordered by `createdAt DESC`

**Files to touch:**
- `app/components/crisis-comms/command-center/VersionHistoryPanel.tsx` — new component
- `app/lib/crisis-comms/command-center/diff.ts` — new file, word-level diff utility
- `app/api/crisis-comms/command-center/documents/[id]/snapshots/route.ts` — new GET endpoint
- `app/components/crisis-comms/command-center/WorkspacePhase.tsx` — History button + panel mount

### 2.6 AI Edit Diff View

**Behavior:**
- When AI revision completes, editor shows a diff overlay for 5 seconds: removed text in red strikethrough, added text in green highlight
- After 5 seconds (or click anywhere in editor), diff collapses to final content
- User can hit "Undo" during or after diff display

**Implementation:**
- Reuses `diff.ts` utility from Section 2.5
- Hook stores `diffData: { oldContent: string, newContent: string } | null` after AI edit
- Editor component conditionally renders diff overlay when `diffData` is set
- Auto-dismiss via `setTimeout(5000)` or `onClick`

**Files to touch:**
- `app/hooks/useCommandCenter.ts` — add `diffData` state
- `app/components/crisis-comms/command-center/WorkspacePhase.tsx` — diff overlay rendering

---

## Tier 3: Collaboration & Closure

### 3.1 Polling-Based Sync

**Activation:** When `participants.length > 1`

**Behavior:**
- 30-second polling interval on `GET /command-center/{id}`
- Reconciliation rules:
  - Document with newer `updatedAt` + user NOT editing it → silently update local state
  - Document with newer `updatedAt` + user IS editing it → toast: "Updated by [name]. Reload?"
  - New timeline events → append to local timeline
  - Status changes → update badge, lock if closed

**Transport abstraction:**
```typescript
interface SyncProvider {
  subscribe(incidentId: string, onUpdate: (patch: IncidentPatch) => void): void
  unsubscribe(incidentId: string): void
  getLatest(incidentId: string): Promise<SerializedIncident>
}

// v1 implementation
class PollingSyncProvider implements SyncProvider {
  private intervals: Map<string, NodeJS.Timeout> = new Map()
  
  subscribe(incidentId: string, onUpdate: (patch: IncidentPatch) => void): void {
    const interval = setInterval(async () => {
      const latest = await this.getLatest(incidentId)
      onUpdate(computePatch(latest))
    }, 30_000)
    this.intervals.set(incidentId, interval)
  }
  
  unsubscribe(incidentId: string): void {
    const interval = this.intervals.get(incidentId)
    if (interval) clearInterval(interval)
    this.intervals.delete(incidentId)
  }
  
  async getLatest(incidentId: string): Promise<SerializedIncident> {
    const res = await fetch(`/api/crisis-comms/command-center/${incidentId}`)
    return res.json()
  }
}
```

**Files to touch:**
- `app/lib/crisis-comms/command-center/sync.ts` — new file, `SyncProvider` interface + `PollingSyncProvider`
- `app/hooks/useCommandCenter.ts` — integrate sync provider, reconciliation logic

### 3.2 Presence Indicators

**Client-side:**
- When user selects a document, fires `POST /command-center/{id}/presence` with `{ documentId }` (debounced 2s)
- Presence data returned in the poll response (bundled, not separate call)

**Server-side:**
- In-memory `Map<incidentId, Map<userId, { documentId, name, updatedAt }>>` — NOT persisted to DB
- Entries expire after 60 seconds (if no presence ping received)
- `GET /command-center/{id}` response includes a `presence` field with current viewer data

**UI:**
- Document cards in sidebar show colored avatar dots for viewers
- Top bar participant list shows each person's name + current document

**Files to touch:**
- `app/api/crisis-comms/command-center/[id]/presence/route.ts` — new POST endpoint
- `app/lib/crisis-comms/command-center/presence.ts` — new file, in-memory presence store
- `app/api/crisis-comms/command-center/[id]/route.ts` — include presence data in GET response
- `app/components/crisis-comms/command-center/WorkspacePhase.tsx` — avatar dots, participant display

### 3.3 Document Assignment

**Schema change:**
- `CrisisDocument` gets optional `assignedToId String?` + `assignedTo User? @relation(...)`

**UI:**
- Menu button on document card → "Assign to..." dropdown listing current participants
- Assigned documents show assignee avatar on the card
- Responders see "Your assignments" section at top of sidebar

**New timeline event:** `DOCUMENT_ASSIGNED`
- Metadata: `{ documentType, assignedTo: { id, name } }`

**Files to touch:**
- `prisma/schema.prisma` — add `assignedToId` + relation to `CrisisDocument`
- `app/components/crisis-comms/command-center/WorkspacePhase.tsx` — assignment UI
- `app/lib/crisis-comms/command-center/command-center-service.ts` — `assignDocument` function
- `app/api/crisis-comms/command-center/documents/[id]/assign/route.ts` — new PATCH endpoint

### 3.4 In-Workspace Chat

**New Prisma model:**
```prisma
model CrisisMessage {
  id         String   @id @default(cuid())
  incidentId String
  incident   CrisisIncident @relation(fields: [incidentId], references: [id], onDelete: Cascade)
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  content    String
  createdAt  DateTime @default(now())

  @@index([incidentId, createdAt])
}
```

**UI:**
- Collapsible chat panel in right sidebar, tabbed alongside Timeline ("Timeline | Chat")
- Messages fetched on the 30-second poll cycle (bundled with incident data)
- Simple text input at bottom, enter to send
- `POST /command-center/{id}/messages` to send

**Files to touch:**
- `prisma/schema.prisma` — add `CrisisMessage` model + relation on `CrisisIncident`
- `app/components/crisis-comms/command-center/ChatPanel.tsx` — new component
- `app/components/crisis-comms/command-center/WorkspacePhase.tsx` — tab layout for Timeline/Chat
- `app/api/crisis-comms/command-center/[id]/messages/route.ts` — new POST + GET endpoints

### 3.5 After-Action Report

**Trigger:** When incident status changes to `CLOSED`

**Flow:**
1. Confirmation dialog: "Close this incident? This will generate an After-Action Report and archive all documents."
2. On confirm, status updates to `CLOSED` + AI generates the report via Claude Haiku
3. Report stored as `AFTER_ACTION_REPORT` document type on the incident
4. Workspace transitions to read-only archived view, report auto-selected

**Report contents (AI-generated from full incident context):**
- Incident title, severity, duration (opened → closed)
- Time to first document generated
- Total documents produced + final statuses
- Participant list with roles
- Chronological timeline narrative
- Final key facts and unknowns
- AI-generated "Lessons Learned" section

**New prompt:** `buildAfterActionPrompt(incident, documents, timeline, participants)`

**Re-open safeguard:**
- "Re-open Incident" button sets status to `CONTAINED` + creates `INCIDENT_REOPENED` timeline event
- Existing after-action report flagged as stale with banner

**Files to touch:**
- `app/lib/crisis-comms/command-center/prompts.ts` — after-action report prompt
- `app/lib/crisis-comms/command-center/command-center-service.ts` — generate report on close, re-open logic
- `app/components/crisis-comms/command-center/WorkspacePhase.tsx` — close dialog, archived view, re-open button

### 3.6 Incident Package PDF Export

**Implementation:**
- "Download Incident Package" button in archived workspace top bar
- `POST /api/crisis-comms/command-center/{id}/export` — server-side PDF generation
- Uses `@react-pdf/renderer` (React-native PDF, no headless browser)

**PDF structure:**
1. Cover page: title, severity, date range, room code, participant list
2. After-Action Report (full text)
3. Each document: type header, final content, status, last edited by/at (one page each)
4. Timeline appendix: chronological table of all events

**Output:** `Crisis-Report-{title}-{date}.pdf`

**Dependencies:** `@react-pdf/renderer` (new package)

**Files to touch:**
- `app/api/crisis-comms/command-center/[id]/export/route.ts` — new POST endpoint
- `app/lib/crisis-comms/command-center/pdf-export.ts` — new file, PDF document components
- `app/components/crisis-comms/command-center/WorkspacePhase.tsx` — export button (archived view only)
- `package.json` — add `@react-pdf/renderer`

---

## New Prisma Models Summary

```prisma
model CrisisDocumentSnapshot {
  id          String         @id @default(cuid())
  documentId  String
  document    CrisisDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)
  content     String         @db.Text
  source      String         // 'manual_edit' | 'ai_revision' | 'initial_generation'
  instruction String?
  createdById String
  createdBy   User           @relation(fields: [createdById], references: [id])
  createdAt   DateTime       @default(now())

  @@index([documentId, createdAt])
}

model CrisisMessage {
  id         String         @id @default(cuid())
  incidentId String
  incident   CrisisIncident @relation(fields: [incidentId], references: [id], onDelete: Cascade)
  userId     String
  user       User           @relation(fields: [userId], references: [id])
  content    String
  createdAt  DateTime       @default(now())

  @@index([incidentId, createdAt])
}
```

**Existing model changes:**
- `CrisisDocument`: add `assignedToId String?` + `assignedTo User? @relation(...)` + `snapshots CrisisDocumentSnapshot[]`
- `CrisisIncident`: add `messages CrisisMessage[]` + `expectedDocumentCount Int?`

---

## New Timeline Event Types

| Action | Trigger | Metadata |
|--------|---------|----------|
| `DOCUMENT_STATUS_CHANGED` | Per-document status advance/revert | `{ documentType, oldStatus, newStatus }` |
| `ASSESSMENT_UPDATED` | Assessment edited from workspace | `{ changedFields: string[] }` |
| `DOCUMENT_RESTORED` | Version restored from history | `{ documentType, snapshotId }` |
| `DOCUMENT_ASSIGNED` | Document assigned to participant | `{ documentType, assignedTo: { id, name } }` |
| `INCIDENT_REOPENED` | Closed incident re-opened | `{}` |

---

## New API Routes Summary

| Route | Method | Tier | Purpose |
|-------|--------|------|---------|
| `/command-center/active-count` | GET | 1 | Active incident count for header button |
| `/command-center/{id}/assessment` | PATCH | 1 | Update assessment from workspace |
| `/command-center/documents/{id}/snapshots` | GET | 2 | Fetch version history |
| `/command-center/{id}/presence` | POST | 3 | Report current document focus |
| `/command-center/documents/{id}/assign` | PATCH | 3 | Assign document to participant |
| `/command-center/{id}/messages` | GET, POST | 3 | Chat messages |
| `/command-center/{id}/export` | POST | 3 | Generate PDF incident package |

---

## New Dependencies

| Package | Purpose | Tier |
|---------|---------|------|
| `@react-pdf/renderer` | Server-side PDF generation for incident package export | 3 |

---

## Execution Plan — Sequential 2-Task Phases

### Phase 1: Schema & Emergency Access
1. Prisma schema migration (new models, new fields, new document types)
2. Emergency header button (`CrisisAlertButton` + `/active-count` API)

### Phase 2: Quick Start & Room Code
3. Quick start mode (optional title, severity pre-fill, single textarea)
4. Room code at initiation (show during loading, holding state for joiners)

### Phase 3: Emergency Text Alert & Document Priority
5. Emergency Text Alert document type (prompt, generation, char limit UI)
6. Document priority ordering (drag-to-reorder in assessment, ordered generation)

### Phase 4: Document Status & Print
7. Per-document status controls (badges, action buttons, read-only lock, timeline events)
8. Print stylesheet + View/Edit Assessment panel

### Phase 5: Progressive Streaming & Progress UX
9. Progressive document generation (background generation, polling, skeleton cards)
10. Generation progress indicators (workspace counter, initiation step indicator)

### Phase 6: Version Snapshots, Diff Utility & Undo
11. Version snapshots + word-level diff utility (`CrisisDocumentSnapshot` creation logic, `diff.ts`, snapshots API endpoint)
12. Undo after AI edit + AI edit diff view (undo button with timer, diff overlay in editor)

### Phase 7: Version History Panel
13. Version history panel (slide-over, snapshot list, inline diff comparison, restore with timeline event)
14. Integration testing — verify snapshot creation on manual edit, AI edit, and initial generation; verify undo + restore flows end-to-end

### Phase 8: Real-Time Sync & Presence
15. Polling-based sync (`SyncProvider`, reconciliation, transport abstraction)
16. Presence indicators (POST presence, in-memory store, avatar dots)

### Phase 9: Assignment & Chat
17. Document assignment (assign UI, sidebar sections, timeline events)
18. In-workspace chat (CrisisMessage model, chat panel, tabbed sidebar)

### Phase 10: After-Action & Export
19. After-action report (close flow, AI generation, archived view, re-open)
20. Incident package PDF export (`@react-pdf/renderer`, cover page, full bundle)

---

## Phase 1 Handoff Prompt

```markdown
## Context

You are continuing the Crisis Command Center v2 build for the University of Kentucky platform. The full architecture spec is at `docs/superpowers/specs/2026-04-04-crisis-command-center-v2-design.md` — read it first.

The project is a Next.js 16.x app at `c:\AA Code\Educator marketplace\the-sandbox\`. Read `the-sandbox/CLAUDE.md` for coding conventions before writing any code.

**Current state:** The Crisis Command Center exists as a working feature with 3-phase FSM (initiation → assessment → workspace), 8 document types, room codes, and AI-powered document generation. No work from the v2 spec has been implemented yet.

## Goal — Phase 1: Schema & Emergency Access

Execute ONLY these two tasks, then STOP:

### Task 1: Prisma Schema Migration
- Add `CrisisDocumentSnapshot` model (see spec Section 2.3 for full schema)
- Add `CrisisMessage` model (see spec Section 3.4 for full schema)
- Add `assignedToId String?` + `assignedTo` relation to `CrisisDocument`
- Add `expectedDocumentCount Int?` to `CrisisIncident`
- Add `snapshots CrisisDocumentSnapshot[]` relation to `CrisisDocument`
- Add `messages CrisisMessage[]` relation to `CrisisIncident`
- Add necessary relations on the `User` model for `CrisisDocumentSnapshot.createdBy` and `CrisisMessage.user`
- Run `npx prisma migrate dev --name crisis-command-center-v2` then `npx prisma generate`
- Verify the build passes: `npx tsc --noEmit`

### Task 2: Emergency Header Button
- Create `app/components/crisis-comms/CrisisAlertButton.tsx`:
  - Rendered for ADMIN + STAFF roles only
  - `ShieldAlert` icon from lucide-react, red-tinted
  - Links to `/crisis-comms/command-center`
  - Polls `GET /api/crisis-comms/command-center/active-count` every 60 seconds
  - When count > 0: pulse animation (red glow) + count badge
  - When count === 0: subtle static red icon
- Create `app/api/crisis-comms/command-center/active-count/route.ts`:
  - Uses `withErrorHandling` wrapper + `requireStaffOrAdminUser` auth guard
  - Queries `CrisisIncident` where status in `['DRAFTING', 'ACTIVE', 'CONTAINED']`
  - Returns `{ count: number }`
  - Cache-Control: `private, max-age=30`
- Modify `app/components/Header.tsx` to include `CrisisAlertButton` in the nav for authorized roles
- Verify build passes: `npm run lint && npx tsc --noEmit && npm run build`

## Specs
- Architecture doc: `docs/superpowers/specs/2026-04-04-crisis-command-center-v2-design.md`
- Project conventions: `CLAUDE.md` (Tailwind v4, Prisma v7 PrismaPg adapter, lucide-react only, `withErrorHandling` wrapper on all routes, Pattern A headers)

## Next Link
When both tasks are complete and the build passes, generate the Phase 2 Handoff Prompt following this same format. Phase 2 covers:
- Task 3: Quick start mode (optional title, severity pre-fill, single textarea in InitiationPhase)
- Task 4: Room code at initiation (show during loading, holding state for joiners)

Include full context of what was completed in Phase 1 so the next instance has no gaps.
```
