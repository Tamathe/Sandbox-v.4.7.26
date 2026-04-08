# Staff "All-In" — Step-by-Step Build Prompts

> **How to use:** Copy-paste each prompt into a fresh Claude Code conversation. Complete the step, verify acceptance criteria, then move to the next prompt. Each prompt is self-contained — it tells the new instance everything it needs to know.
>
> **Recommended sequence:** 1 → 2 → 7 → 3 → 5 → 10 → 4 → 6 → 8 → 9
>
> After each step: `npx tsc --noEmit` must pass with 0 errors before moving on.

---

## PROMPT 1: Fix Hub Role Filtering for STAFF

```
Read `the-sandbox/CLAUDE.md` first for project conventions.

Then read `the-sandbox/ARCHITECTURE-STAFF-ALL-IN.md` — focus on **Step 1: Fix Hub Role Filtering for STAFF**.

## Task

The Hub config at `app/hub/hub-config.ts` defines `visibleTo` arrays on each swim lane. The STAFF role is missing from all of them. Morgan Rivera (morgan.rivera@uky.edu, role STAFF) may not see tools in the Hub.

1. Read `app/hub/hub-config.ts` and find every `visibleTo` array.
2. Add `'STAFF'` to every swim lane's `visibleTo` array EXCEPT "Crisis Comms" (which should remain `['EDUCATOR', 'ADMIN']` only).
3. For the "Staff & Operations" lane, put `'STAFF'` first in the array as a cosmetic priority signal.
4. Read `app/hub/page.tsx` (or wherever the Hub filters tools by role) and verify the filter logic works with the STAFF role. If it uses `visibleTo.includes(role)`, it should already work. If not, fix the filter.
5. Run `npx tsc --noEmit` and confirm 0 errors.

## Acceptance Criteria
- STAFF role sees 10 of 11 swim lanes (all except Crisis Comms)
- Staff & Operations lane shows all 7 Tiana Suite tools
- Crisis Comms remains EDUCATOR + ADMIN only
- TypeScript passes with 0 errors

Do NOT touch any other files. This is a surgical config fix.
```

---

## PROMPT 2: Sandy Staff Context & Memory

```
Read `the-sandbox/CLAUDE.md` first for project conventions.

Then read `the-sandbox/ARCHITECTURE-STAFF-ALL-IN.md` — focus on **Step 2: Sandy Staff Context & Memory**.

## Context

Sandy (the AI concierge) doesn't know that Morgan Rivera is "Director of Academic Operations." The User model has no `title` field. Sandy's prompts inject `user.role` and `user.department` but not a title, so every Sandy conversation starts generic.

## Task

### A. Add `title` field to User model
1. Read `prisma/schema.prisma` and find the `User` model.
2. Add `title String?` to the User model (nullable, no default).
3. Run `npx prisma migrate dev --name add-user-title` to create the migration.
4. Run `npx prisma generate`.

### B. Seed Morgan's title
1. Read `app/lib/staff/staff-seed-data.ts` (or wherever Morgan Rivera's seed data lives).
2. Add `title: 'Director of Academic Operations'` to Morgan's seed record.
3. Also check `prisma/seed.ts` or `prisma/seed-demo.ts` — if Morgan is seeded there too, add the title field there as well.

### C. Inject title into Sandy prompts
1. Read `app/lib/concierge-service.ts` — find where user context is built into the system prompt (look for where `user.name`, `user.role`, `user.department` are interpolated). Add `user.title` to that context block:
   ```
   Title: ${user.title || 'N/A'}
   ```
2. Read `app/lib/agent/agent-system-prompt.ts` — find the user context line (around line 46). Add the same title injection.

### D. Sandy behavioral rules for staff
1. In `concierge-service.ts`, find the STAFF conditional block (search for `user.role === 'STAFF'`).
2. Add behavioral guidance to the system prompt for STAFF users:
   - Reference the user's title when making recommendations
   - Weight policy and budget recommendations higher than course content
   - Assume operational/administrative lens, not student lens

### E. Verify
1. Run `npx tsc --noEmit` — 0 errors.
2. Run `npm run build` — should succeed.

## Acceptance Criteria
- `title String?` exists on User model in schema
- Morgan's seed data includes her title
- Sandy's concierge prompt includes user title
- Sandy's agent prompt includes user title
- STAFF users get behavioral guidance in Sandy's prompt about their operational role
- 0 TypeScript errors
```

---

## PROMPT 7: Staff Access to Faculty Tools (Conditional)

```
Read `the-sandbox/CLAUDE.md` first for project conventions.

Then read `the-sandbox/ARCHITECTURE-STAFF-ALL-IN.md` — focus on **Step 7: Staff Access to Faculty Tools (Conditional)**.

## Context

Sandy's tool registry gates faculty tools (`get_advisee_list`, `draft_recommendation`, `check_degree_audit`) to `roles: ['EDUCATOR', 'ADMIN']`. Morgan Rivera is a STAFF member who advises students but can't access these tools.

## Task

### A. Add `isAdvisor` flag to User model
1. Read `prisma/schema.prisma` — find the `User` model.
2. Add `isAdvisor Boolean @default(false)`.
3. Run `npx prisma migrate dev --name add-is-advisor-flag`.
4. Run `npx prisma generate`.

### B. Seed Morgan as an advisor
1. Find Morgan's seed data (check `app/lib/staff/staff-seed-data.ts`, `prisma/seed.ts`, `prisma/seed-demo.ts`).
2. Add `isAdvisor: true` to her record.

### C. Expand tool registry role checks
1. Read `app/lib/agent/tool-registry.ts` — find the faculty/advisor tools: `get_advisee_list`, `draft_recommendation`, `check_degree_audit` (or similar names).
2. For these 3 tools ONLY, expand access so that users with `isAdvisor: true` can also use them, regardless of role. The simplest approach: check both the existing role array AND the `isAdvisor` flag.
3. Do NOT expand access for teaching-specific tools like `get_course_roster`, `grade_assignment`, or `publish_course_material`.

### D. Verify
1. Run `npx tsc --noEmit` — 0 errors.

## Acceptance Criteria
- `isAdvisor Boolean @default(false)` on User model
- Morgan seeded with `isAdvisor: true`
- `get_advisee_list`, `draft_recommendation`, `check_degree_audit` accessible to users where `isAdvisor === true` (any role)
- Teaching-only tools remain EDUCATOR + ADMIN only
- Non-advisor STAFF users cannot access advisor tools
- 0 TypeScript errors
```

---

## PROMPT 3: Personal Task Manager

```
Read `the-sandbox/CLAUDE.md` first for project conventions. Pay special attention to:
- Prisma v7 patterns (PrismaPg adapter, import from `../generated/prisma`)
- Auth guard pattern (`requireRequestUser` for all-role routes)
- Route pattern (thin handlers: auth → parse → call lib → return, wrapped in `withErrorHandling`)
- UI standard (`PageHeader`, `max-w-6xl`, `border rounded-2xl shadow-sm` cards, `font-extrabold` headings, `size-X` icons, lucide-react only)

Then read `the-sandbox/ARCHITECTURE-STAFF-ALL-IN.md` — focus on **Step 3: Personal Task Manager**.

## Context

Staff action items live in 3 siloed places (briefing action queue, committee minutes, Sandy recommendations). There's no personal to-do list. Users still need external tools for task tracking.

## Task — Build in this order:

### 1. Schema
Add the `Task` model to `prisma/schema.prisma`:
```prisma
model Task {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  title       String
  description String?   @db.Text
  priority    String    @default("P2")
  status      String    @default("open")
  dueDate     DateTime?
  tags        String[]
  source      String    @default("manual")
  sourceId    String?
  completedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([userId, status])
  @@index([userId, dueDate])
}
```
Add the reverse relation on User. Run `npx prisma migrate dev --name add-task-model && npx prisma generate`.

### 2. API Routes (5 routes)
Create these routes following the thin handler pattern with `withErrorHandling`:

- `app/api/tasks/route.ts` — GET (list with filters: status, priority, tags, dueDate range) + POST (create)
- `app/api/tasks/[id]/route.ts` — PATCH (update) + DELETE
- `app/api/tasks/bulk/route.ts` — POST (bulk status update)

All use `requireRequestUser` (tasks are available to ALL roles, not just staff). Tasks are private — users can only see/edit their own.

### 3. Page: `/tasks`
Create `app/tasks/page.tsx`:
- Use `PageHeader` with title "My Tasks"
- Quick-add bar at top: text input + optional date picker + Enter to create
- Filter bar: status (open/done/all), priority (P0-P3), tags
- Task list grouped into sections: "Overdue" (red accent), "Today" (bold), "This Week", "Later", "Done" (collapsed by default)
- Each task: checkbox to complete, title, priority badge, due date, tags. Click to expand for inline editing.
- Bulk actions: select multiple → mark done, change priority, delete
- Empty state: "Nothing on your plate. Sandy can suggest tasks based on your briefing."
- Standard card styling: `border rounded-2xl shadow-sm`

### 4. Components
- `app/components/tasks/TaskList.tsx` — reusable grouped task list
- `app/components/tasks/TaskQuickAdd.tsx` — inline creation bar
- `app/components/tasks/TaskCard.tsx` — individual task with checkbox + inline edit

### 5. Sandy Tools
Create `app/lib/agent/tools/task-tools.ts` with 3 tools:
- `create_task` — creates a task from Sandy conversation ("remind me to review the budget by Friday")
- `list_tasks` — returns user's open tasks, optionally filtered
- `complete_task` — marks a task as done by ID or title match

Register these in `app/lib/agent/tool-registry.ts`, available to all roles.

### 6. Cross-Pollination
- Read `app/components/staff/StaffHomepage.tsx` — add a "My Tasks" summary card showing overdue count + due-today count with a "View All →" link to `/tasks`
- Read `app/components/Header.tsx` — add "My Tasks" to the quick links array (all roles, use `CheckSquare` icon from lucide-react). Include a badge showing overdue count.
- Read `app/staff/committees/[id]/page.tsx` (or wherever committee action items are displayed) — add an "Add to My Tasks" button on each action item that creates a Task with `source: 'committee'` and `sourceId` linking to the committee action.

### 7. Verify
- `npx tsc --noEmit` — 0 errors
- `npm run build` — should succeed

## Acceptance Criteria
- Task model exists with correct fields and indexes
- CRUD API works (create, list with filters, update, delete, bulk update)
- `/tasks` page renders with grouped sections and quick-add
- Sandy can create, list, and complete tasks via tool calls
- Staff Homepage shows "My Tasks" summary card
- Header has "My Tasks" quick link with overdue badge
- Committee action items have "Add to My Tasks" button
- 0 TypeScript errors
```

---

## PROMPT 5: Notification Preferences

```
Read `the-sandbox/CLAUDE.md` first for project conventions.

Then read `the-sandbox/ARCHITECTURE-STAFF-ALL-IN.md` — focus on **Step 5: Notification Preferences**.

## Context

The notification system has 8 event types (COMMENT_ON_TOOL, COMMENT_REPLY, UKNOW_ALERT, COURSE_MAP_UPDATED, etc.) but no preferences. Users get every notification with no way to control what they receive.

## Task

### 1. Schema
Add `NotificationPreference` model to `prisma/schema.prisma`:
```prisma
model NotificationPreference {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  type       String
  enabled    Boolean  @default(true)
  channel    String   @default("in_app")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([userId, type])
}
```
Add reverse relation on User. Migrate + generate.

### 2. API Routes
Create `app/api/notifications/preferences/route.ts`:
- GET — returns user's preferences (auto-create defaults if none exist for that user). Default: all types enabled, channel "in_app".
- PUT — bulk update preferences (accepts array of `{ type, enabled, channel }`)

Use `requireRequestUser`.

### 3. Settings UI
Read the current `app/settings/page.tsx`. Add a "Notifications" section (or tab if tabs exist).

Display a grid/table:
- Rows: one per notification type, with human-friendly labels (e.g., "Comments & Replies", "UKNow Alerts", "Course Updates", "Live Room Activity", "Staff Alerts")
- Columns: "In-App" | "Email" | "Off" — radio buttons per row
- "Staff Alerts (Critical)" row is locked on — P0 alerts cannot be disabled (enforce in UI)
- Optional: Email Digest frequency selector (Off / Daily / Weekly) — store as a preference with type "EMAIL_DIGEST_FREQUENCY"

Create `app/components/settings/NotificationPreferences.tsx` for the preference grid.

### 4. Wire Into Notification Creation
Read `app/api/notifications/route.ts` (or wherever notifications are created). Before creating a notification, check the user's preference for that type. If `channel === 'off'` and `enabled === false`, skip creation.

Note: actual email sending is future work (requires Azure). For now, just store the preference — the infrastructure is ready for when email is wired in.

### 5. Verify
- `npx tsc --noEmit` — 0 errors

## Acceptance Criteria
- `NotificationPreference` model in schema with `@@unique([userId, type])`
- GET preferences auto-creates defaults if none exist
- PUT preferences bulk-updates successfully
- Settings page shows notification grid with radio toggles
- P0/critical staff alerts cannot be turned off in UI
- Notification creation respects preferences (skips if disabled)
- 0 TypeScript errors
```

---

## PROMPT 10: Scheduled Communications

```
Read `the-sandbox/CLAUDE.md` first for project conventions.

Then read `the-sandbox/ARCHITECTURE-STAFF-ALL-IN.md` — focus on **Step 10: Scheduled Communications**.

## Context

Communications can only be sent immediately after approval. Staff can't draft Friday and schedule for Monday 9am.

## Task

### 1. Schema
Add two nullable fields to the existing `Communication` model in `prisma/schema.prisma`:
```prisma
scheduledAt   DateTime?
scheduledBy   String?
```
Migrate + generate.

### 2. Schedule API
Create `app/api/staff/communications/[id]/schedule/route.ts`:
- POST — set `scheduledAt` and `scheduledBy` on an APPROVED communication. Validate that the communication is in APPROVED status. Use `requireStaffOrAdminUser`.
- DELETE (or POST with `{ cancel: true }`) — clear `scheduledAt` and `scheduledBy`.

### 3. CRON Route
Create `app/api/cron/send-scheduled-communications/route.ts`:
- GET (protected by `verifyCronSecret`)
- Query: all Communications where `status = 'APPROVED'` AND `scheduledAt IS NOT NULL` AND `scheduledAt <= NOW()`
- For each match: execute the existing send logic (look at how the current `/api/staff/communications/[id]/send` route works and reuse that service function). Update status to SENT, set `sentAt`.
- Return count of sent communications.

### 4. UI Changes
Read `app/staff/communications/page.tsx` (or the communication detail view). Find where the "Send" button is rendered for APPROVED communications.
- Add a "Schedule" button next to "Send Now"
- "Schedule" opens a datetime picker (date + time). On confirm, POST to the schedule API.
- After scheduling, show "Scheduled for [date] at [time]" with a "Cancel Schedule" link.
- In the communications list, scheduled items should show a clock icon and the scheduled time.

### 5. Briefing Integration
Read `app/lib/staff/briefing-service.ts`. In the briefing narrative builder, query for communications with `scheduledAt` in the next 24 hours. Include in the briefing: "You have N communications scheduled to go out today."

### 6. Verify
- `npx tsc --noEmit` — 0 errors

## Acceptance Criteria
- `scheduledAt` and `scheduledBy` fields on Communication model
- Schedule API validates APPROVED status before accepting
- CRON route finds and sends due communications
- CRON route is protected by `verifyCronSecret`
- UI shows "Schedule" option alongside "Send Now"
- Scheduled communications show datetime and cancel option
- Briefing mentions upcoming scheduled communications
- 0 TypeScript errors
```

---

## PROMPT 4: Export & Reporting

```
Read `the-sandbox/CLAUDE.md` first for project conventions.

Then read `the-sandbox/ARCHITECTURE-STAFF-ALL-IN.md` — focus on **Step 4: Export & Reporting**.

## Context

No export capability exists in the staff experience. Budget reports, action queues, committee minutes, and briefing snapshots are trapped in the UI. Staff can't share data with anyone not logged in.

## Task

### 1. Export Service
Create `app/lib/export-service.ts`:

```typescript
interface ExportColumn {
  key: string
  label: string
  format?: 'date' | 'currency' | 'percent'
}

function generateCSV(data: Record<string, unknown>[], columns: ExportColumn[]): string
```

CSV generation using string concatenation — no external dependency needed. Handle proper escaping (commas, quotes, newlines in values). Include BOM for Excel compatibility.

For PDF: start with CSV only. PDF can be added later. Don't add a dependency for it now.

### 2. Export API Routes
Create these routes under `app/api/export/`. All use `requireStaffOrAdminUser`:

- `app/api/export/actions/route.ts` — GET: query the user's StaffActionItems (pending), format as CSV with columns: Title, Priority, Type, Department, Deadline, Age, Status.
- `app/api/export/budget/route.ts` — GET: query budget data from the briefing service, format as CSV with columns: Category, Budgeted, Spent, Remaining, Variance%.
- `app/api/export/committees/[id]/actions/route.ts` — GET: query committee action items, format as CSV with columns: Title, Assignee, Due Date, Status, Committee.
- `app/api/export/committees/[id]/minutes/[meetingId]/route.ts` — GET: query meeting minutes, return as plain text (or markdown) with `Content-Type: text/plain` and download headers.

All routes set `Content-Disposition: attachment; filename="[descriptive-name]-[timestamp].csv"` headers.

### 3. Reusable ExportButton Component
Create `app/components/ExportButton.tsx`:
- Small icon button using `Download` from lucide-react (`size-4`)
- Props: `href` (export API URL), `label` (tooltip text), optional `className`
- On click: triggers download via `window.location.href = href` or `<a download>` pattern
- Minimal styling — fits in card header areas

### 4. Wire Into Staff Pages
- Read `app/components/staff/StaffHomepage.tsx` — add ExportButton to the action queue card and budget pulse card headers
- Read `app/staff/committees/[id]/page.tsx` (or committee detail view) — add ExportButton to the action items section and minutes section

### 5. Verify
- `npx tsc --noEmit` — 0 errors

## Acceptance Criteria
- `generateCSV` handles escaping, BOM, date/currency formatting
- Action queue exports as CSV with correct columns
- Budget data exports as CSV with correct columns
- Committee action items export as CSV
- Committee minutes export as text/markdown
- ExportButton component is reusable and minimal
- Staff Homepage and Committee pages have export buttons
- All export routes use `requireStaffOrAdminUser`
- 0 TypeScript errors
```

---

## PROMPT 6: Multi-Level Approval Workflows

```
Read `the-sandbox/CLAUDE.md` first for project conventions.

Then read `the-sandbox/ARCHITECTURE-STAFF-ALL-IN.md` — focus on **Step 6: Multi-Level Approval Workflows**.

## Context

Communications have a flat approval: drafter submits → one reviewer approves → done. For "All Staff" announcements, Morgan needs VP sign-off. The system has no concept of approval chains.

## Task

### 1. Schema
Add `ApprovalStep` model to `prisma/schema.prisma`:
```prisma
model ApprovalStep {
  id               String    @id @default(cuid())
  communicationId  String
  communication    Communication @relation(fields: [communicationId], references: [id])
  stepOrder        Int
  approverEmail    String
  status           String    @default("pending")
  comment          String?   @db.Text
  decidedAt        DateTime?
  createdAt        DateTime  @default(now())

  @@index([communicationId, stepOrder])
}
```
Add reverse relation on Communication. Migrate + generate.

### 2. Approval Chain Config
Create `app/lib/staff/approval-chains.ts`:
- Define chain templates mapped to audience type:
  - `'ALL_STAFF'`: Director Review → VP Approval (2 steps)
  - `'COLLEGE'`: Director Review → Dean Approval (2 steps)
  - `'DEPT'`: Director Review only (1 step)
  - `'EMAILS'`: No approval chain needed (direct send)
- Export a function `getApprovalChain(audienceType: string)` that returns the chain template.

### 3. Approval Service
Create `app/lib/staff/approval-service.ts`:
- `createApprovalChain(communicationId, audienceType, submitterEmail)` — creates ApprovalStep records. If submitter matches a step role (e.g., director submitting), auto-approve that step.
- `advanceApproval(stepId, decision: 'approved' | 'rejected', comment?)` — updates step status + decidedAt. If approved and more steps remain, next step becomes active. If all steps approved, update Communication status to APPROVED. If rejected, revert Communication to DRAFT.
- `getApprovalStatus(communicationId)` — returns all steps with current status.
- `getStaleApprovals(hoursThreshold: number)` — finds steps pending longer than threshold.

### 4. Modify Existing Submit/Approve Routes
Read `app/api/staff/communications/[id]/submit/route.ts` — modify to call `createApprovalChain` when submitting.
Read `app/api/staff/communications/[id]/approve/route.ts` — modify to call `advanceApproval` instead of directly changing status.

### 5. New Route: Approval Status
Create `app/api/staff/communications/[id]/approval-status/route.ts`:
- GET — returns `getApprovalStatus(communicationId)` (the chain with step statuses)

### 6. UI: Approval Timeline Component
Create `app/components/staff/ApprovalTimeline.tsx`:
- Visual step indicator showing each approval step: name, status (pending/approved/rejected), approver, decidedAt
- Approved steps: green check. Current step: pulsing blue. Pending: gray. Rejected: red X with comment.

### 7. Wire Into Communications Page
Read `app/staff/communications/page.tsx`:
- On "Submit for Review": show the approval chain preview ("This will require: Director Review → VP Approval") before confirming
- On communication detail: show ApprovalTimeline component
- For pending approvals where current user is the approver: show "Approve" / "Request Revisions" buttons

### 8. Wire Into Action Queue
Read `app/lib/staff/action-queue-service.ts` — add pending approval steps as items in the action queue so approvers see them on their homepage.

### 9. Verify
- `npx tsc --noEmit` — 0 errors

## Acceptance Criteria
- `ApprovalStep` model in schema
- Chain templates exist for 4 audience types
- Submit creates approval chain with correct steps
- Director auto-approves their own step when submitting
- VP approval advances to APPROVED status
- Rejection reverts to DRAFT with comment
- Approval status API returns full chain
- ApprovalTimeline component renders step progress
- Communications page shows chain preview on submit
- Pending approvals appear in action queue
- 0 TypeScript errors
```

---

## PROMPT 8: Unified Action Center

```
Read `the-sandbox/CLAUDE.md` first for project conventions.

Then read `the-sandbox/ARCHITECTURE-STAFF-ALL-IN.md` — focus on **Step 8: Unified Action Center**.

## Context

Staff action items live in 4+ separate places:
1. `StaffActionItem` — briefing action queue
2. Committee action items — committee meeting pages
3. `ApprovalStep` — communication approval chain (built in Step 6)
4. `Task` — personal tasks (built in Step 3)

Morgan visits 3-4 pages daily to know what needs her attention. This step aggregates everything into one page.

## Prerequisites
Steps 3 (Task model) and 6 (ApprovalStep model) must be complete. If those models don't exist in the schema yet, stop and note the dependency.

## Task

### 1. Aggregation Service
Create `app/lib/staff/action-center-service.ts`:

Define a `UnifiedAction` interface:
```typescript
interface UnifiedAction {
  id: string
  source: 'action_queue' | 'committee' | 'approval' | 'task'
  sourceId: string
  title: string
  description?: string
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  category: string
  dueDate?: Date
  status: 'pending' | 'overdue' | 'done'
  actionUrl: string
  resolveUrl?: string
}
```

Implement `getUnifiedActions(userId: string, userEmail: string, filters?)`:
1. Query `StaffActionItem` where `assigneeId = userId` and `status = 'pending'`
2. Query committee action items where assignee = userId and status != 'completed' (read existing committee service to find the right query)
3. Query `ApprovalStep` where `approverEmail = userEmail` and `status = 'pending'`
4. Query `Task` where `userId = userId` and `status IN ('open', 'in_progress')`
5. Normalize all into `UnifiedAction[]`, sort by priority then dueDate
6. Mark items as 'overdue' if dueDate < now

Also implement `resolveAction(source, sourceId, resolution)` — delegates to the correct service based on source type.

### 2. API Routes
Create `app/api/staff/action-center/route.ts`:
- GET — returns unified actions with optional filters (source, priority, status). Use `requireStaffOrAdminUser`.

Create `app/api/staff/action-center/resolve/route.ts`:
- POST — inline resolution. Body: `{ source, sourceId, resolution, comment? }`. Delegates to `resolveAction`. Use `requireStaffOrAdminUser`.

### 3. Action Center Page
Create `app/staff/actions/page.tsx`:
- Use `PageHeader` with title "Action Center"
- Role guard: redirect if not STAFF or ADMIN
- Filter bar: source (all/action queue/committee/approval/task), priority, status
- Grouped sections: "Overdue", "Due Today", "This Week", "Later", "Completed Today"
- Each item shows: checkbox/action button, title, priority badge, category tag, source icon, due date, age
- Inline resolution: simple items (approve/reject, mark done) resolve without navigation. Complex items show a link to the source page.
- Include the ExportButton (from Step 4 if it exists, otherwise a simple download link)

### 4. Components
Create `app/components/staff/UnifiedActionList.tsx` — the grouped, filterable action list (reusable on page and homepage)
Create `app/components/staff/ActionCenterCard.tsx` — slim summary card for StaffHomepage showing counts by source + "View All →" link

### 5. Wire Into Staff Homepage
Read `app/components/staff/StaffHomepage.tsx`. Replace (or supplement) the existing "Action Queue" card with `ActionCenterCard` that shows aggregated counts from all 4 sources.

### 6. Navigation
Read `app/components/Header.tsx`. Add "Action Center" to the STAFF nav items array (alongside Policies, Communications, Committees, Surveys). Route: `/staff/actions`.

### 7. Verify
- `npx tsc --noEmit` — 0 errors

## Acceptance Criteria
- Aggregation service queries all 4 sources and normalizes into UnifiedAction
- `/staff/actions` page shows all pending work in one sorted, grouped list
- Filters work: by source, priority, status
- Inline resolution works for simple actions
- Complex actions link to source page
- Staff Homepage shows ActionCenterCard with aggregated counts
- Header nav includes "Action Center" for STAFF + ADMIN
- 0 TypeScript errors
```

---

## PROMPT 9: Internal Document Library

```
Read `the-sandbox/CLAUDE.md` first for project conventions. Pay special attention to:
- Prisma v7 patterns
- Auth guard pattern
- Route pattern (thin handlers with `withErrorHandling`)
- UI standard (`PageHeader`, `max-w-6xl`, `border rounded-2xl shadow-sm` cards)
- Azure Blob Storage client exists at `app/lib/azure-blob-storage.ts` — use it if Azure env vars are configured, otherwise fall back to DB storage

Then read `the-sandbox/ARCHITECTURE-STAFF-ALL-IN.md` — focus on **Step 9: Internal Document Library**.

## Context

No shared document storage exists. File Cleaner renames files. Survey Intelligence has a project-scoped Knowledge Vault. Messaging has file attachments buried in threads. There's no "shared drive" for institutional documents.

## Task

### 1. Schema
Add `Document` model to `prisma/schema.prisma`:
```prisma
model Document {
  id            String    @id @default(cuid())
  uploaderId    String
  uploader      User      @relation(fields: [uploaderId], references: [id])
  title         String
  description   String?   @db.Text
  fileName      String
  fileSize      Int
  mimeType      String
  storageKey    String
  fileContent   Bytes?
  tags          String[]
  visibility    String    @default("private")
  department    String?
  version       Int       @default(1)
  parentId      String?
  downloadCount Int       @default(0)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([uploaderId])
  @@index([visibility, department])
}
```
Note: `fileContent Bytes?` is the DB fallback for when Azure Blob isn't configured. `storageKey` stores either the Azure blob key or a sentinel like `"db"` when using DB storage.

Add reverse relation on User. Migrate + generate.

### 2. Document Service
Create `app/lib/document-service.ts`:
- `uploadDocument(uploaderId, file: Buffer, metadata)` — if Azure Blob env vars exist, upload to blob and store key. Otherwise, store in `fileContent`. Set `storageKey` accordingly.
- `downloadDocument(documentId, requesterId)` — check visibility permissions, increment downloadCount, return file buffer + metadata.
- `searchDocuments(query, filters: { tags?, visibility?, department? })` — text search on title + description, filter by visibility/department/tags.
- `createNewVersion(documentId, file: Buffer, uploaderId)` — create new Document with incremented version, set parentId to original.
- `getVersionHistory(documentId)` — follow parentId chain to get all versions.
- `deleteDocument(documentId, requesterId)` — only uploader can delete.

Visibility rules:
- `'private'` — only uploader can see/download
- `'department'` — users in same department can see/download
- `'all_staff'` — all authenticated users can see/download

### 3. API Routes (5)
All use `requireRequestUser` (documents available to all roles):

- `app/api/documents/route.ts` — GET (list with filters) + POST (upload via FormData)
- `app/api/documents/[id]/route.ts` — GET (metadata) + PATCH (update title/tags/visibility) + DELETE
- `app/api/documents/[id]/download/route.ts` — GET (download file with proper Content-Type and Content-Disposition)
- `app/api/documents/[id]/versions/route.ts` — GET (version history) + POST (upload new version via FormData)
- `app/api/documents/search/route.ts` — GET (search by query, tags, visibility)

### 4. Document Library Page
Create `app/documents/page.tsx`:
- Use `PageHeader` with title "Document Library"
- Upload button (top right) → opens upload modal
- Search bar + tag filter + visibility tabs (My Files / Department / All)
- Document cards grouped by tag category, showing: file icon (by mimeType), title, version badge, file size, upload date, uploader name
- Click card → expand detail panel or modal with description, version history, download button

### 5. Components
- `app/components/documents/DocumentCard.tsx` — file card with metadata
- `app/components/documents/UploadModal.tsx` — upload form: file picker, title, description, tags (multi-select or free-text chips), visibility radio
- `app/components/documents/DocumentPicker.tsx` — reusable picker modal for embedding in other pages (select a document from the library)

### 6. Sandy Tools
Create `app/lib/agent/tools/document-tools.ts`:
- `search_documents` — search by query + tags, return titles and IDs
- `get_document_info` — return metadata for a specific document

Register in `app/lib/agent/tool-registry.ts`, available to all roles.

### 7. Navigation
Read `app/components/Header.tsx`. Add "Documents" to quick links (all roles, use `FileText` icon from lucide-react).

### 8. Verify
- `npx tsc --noEmit` — 0 errors

## Acceptance Criteria
- Document model in schema with DB fallback for file storage
- Upload works (stores in Azure Blob or DB depending on config)
- Download returns correct file with proper headers
- Visibility rules enforced (private/department/all_staff)
- Version upload creates new Document linked via parentId
- Search works by title/description text + tag filters
- Library page shows documents grouped with proper cards
- Upload modal works with file picker + metadata
- Sandy can search and retrieve document info
- Header has "Documents" quick link
- 0 TypeScript errors
```

---

## Post-Build Verification Prompt

```
Read `the-sandbox/CLAUDE.md` and `the-sandbox/ARCHITECTURE-STAFF-ALL-IN.md`.

All 10 steps of the Staff "All-In" architecture should now be implemented. Run a verification pass:

1. Run `npx tsc --noEmit` — report any errors and fix them.
2. Run `npm run build` — report any build failures and fix them.
3. Check each step's acceptance criteria against the codebase:
   - Step 1: STAFF in hub-config visibleTo arrays
   - Step 2: User.title field, Sandy prompt injection
   - Step 3: Task model, API, page, Sandy tools, cross-pollination
   - Step 4: Export service, API routes, ExportButton on staff pages
   - Step 5: NotificationPreference model, Settings UI, preference checks
   - Step 6: ApprovalStep model, chain config, multi-step approval flow
   - Step 7: User.isAdvisor, 3 faculty tools expanded
   - Step 8: Action center service, aggregated page, homepage card, nav item
   - Step 9: Document model, upload/download/search, library page, Sandy tools
   - Step 10: scheduledAt/scheduledBy fields, schedule API, CRON route, UI

4. For any missing or broken items, fix them.
5. Update `ARCHITECTURE-STAFF-ALL-IN.md` — change Status from "Proposed" to "Complete" and add a completion date.
6. Run final `npx tsc --noEmit` and `npm run build` to confirm everything is clean.

Report a summary of what was verified, what was fixed, and final build status.
```
