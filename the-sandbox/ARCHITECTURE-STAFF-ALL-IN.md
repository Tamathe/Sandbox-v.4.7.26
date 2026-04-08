# Architecture: Staff "All-In" Experience — No-Azure Improvements

> **Status:** Complete
> **Date:** 2026-03-25
> **Completed:** 2026-03-25
> **Origin:** Full UX walkthrough as a staff member who wants to abandon all other platforms. These are the gaps we can close *today* without waiting for Azure/Microsoft access.
> **Scope:** 10 improvements across hub visibility, Sandy intelligence, task management, exports, notifications, approvals, document storage, faculty tool access, action center, and scheduled communications. Each is a self-contained step.

---

## Context

Morgan Rivera is Director of Academic Operations. She wants the platform to be her only screen. Today, the platform handles ~60-70% of her work — policy lookup, announcements, committee minutes, surveys, Sandy concierge. But the remaining 30-40% forces her back to other tools.

Some of that 30-40% requires Azure (email, calendar, OneDrive, Teams) — those are tracked in `project_azure_integration_roadmap.md`. But **10 improvements require zero external integrations** and would immediately make the staff experience feel complete, intelligent, and self-sufficient.

**Design principle from the messaging cleanup spec:**
> "Every change serves one goal: reduce cognitive load. If a user has to think about what an icon does, decide whether metadata matters, or parse redundant visual layers — we failed."

That applies here. Morgan shouldn't have to wonder where her tools are, remember to check three different places for action items, or open Excel to share a budget report.

---

## Step 1: Fix Hub Role Filtering for STAFF

> "Morgan opens the Hub and doesn't see tools that were built specifically for her."

### The Problem

`hub-config.ts` defines `visibleTo` arrays as `['STUDENT', 'EDUCATOR', 'ADMIN']`. The STAFF role is never mentioned. Morgan may see nothing — or everything via a fallback — depending on how the Hub page filters. Either way, it's wrong.

### Design

- Add `'STAFF'` to every swim lane's `visibleTo` array except Crisis Comms (which is explicitly EDUCATOR/ADMIN only)
- Add a new visibility rule: Staff & Operations lane should show STAFF role first in the array (cosmetic priority signal)
- Verify the Hub page component's filter logic handles the STAFF role correctly

### Files

| Type | Path | Change |
|---|---|---|
| Config | `app/hub/hub-config.ts` | Add `'STAFF'` to 10 of 11 swim lane `visibleTo` arrays |
| Page | `app/hub/page.tsx` | Verify role filter includes STAFF (may already work if filter is `visibleTo.includes(role)`) |

### Schema Changes

None.

### Acceptance

- Log in as Morgan → Hub shows all 10 applicable swim lanes
- Staff & Operations lane appears with all 7 Tiana tools
- Crisis Comms lane does NOT appear (EDUCATOR/ADMIN only)

---

## Step 2: Sandy Staff Context & Memory

> "Sandy doesn't know Morgan is Director of Academic Operations. Every conversation starts from zero."

### The Problem

The concierge prompt injects `user.role` and `user.department` but not a title. Morgan's title ("Director of Academic Operations") exists only in prose descriptions, not in the User model. Sandy can't tailor recommendations to her seniority, scope, or institutional knowledge.

### Design

**A. Add `title` field to User model**
```prisma
model User {
  // ... existing fields
  title       String?   // e.g., "Director of Academic Operations"
}
```

**B. Seed Morgan's title**
In `staff-seed-data.ts`, add `title: 'Director of Academic Operations'`.

**C. Inject title into Sandy prompts**
In `concierge-service.ts` (line ~228), add title to the user context block:
```
User: ${user.name} (${user.role})
Title: ${user.title || 'N/A'}
Department: ${user.department || 'N/A'}
College: ${user.college || 'N/A'}
```

In `agent-system-prompt.ts` (line ~46), same injection.

**D. Sandy behavioral rules for staff context**
Add to the STAFF conditional block in concierge-service.ts:
- Reference Morgan's title when making recommendations ("As Director of Academic Operations, you may want to...")
- Weight policy and budget recommendations higher than course content
- When Morgan asks about a topic, assume operational/administrative lens, not student lens

### Files

| Type | Path | Change |
|---|---|---|
| Schema | `prisma/schema.prisma` | Add `title String?` to User model |
| Seed | `app/lib/staff/staff-seed-data.ts` | Add `title: 'Director of Academic Operations'` |
| Prompt | `app/lib/concierge-service.ts` | Inject `user.title` into system prompt (~line 228) |
| Prompt | `app/lib/agent/agent-system-prompt.ts` | Inject `user.title` into agent prompt (~line 46) |
| Migration | `prisma/migrations/` | Auto-generated: `ALTER TABLE "User" ADD COLUMN "title" TEXT` |

### Schema Changes

One field addition: `title String?` on User. Non-breaking, nullable.

### Acceptance

- Seed Morgan with title → verify in DB
- Open Sandy panel as Morgan → Sandy's first greeting references her role contextually
- Ask Sandy "what should I focus on today?" → response reflects Director-level priorities, not generic staff

---

## Step 3: Personal Task Manager

> "Action items only exist inside Committees and Briefing. Morgan has no personal to-do list."

### The Problem

Staff action items live in three siloed places:
1. `StaffActionItem` — briefing action queue (purchase approvals, HR actions, etc.)
2. Committee action items — embedded in meeting minutes
3. Sandy recommendations — ephemeral, not persisted

Morgan can't create her own tasks, set her own deadlines, or track personal work. She still needs Outlook Tasks or sticky notes.

### Design

**A. New Prisma model: `Task`**
```prisma
model Task {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  title       String
  description String?   @db.Text
  priority    String    @default("P2")  // P0, P1, P2, P3
  status      String    @default("open") // open, in_progress, done, cancelled
  dueDate     DateTime?
  tags        String[]  // e.g., ["committee", "budget", "personal"]
  source      String    @default("manual") // manual, sandy, committee, briefing
  sourceId    String?   // FK to originating item (committee action, briefing action, etc.)
  completedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([userId, status])
  @@index([userId, dueDate])
}
```

**B. API routes**

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/tasks` | List tasks (filter by status, priority, tag, due date range) |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks/[id]` | Update task (title, status, priority, dueDate, tags) |
| DELETE | `/api/tasks/[id]` | Delete task |
| POST | `/api/tasks/bulk` | Bulk status update (mark 5 tasks done at once) |

All routes require authenticated user. Tasks are private to the user (no sharing yet — that comes with Teams integration).

**C. Page: `/tasks`**

Simple, focused task list:
- **Header**: Pattern A (`PageHeader` component), title "My Tasks"
- **Quick add**: Single input bar at top (title + optional due date picker). Hit Enter to create.
- **Filter bar**: Status (open/done/all), Priority (P0-P3), Tags, Due date range
- **Task list**: Cards with checkbox, title, priority badge, due date, tags. Click to expand inline edit.
- **Sections**: "Overdue" (red), "Today" (bold), "This Week", "Later", "Done" (collapsed)
- **Bulk actions**: Select multiple → mark done, change priority, delete
- **Empty state**: "Nothing on your plate. Sandy can suggest tasks based on your briefing."

**D. Sandy integration**

New Sandy tools:
- `create_task` — "Remind me to review the budget report by Friday"
- `list_tasks` — "What's on my plate today?"
- `complete_task` — "Mark the policy review as done"

Add to tool registry (`app/lib/agent/tool-registry.ts`), available to all roles.

**E. Cross-pollination**

- Committee action items: "Add to My Tasks" button on each action item in `/staff/committees`
- Briefing action queue: "Track Personally" button creates a Task linked via `sourceId`
- Sandy recommendations: "Save as Task" action on recommendation cards
- Staff Homepage: Add "My Tasks" summary card (count of overdue + due today)

**F. Navigation**

- Add "My Tasks" to Header quick links (all roles)
- Badge on quick link showing overdue count

### Files

| Type | Path | Change |
|---|---|---|
| Schema | `prisma/schema.prisma` | New `Task` model |
| Migration | `prisma/migrations/` | Auto-generated |
| API (5) | `app/api/tasks/route.ts`, `app/api/tasks/[id]/route.ts`, `app/api/tasks/bulk/route.ts` | CRUD + bulk |
| Page | `app/tasks/page.tsx` | Task list UI |
| Component | `app/components/tasks/TaskList.tsx` | Reusable task list (used on page + homepage card) |
| Component | `app/components/tasks/TaskQuickAdd.tsx` | Inline task creation bar |
| Component | `app/components/tasks/TaskCard.tsx` | Individual task display + inline edit |
| Component | `app/components/staff/StaffHomepage.tsx` | Add "My Tasks" summary card |
| Sandy | `app/lib/agent/tools/task-tools.ts` | 3 tools: create, list, complete |
| Registry | `app/lib/agent/tool-registry.ts` | Register task tools |
| Nav | `app/components/Header.tsx` | Add "My Tasks" quick link with badge |
| Integration | `app/staff/committees/[id]/page.tsx` | "Add to My Tasks" button on action items |

### Schema Changes

One new model: `Task` (12 fields, 2 indexes). No changes to existing models.

### Acceptance

- Create task via quick-add → appears in list with correct section
- Create task via Sandy ("remind me to...") → appears in list
- Mark task done → moves to "Done" section, `completedAt` set
- Committee action item → "Add to My Tasks" → creates linked Task
- Staff Homepage shows "My Tasks" card with overdue/today counts
- Header quick link shows badge when overdue tasks exist

---

## Step 4: Export & Reporting

> "Morgan can't share her briefing data with anyone who isn't logged into the platform."

### The Problem

No export capability exists anywhere in the staff experience. Budget reports, action queues, committee minutes, and briefing snapshots are trapped inside the UI. Morgan needs to email a budget summary to the Provost — she can't.

### Design

**A. Export service**

Create a shared export utility that generates CSV and PDF from structured data.

```typescript
// app/lib/export-service.ts

interface ExportColumn {
  key: string
  label: string
  format?: 'date' | 'currency' | 'percent'
}

function generateCSV(data: Record<string, unknown>[], columns: ExportColumn[]): string
function generatePDF(title: string, data: Record<string, unknown>[], columns: ExportColumn[]): Buffer
```

CSV: Built with string concatenation (no dependency needed).
PDF: Use `@react-pdf/renderer` (already a common Next.js companion) or server-side HTML → PDF via a lightweight lib. If neither is acceptable, start with CSV-only and add PDF later.

**B. Export buttons on staff pages**

| Page | What's Exported | Format |
|---|---|---|
| Staff Homepage — Action Queue | All pending actions with priority, type, deadline, age | CSV |
| Staff Homepage — Budget Pulse | Spend by category, variance, burn rate | CSV |
| Staff Homepage — Full Briefing | Narrative + KPIs + actions + budget + alerts | PDF |
| Committees — Minutes | Meeting minutes document | PDF |
| Committees — Action Items | Open items with assignee, due date, status | CSV |
| Communications — Drafts | Draft content for offline review | PDF |
| Survey Intelligence — Draft | Survey response draft with evidence tables | PDF (already partially exists via Word export) |

**C. API routes**

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/export/actions` | Export action queue as CSV |
| GET | `/api/export/budget` | Export budget data as CSV |
| GET | `/api/export/briefing` | Export full briefing as PDF |
| GET | `/api/export/committees/[id]/minutes/[meetingId]` | Export minutes as PDF |
| GET | `/api/export/committees/[id]/actions` | Export committee actions as CSV |

All routes return appropriate `Content-Type` and `Content-Disposition` headers for browser download.

**D. UI pattern**

Add a small download icon button (top-right of each card/section) using the existing icon pattern (`size-4`). Tooltip: "Export as CSV" or "Export as PDF". No modal — direct download on click.

### Files

| Type | Path | Change |
|---|---|---|
| Service | `app/lib/export-service.ts` | CSV + PDF generation utilities |
| API (5) | `app/api/export/actions/route.ts`, etc. | Export endpoints |
| Component | `app/components/ExportButton.tsx` | Reusable download icon button |
| Integration | `app/components/staff/StaffHomepage.tsx` | Add ExportButton to action queue, budget, briefing cards |
| Integration | `app/staff/committees/[id]/page.tsx` | Add ExportButton to minutes and action items |

### Schema Changes

None.

### Acceptance

- Click export on action queue → downloads CSV with all pending items
- Click export on budget pulse → downloads CSV with spend/variance data
- Click export on briefing → downloads PDF with full narrative + data
- Click export on committee minutes → downloads formatted PDF
- All exports include timestamp and user name in filename

---

## Step 5: Notification Preferences

> "Morgan gets every notification type with no way to turn any of them off."

### The Problem

The notification system creates notifications for 8 event types (COMMENT_ON_TOOL, COMMENT_REPLY, UKNOW_ALERT, COURSE_MAP_UPDATED, etc.) but there's no preference model. Morgan can't mute categories she doesn't care about or opt into a daily digest instead of real-time pings.

### Design

**A. New Prisma model: `NotificationPreference`**
```prisma
model NotificationPreference {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  type       String   // matches NotificationType enum values
  enabled    Boolean  @default(true)
  channel    String   @default("in_app") // in_app, email_instant, email_digest, off
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([userId, type])
}
```

**B. Default preferences**

On first load of Settings, if no preferences exist for a user, auto-create defaults:
- All types: `enabled: true`, `channel: "in_app"`
- Staff-specific defaults: UKNOW_ALERT → `email_digest`, COMMENT_ON_TOOL → `in_app`

**C. Settings UI**

Add a "Notifications" tab/section to `/app/settings/page.tsx`:

```
Notification Preferences
─────────────────────────
Category                  In-App    Email     Off
─────────────────────────
Comments & Replies        [●]       [ ]       [ ]
UKNow Alerts              [●]       [●]       [ ]
Course Updates            [●]       [ ]       [ ]
Live Room Activity        [●]       [ ]       [ ]
Staff Alerts (Critical)   [●]       [●]       [ ]  ← always on, can't disable
Staff Alerts (Info)       [●]       [ ]       [ ]
─────────────────────────
Email Digest: [Off ▾] Daily at 8am | Weekly Monday 8am
```

Radio buttons per row. "Staff Alerts (Critical)" is locked on — P0 alerts can't be silenced.

**D. Wire into notification creation**

Before creating a notification, check the user's preference for that type. If `channel === 'off'`, skip creation. If `channel === 'email_digest'`, create but mark with a `digest: true` flag for batch sending.

**E. API routes**

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/notifications/preferences` | Get user's notification preferences |
| PUT | `/api/notifications/preferences` | Bulk update preferences |

### Files

| Type | Path | Change |
|---|---|---|
| Schema | `prisma/schema.prisma` | New `NotificationPreference` model |
| Migration | `prisma/migrations/` | Auto-generated |
| API (2) | `app/api/notifications/preferences/route.ts` | GET/PUT preferences |
| Page | `app/settings/page.tsx` | Add Notifications section with toggles |
| Component | `app/components/settings/NotificationPreferences.tsx` | Preference grid UI |
| Service | `app/api/notifications/route.ts` | Check preferences before creating notification |

### Schema Changes

One new model: `NotificationPreference` (7 fields, 1 unique constraint).

### Acceptance

- Settings page shows notification grid with current preferences
- Toggle a type to "Off" → no more notifications of that type appear
- Toggle to "Email" → notification preference saved (email sending is future work, but preference is stored)
- P0 staff alerts cannot be turned off (UI enforces this)

---

## Step 6: Multi-Level Approval Workflows

> "Communications have a flat draft → approved → sent. Morgan needs supervisor sign-off before sending to all staff."

### The Problem

The current approval flow is single-step: drafter submits, one reviewer approves, done. For institutional announcements going to all 5,000 staff, Morgan needs her VP to approve first. The current system has no concept of approval chains, escalation, or routing.

### Design

**A. New Prisma model: `ApprovalStep`**
```prisma
model ApprovalStep {
  id               String    @id @default(cuid())
  communicationId  String
  communication    Communication @relation(fields: [communicationId], references: [id])
  stepOrder        Int       // 1, 2, 3...
  approverEmail    String    // who needs to approve
  status           String    @default("pending") // pending, approved, rejected, skipped
  comment          String?   @db.Text
  decidedAt        DateTime?
  createdAt        DateTime  @default(now())

  @@index([communicationId, stepOrder])
}
```

**B. Approval chain templates**

Define common chains in a config (not DB — these are institutional patterns):
```typescript
const APPROVAL_CHAINS = {
  'all-staff': [
    { role: 'director', label: 'Director Review' },
    { role: 'vp', label: 'VP Approval' },
  ],
  'department-only': [
    { role: 'director', label: 'Director Review' },
  ],
  'college-wide': [
    { role: 'director', label: 'Director Review' },
    { role: 'dean', label: 'Dean Approval' },
  ],
}
```

When a communication is submitted for review, the system creates `ApprovalStep` records based on the audience type → chain template mapping.

**C. Approval flow**

1. Morgan drafts announcement → selects audience "All Staff"
2. System creates 2 approval steps: Director Review (Morgan auto-approves as director), VP Approval (pending)
3. VP receives notification + sees pending approval in their action queue
4. VP approves → status moves to APPROVED → Morgan can send
5. If VP rejects → notification back to Morgan with comment → status back to DRAFT

**D. Escalation**

If an approval step is pending for >48 hours:
- Sandy recommends nudging the approver
- Briefing highlights stale approvals
- Optional: auto-escalate to next level (configurable per chain)

**E. UI changes to Communications page**

- "Submit for Review" now shows the approval chain preview: "This will require: Director Review → VP Approval"
- Approval status timeline on communication detail (Step 1 ✓ → Step 2 ⏳ → Step 3 pending)
- Approvers see pending items in their action queue with "Approve / Request Revisions" buttons

### Files

| Type | Path | Change |
|---|---|---|
| Schema | `prisma/schema.prisma` | New `ApprovalStep` model |
| Migration | `prisma/migrations/` | Auto-generated |
| Config | `app/lib/staff/approval-chains.ts` | Chain templates by audience type |
| Service | `app/lib/staff/approval-service.ts` | Create chain, advance step, check stale, escalate |
| API (3) | `app/api/staff/communications/[id]/approve/route.ts` | Modify to handle multi-step |
| API | `app/api/staff/communications/[id]/approval-status/route.ts` | GET approval chain status |
| Component | `app/components/staff/ApprovalTimeline.tsx` | Visual step indicator |
| Integration | `app/staff/communications/page.tsx` | Show approval chain on submit + timeline on detail |
| Integration | `app/lib/staff/action-queue-service.ts` | Pending approvals appear in action queue |

### Schema Changes

One new model: `ApprovalStep` (8 fields, 1 index).

### Acceptance

- Submit "All Staff" communication → 2 approval steps created
- Approver sees pending item in action queue
- Approve step 1 → step 2 becomes active
- Approve step 2 → communication status = APPROVED
- Reject at any step → communication returns to DRAFT with comment
- Stale approval (>48h) → Sandy recommends follow-up

---

## Step 7: Staff Access to Faculty Tools (Conditional)

> "Morgan advises students but can't see advisee lists or draft recommendation letters because she's STAFF, not EDUCATOR."

### The Problem

Sandy's tool registry gates faculty tools (`get_advisee_list`, `draft_recommendation`, `get_committee_actions`) to `roles: ['EDUCATOR', 'ADMIN']`. A staff Director of Academic Operations who advises students has no access.

### Design

**A. Add advisor relationship flag**

Rather than changing the role system, add an `isAdvisor` boolean to the User model:
```prisma
model User {
  // ... existing fields
  isAdvisor   Boolean   @default(false)
}
```

Seed Morgan with `isAdvisor: true`.

**B. Expand tool registry role checks**

In `tool-registry.ts`, change faculty tool access from:
```typescript
roles: ['EDUCATOR', 'ADMIN']
```
to:
```typescript
roles: ['EDUCATOR', 'ADMIN'],
also: (user) => user.isAdvisor === true  // grants access regardless of role
```

Or more simply, add `'STAFF'` to the roles array and let the tool implementations check `isAdvisor` before returning data. Prefer the simpler approach.

**C. Scope what staff advisors can do**

Staff advisors get:
- `get_advisee_list` — see their assigned advisees
- `draft_recommendation` — draft letters for their advisees
- `check_degree_audit` — run audits for advisees

Staff advisors do NOT get:
- `get_course_roster` — that's faculty teaching, not advising
- `grade_assignment` — same
- `publish_course_material` — same

### Files

| Type | Path | Change |
|---|---|---|
| Schema | `prisma/schema.prisma` | Add `isAdvisor Boolean @default(false)` to User |
| Migration | `prisma/migrations/` | Auto-generated |
| Seed | `app/lib/staff/staff-seed-data.ts` | Add `isAdvisor: true` for Morgan |
| Registry | `app/lib/agent/tool-registry.ts` | Expand 3 tools to allow `isAdvisor` users |

### Schema Changes

One field addition: `isAdvisor Boolean @default(false)` on User. Non-breaking.

### Acceptance

- Morgan asks Sandy "show me my advisees" → Sandy returns advisee list (not "you don't have access")
- Morgan asks Sandy to draft a recommendation → Sandy drafts it
- Morgan asks Sandy to grade an assignment → Sandy correctly says that's a faculty function
- Non-advisor staff cannot access advisee tools

---

## Step 8: Unified Action Center

> "Action items live in three places. Morgan checks the briefing, then committees, then communications. Every. Single. Day."

### The Problem

Three separate action item sources:
1. **StaffActionItem** — briefing action queue (budget approvals, HR actions)
2. **Committee action items** — embedded in committee meeting pages
3. **Communication approvals** — pending reviews in communications page

Plus Sandy recommendations (ephemeral). Morgan has to visit three pages to know what needs her attention.

### Design

**A. New page: `/staff/actions`**

One page that aggregates ALL pending work items:

```
┌─────────────────────────────────────────────────┐
│ Action Center                          [Export]  │
│                                                  │
│ Filter: [All ▾] [All Priorities ▾] [All Sources ▾] │
│                                                  │
│ ── OVERDUE (3) ──────────────────────────────── │
│ ☐ Review Q3 budget variance    P0  Budget  2d ago │
│ ☐ Approve Morgan's travel req  P1  HR      1d ago │
│ ☐ Sign off on policy update    P1  Policy  1d ago │
│                                                  │
│ ── DUE TODAY (2) ────────────────────────────── │
│ ☐ Committee minutes review     P2  Committee      │
│ ☐ Draft announcement feedback  P2  Communication  │
│                                                  │
│ ── THIS WEEK (4) ───────────────────────────── │
│ ...                                              │
│                                                  │
│ ── COMPLETED TODAY (1) ─────────────────────── │
│ ✓ Approved room reservation    P3  Facilities     │
└─────────────────────────────────────────────────┘
```

**B. Aggregation service**

```typescript
// app/lib/staff/action-center-service.ts

interface UnifiedAction {
  id: string
  source: 'action_queue' | 'committee' | 'communication' | 'task' | 'approval'
  sourceId: string
  title: string
  description?: string
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  category: string // budget, hr, committee, communication, policy, etc.
  dueDate?: Date
  status: 'pending' | 'overdue' | 'done'
  actionUrl: string // deep link to originating page
  resolveUrl?: string // API to resolve inline
}

async function getUnifiedActions(userId: string, filters?: ActionFilters): Promise<UnifiedAction[]>
```

This service queries:
1. `StaffActionItem` where status = 'pending'
2. Committee actions where status != 'completed' and assignee = userId
3. `ApprovalStep` where approverEmail = user.email and status = 'pending'
4. `Task` where status = 'open' (from Step 3)
5. Merges, deduplicates (via `sourceId`), sorts by priority then dueDate

**C. Inline resolution**

For simple actions (approve/reject, mark done), resolve directly from the Action Center without navigating away. For complex actions (draft a reply, generate minutes), link to the source page.

**D. Wire into Staff Homepage**

Replace the existing "Action Queue" card on StaffHomepage with a slim "Action Center" card that shows counts by source + a "View All →" link to `/staff/actions`.

**E. Navigation**

Add "Action Center" to the STAFF nav section in Header (alongside Policies, Communications, Committees, Surveys).

### Files

| Type | Path | Change |
|---|---|---|
| Service | `app/lib/staff/action-center-service.ts` | Unified action aggregation |
| API (2) | `app/api/staff/action-center/route.ts` | GET unified actions with filters |
| API | `app/api/staff/action-center/resolve/route.ts` | POST inline resolution |
| Page | `app/staff/actions/page.tsx` | Action Center UI |
| Component | `app/components/staff/ActionCenterCard.tsx` | Summary card for homepage |
| Component | `app/components/staff/UnifiedActionList.tsx` | Grouped action list with inline resolve |
| Integration | `app/components/staff/StaffHomepage.tsx` | Replace action queue card with ActionCenterCard |
| Nav | `app/components/Header.tsx` | Add "Action Center" to STAFF nav items |

### Schema Changes

None. This aggregates existing models.

### Acceptance

- `/staff/actions` shows items from all 4 sources in one sorted list
- Filter by source (committee only, approvals only, etc.)
- Resolve a simple action inline → item moves to "Completed Today"
- Click complex action → navigates to source page
- Staff Homepage card shows aggregated counts
- Header nav includes "Action Center"

---

## Step 9: Internal Document Library

> "Morgan can't share a policy template with her team without emailing an attachment."

### The Problem

No shared document storage exists. File Cleaner renames files but doesn't upload them. Survey Intelligence has a Knowledge Vault but it's project-scoped. Messaging has file attachments but they're buried in threads. There's no "shared drive" for institutional documents.

### Design

**A. New Prisma model: `Document`**
```prisma
model Document {
  id           String    @id @default(cuid())
  uploaderId   String
  uploader     User      @relation(fields: [uploaderId], references: [id])
  title        String
  description  String?   @db.Text
  fileName     String
  fileSize     Int
  mimeType     String
  storageKey   String    // Azure Blob key or DB reference
  tags         String[]  // e.g., ["policy", "template", "budget", "hr"]
  visibility   String    @default("private") // private, department, all_staff
  department   String?   // if visibility = department, which one
  version      Int       @default(1)
  parentId     String?   // previous version's ID (simple version chain)
  downloadCount Int      @default(0)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@index([uploaderId])
  @@index([visibility, department])
  @@index([tags])
}
```

**B. Storage backend**

Use Azure Blob Storage client (already exists at `app/lib/azure-blob-storage.ts`). If Azure creds aren't configured yet, fall back to storing file content as base64 in a `fileContent Bytes?` field (temporary, swap when Azure arrives). The abstraction layer from `project_azure_migration.md` principles applies here.

**C. Page: `/documents`**

```
┌──────────────────────────────────────────────────┐
│ Document Library                    [+ Upload]    │
│                                                   │
│ Search: [________________________] [Tags ▾]       │
│ View: [My Files] [Department] [All Staff]         │
│                                                   │
│ ── Policy Templates (3) ──────────────────────── │
│ 📄 Travel Reimbursement Template  v2  PDF  12KB   │
│ 📄 Event Proposal Form            v1  DOCX 8KB   │
│ 📄 Budget Request Template         v3  XLSX 15KB  │
│                                                   │
│ ── Committee Documents (2) ──────────────────── │
│ 📄 Faculty Senate Bylaws           v1  PDF  45KB  │
│ 📄 Curriculum Committee Charter    v1  PDF  22KB  │
└──────────────────────────────────────────────────┘
```

**D. Upload flow**

- Click "Upload" → file picker + title + tags + visibility
- File stored via storage backend
- New version: upload to same document → `version` increments, `parentId` links to previous

**E. Integration points**

- Committee detail page: "Attach Document" button links to document library
- Communications: "Attach from Library" when composing
- Sandy tool: `search_documents` — "find the travel reimbursement template"

**F. Navigation**

Add "Documents" to Header quick links (STAFF + ADMIN + EDUCATOR).

### Files

| Type | Path | Change |
|---|---|---|
| Schema | `prisma/schema.prisma` | New `Document` model |
| Migration | `prisma/migrations/` | Auto-generated |
| Service | `app/lib/document-service.ts` | Upload, download, search, version management |
| API (5) | `app/api/documents/route.ts`, `[id]/route.ts`, `[id]/download/route.ts`, `[id]/versions/route.ts`, `search/route.ts` | CRUD + search + download + versions |
| Page | `app/documents/page.tsx` | Document library UI |
| Component | `app/components/documents/DocumentCard.tsx` | File card with metadata |
| Component | `app/components/documents/UploadModal.tsx` | Upload form |
| Component | `app/components/documents/DocumentPicker.tsx` | Reusable picker for embedding in other pages |
| Sandy | `app/lib/agent/tools/document-tools.ts` | `search_documents`, `get_document_info` |
| Registry | `app/lib/agent/tool-registry.ts` | Register document tools |
| Nav | `app/components/Header.tsx` | Add "Documents" quick link |

### Schema Changes

One new model: `Document` (15 fields, 3 indexes).

### Acceptance

- Upload a PDF → appears in library with correct metadata
- Set visibility to "All Staff" → other staff users can see and download it
- Upload new version → version number increments, previous version accessible
- Sandy: "find the budget template" → returns document with download link
- Attach document from library when composing a communication

---

## Step 10: Scheduled Communications

> "Morgan drafts Monday's announcement on Friday but has to remember to come back and hit Send."

### The Problem

Communications can only be sent immediately after approval. There's no "schedule for later" option. Morgan writes ahead but has to manually return to send at the right time.

### Design

**A. Add scheduling fields to Communication model**

```prisma
model Communication {
  // ... existing fields
  scheduledAt   DateTime?  // when to auto-send (null = manual send)
  scheduledBy   String?    // who scheduled it
}
```

**B. Schedule UI**

On the "Send" action in communications detail:
- Current: "Send Now" button
- New: "Send Now" button + "Schedule" button
- "Schedule" opens a datetime picker: date + time + timezone display
- After scheduling: status shows "Scheduled for Mon Mar 28, 9:00 AM" with a "Cancel Schedule" option

**C. CRON job**

New CRON route: `/api/cron/send-scheduled-communications`
- Runs every 5 minutes
- Queries: `Communication WHERE status = 'APPROVED' AND scheduledAt <= NOW() AND scheduledAt IS NOT NULL`
- For each match: execute the existing send logic, update status to SENT
- Protected by `CRON_SECRET` header

**D. Briefing integration**

Sandy's briefing narrative includes: "You have 2 communications scheduled to go out today."

### Files

| Type | Path | Change |
|---|---|---|
| Schema | `prisma/schema.prisma` | Add `scheduledAt DateTime?` and `scheduledBy String?` to Communication |
| Migration | `prisma/migrations/` | Auto-generated |
| API | `app/api/staff/communications/[id]/schedule/route.ts` | POST schedule/unschedule |
| CRON | `app/api/cron/send-scheduled-communications/route.ts` | CRON sender |
| Integration | `app/staff/communications/page.tsx` | Schedule button + datetime picker on send action |
| Integration | `app/lib/staff/briefing-service.ts` | Include scheduled comms count in narrative |

### Schema Changes

Two field additions to existing `Communication` model: `scheduledAt DateTime?`, `scheduledBy String?`. Non-breaking, nullable.

---

## Execution Order

These steps are ordered by dependency and impact. Each is independently shippable.

| Step | Name | Depends On | Effort | Impact |
|---|---|---|---|---|
| **1** | Hub Role Fix | — | 15 min | Immediate visibility fix |
| **2** | Sandy Staff Context | — | 1 hour | Sandy feels smarter |
| **3** | Personal Task Manager | — | 1 sprint | Replaces external to-do apps |
| **4** | Export & Reporting | — | 1 sprint | Unlocks data sharing |
| **5** | Notification Preferences | — | 0.5 sprint | Reduces noise |
| **6** | Multi-Level Approvals | — | 1 sprint | Enterprise-grade comms |
| **7** | Faculty Tool Access | Step 2 (title field) | 1 hour | Advisor workflow unlocked |
| **8** | Unified Action Center | Step 3 (tasks), Step 6 (approvals) | 1 sprint | Single pane of glass |
| **9** | Document Library | — | 1.5 sprints | Replaces SharePoint (basic) |
| **10** | Scheduled Communications | — | 0.5 sprint | Quality of life |

**Recommended sequence:** 1 → 2 → 7 → 3 → 5 → 10 → 4 → 6 → 8 → 9

Steps 1, 2, and 7 are quick wins (under 2 hours combined). Step 8 benefits from having Steps 3 and 6 done first so it has more sources to aggregate. Step 9 is the largest and most standalone — can be parallelized with others.

---

## Design Principles

1. **Every feature works without Azure.** Azure integrations (email sync, OneDrive, Teams) layer on top later. Nothing here creates a dependency.
2. **Sandy is the connective tissue.** Every new system gets Sandy tools so Morgan can say "what's on my plate?" and get one unified answer.
3. **Export is not optional.** If Morgan can see data, she must be able to share it. No data trapped in the UI.
4. **One page, one purpose.** Action Center aggregates; it doesn't replace source pages. Documents is a library, not a file manager. Tasks is personal, not team project management.
5. **Staff is not a lesser role.** Staff users are power users with operational scope. Features should reflect institutional authority, not be watered-down versions of faculty tools.
