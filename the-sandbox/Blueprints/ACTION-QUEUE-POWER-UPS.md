# Blueprint: Action Queue Power-Ups

> **Sprint Scope:** Turn the staff action queue from a passive viewing list into a speed-triage machine with batch operations, snooze, inline audit context, post-approval flow, and escalation routing.
> **Depends On:** Scope A (complete) — homepage layout changes landed.
> **Estimated Size:** Medium-Large (5 handoff prompts, 10 tasks)
> **Audit Steps Addressed:** 3 (Action Triage), 5 (Communications approval chain), 6 (Task Management)
> **Origin:** Morgan Rivera day-in-the-life UX audit, 2026-03-26

---

## Context

The action queue (`ActionQueueCard.tsx`) is the primary triage surface for staff. Morgan processes ~12 items per morning. The current UX requires clicking each item individually to resolve, with no way to batch-approve routine items, snooze non-urgent items, or see submitter context without opening the detail panel. The audit scored Action Triage at 6/10.

### Current Architecture (What Exists)

**Component tree:**
```
ActionQueueCard.tsx (230 lines)
  ├── ActionItemRow.tsx (153 lines) — per-item row with hover actions
  ├── ActionItemDetail.tsx (199 lines) — right-side slide-out panel
  ├── DelegateModal.tsx (94 lines) — center modal for delegation
  └── PriorityBadge.tsx (25 lines) — colored priority pill
```

**Service:** `app/lib/staff/action-queue-service.ts` (394 lines)
- `getActionQueue(userId, opts)` — filtered list with pagination
- `getActionQueueCounts(userId)` — lightweight counts for badges
- `resolveAction(itemId, resolution)` — approve/reject/flag/dismiss + audit log + budget side-effect
- `delegateAction(itemId, input)` — creates new item for delegatee
- `batchResolve(itemIds, resolution)` — loops resolveAction per item
- `createAction(input)` — manual creation
- `createApprovalActionItem(...)` — system-generated communication approvals
- `resolveApprovalActionItems(...)` — bulk resolve by externalId

**API routes (6):**
- `GET /api/staff/actions` — list with filters
- `GET /api/staff/actions/counts` — badge counts
- `GET /api/staff/actions/{id}` — single item with relations
- `POST /api/staff/actions/{id}/resolve` — resolve one
- `POST /api/staff/actions/{id}/delegate` — delegate one
- `POST /api/staff/actions/batch-resolve` — batch resolve

**Schema:** `StaffActionItem` model — assignee, submitter, delegatedTo relations. Fields: type, priority, status, title, description, amount, department, deadline, metadata, resolution, resolvedAt, source, externalId.

**Known issues:**
- Delegate route accepts `targetEmail` but passes it directly as `delegatedToId` without email-to-ID resolution
- No snooze capability (no `snoozedUntil` field)
- No inline submitter/age display on rows — requires opening detail panel
- No source-typed labels ("Communication Approval" vs generic type icon)
- No post-approval flow (user is stranded after resolving)
- Batch resolve API exists but no UI for it

---

## What Changes

### 1. Snooze Capability

**Schema:** Add `snoozedUntil: DateTime?` to `StaffActionItem`.

**Service:** Add `snoozeAction(itemId, until)` — sets `snoozedUntil`, excludes from default queries. Add `getActionQueue` filter to exclude `snoozedUntil > now`.

**API:** New route `POST /api/staff/actions/{id}/snooze` with body `{ hours: number }`.

**UI:** Snooze button in batch bar (24h default) and in detail panel action buttons.

### 2. Checkbox Selection + Floating Batch Bar

**ActionItemRow:** Add checkbox column (left of priority badge). Controlled by parent.

**ActionQueueCard:** Track `selectedIds: Set<string>`. Show "Select All" toggle in header. When `selectedIds.size > 0`, render `FloatingBatchBar`.

**FloatingBatchBar (NEW):** Fixed bottom bar with:
- "{N} selected" count
- "Approve All" button (emerald) — batch resolve as approved
- "Snooze 24h" button (amber) — batch snooze
- "Delegate" button (blue) — opens DelegateModal for batch
- "Clear" button (gray) — deselect all

Confirmation modal before batch approve if any selected item is `type='purchase-approval'` or `type='hr-action'` (audit-sensitive).

### 3. Inline Audit Context on Rows

**ActionItemRow:** Add below title line:
- Submitter name (if present): "From: {submitter.name}" in `text-xs text-gray-400`
- Age: "3d ago" / "5h ago" / "just now" in `text-xs text-gray-400`
- Source-typed label replacing generic type icon text: "Purchase Approval", "Communication Approval", "Room Request", "Budget Review", "Document Review", "HR Action", "Escalation"

### 4. Post-Approval Toast + "Next Item?" Flow

After resolving an item (single or from detail panel):
- Show toast: "Item approved. {N} remaining." with "Next item >" action button
- "Next item" scrolls to and highlights the next highest-priority pending item
- If detail panel is open: auto-advance to next item instead of closing

### 5. Delegation Email Resolution Fix

Fix `POST /api/staff/actions/{id}/delegate`: when `targetEmail` is provided instead of `delegatedToId`, resolve email to user ID via `prisma.user.findUnique({ where: { email } })`. Return 404 if not found.

### 6. Auto-Escalation Hint

For items where `type='purchase-approval'` and `amount > 5000`, or `type='hr-action'`:
- Show amber "Escalation may be required" hint on the row
- In detail panel: "Escalate to VP" button that pre-loads Sandy with escalation context
- No new schema — uses existing metadata + amount thresholds

---

## Schema Changes

```prisma
model StaffActionItem {
  // ... existing fields ...
  snoozedUntil  DateTime?   // NEW — null = not snoozed; future date = hidden until then
}
```

Single field addition. Migration: `npx prisma migrate dev --name add-snooze-to-action-items`.

---

## API Changes

### New: `POST /api/staff/actions/{id}/snooze`
- Auth: `requireStaffOrAdminUser`
- Body: `{ hours: number }` (default 24)
- Calls `snoozeAction(id, hours, userId)`
- Returns: `{ item }`

### New: `POST /api/staff/actions/batch-snooze`
- Auth: `requireStaffOrAdminUser`
- Body: `{ itemIds: string[], hours: number }`
- Calls `batchSnooze(itemIds, hours, userId)`
- Returns: `{ snoozed: number, failed: string[] }`

### Modified: `GET /api/staff/actions`
- Add `includeSnoozed` query param (default false)
- When false: filter `snoozedUntil IS NULL OR snoozedUntil <= now`

### Modified: `POST /api/staff/actions/{id}/delegate`
- When `targetEmail` provided without `delegatedToId`: resolve email to user ID
- Return 404 if email not found

### Existing (no changes): batch-resolve, counts, single get, single resolve

---

## Component Specifications

### `FloatingBatchBar.tsx` (NEW)

```typescript
interface FloatingBatchBarProps {
  selectedCount: number
  hasAuditSensitive: boolean  // true if any selected item is purchase-approval or hr-action
  onApproveAll: () => void
  onSnooze: () => void
  onDelegate: () => void
  onClear: () => void
}
```

- Fixed bottom of ActionQueueCard (not viewport-fixed — stays within card bounds)
- `border rounded-2xl shadow-lg bg-white p-3` with `border-t border-gray-200`
- Animate in/out with `transition-all duration-200`
- Buttons: icon + label, compact size

### `BatchConfirmModal.tsx` (NEW)

```typescript
interface BatchConfirmModalProps {
  action: 'approve' | 'snooze' | 'delegate'
  count: number
  sensitiveCount: number  // how many are audit-sensitive
  onConfirm: () => void
  onCancel: () => void
}
```

- Center modal (same pattern as DelegateModal)
- Shows warning when `sensitiveCount > 0`: "This includes {N} audit-sensitive items that will be logged."
- Confirm button color matches action (emerald for approve, amber for snooze, blue for delegate)

### Modified: `ActionItemRow.tsx`

Add props:
```typescript
interface ActionItemRowProps {
  // ... existing props ...
  selected?: boolean
  onToggleSelect?: (id: string) => void
  showCheckbox?: boolean
}
```

Layout change: checkbox (16px) → priority badge → content → hover actions

New inline info below title:
```
[Purchase Approval] · From: Jane Smith · 3d ago
```

### Modified: `ActionQueueCard.tsx`

New state:
- `selectedIds: Set<string>`
- `selectAll: boolean`

New header controls:
- Checkbox for "Select All" (left of existing filter pills)
- Selected count badge when > 0

Render `FloatingBatchBar` when `selectedIds.size > 0`

### Modified: `ActionItemDetail.tsx`

New features:
- "Snooze 24h" button added to action bar
- "Escalate to VP" button for high-amount purchases / HR actions
- Post-resolve: auto-advance to next pending item instead of closing panel
- Escalation hint banner at top when applicable

---

## Data Flow

### Batch Approve Flow
```
User checks 5 items via checkboxes
  → FloatingBatchBar appears with "5 selected"
  → User clicks "Approve All"
  → If any audit-sensitive: BatchConfirmModal shown
  → On confirm: POST /api/staff/actions/batch-resolve { itemIds, status: 'approved' }
  → Service loops resolveAction() per item (audit logs + budget side-effects)
  → Response: { resolved: 5, failed: [] }
  → Client: remove resolved items from list, show toast "5 items approved. {N} remaining."
  → Clear selection
```

### Snooze Flow
```
User selects items → clicks "Snooze 24h"
  → POST /api/staff/actions/batch-snooze { itemIds, hours: 24 }
  → Service sets snoozedUntil = now + 24h on each
  → Client: remove snoozed items from visible list, show toast "3 items snoozed for 24h"
  → Items reappear after 24h (filtered by snoozedUntil <= now in GET query)
```

### Post-Approval Next-Item Flow
```
User resolves item from detail panel
  → Detail panel shows brief "Approved" confirmation (300ms green flash)
  → Auto-advances to next item in filtered list
  → If no more items: panel closes, toast "All clear!"
```

---

## Edge Cases

| Case | Handling |
|---|---|
| Select all with filters active | Only selects visible (filtered) items |
| Batch approve with mixed types | All get approved; audit-sensitive ones trigger confirm modal |
| Snooze already-snoozed item | Overwrites with new snoozedUntil |
| Delegate with invalid email | 404 error, toast "User not found" |
| Batch resolve partial failure | Toast shows "4 of 5 approved. 1 failed." |
| Detail panel open, item resolved elsewhere | Panel shows stale state; refresh on next action |
| No items remaining after batch | Empty state in ActionQueueCard, toast "All clear!" |
| Snoozed items count | Excluded from KPI counts (getActionQueueCounts filters them out) |

---

## Acceptance Criteria

1. Checkbox column on every row; "Select All" toggle in header
2. FloatingBatchBar appears when 1+ items selected with Approve All, Snooze 24h, Delegate, Clear
3. Batch approve works with confirmation modal for audit-sensitive items
4. Snooze removes items from view; they return after duration expires
5. Each row shows source-typed label, submitter name, and age inline
6. Post-approval toast with "Next item >" action button
7. Detail panel auto-advances to next item after resolve
8. Delegation route resolves email to user ID correctly
9. Escalation hint shown on high-amount purchases and HR actions
10. `npx tsc --noEmit` and `npm run lint` pass after every handoff

---

## Task Decomposition (2-Task Handoff Chains)

### Handoff 1: Schema + Snooze Service + Delegation Fix
**Task 1:** Add `snoozedUntil` field to StaffActionItem schema. Run migration. Update `getActionQueue` to exclude snoozed items by default (filter `snoozedUntil IS NULL OR snoozedUntil <= now`). Update `getActionQueueCounts` to also exclude snoozed items.
**Task 2:** Add `snoozeAction(itemId, hours, userId)` and `batchSnooze(itemIds, hours, userId)` to action-queue-service. Create `POST /api/staff/actions/{id}/snooze` and `POST /api/staff/actions/batch-snooze` routes. Fix delegation email resolution in `POST /api/staff/actions/{id}/delegate`.

### Handoff 2: Row Enhancements — Checkbox + Inline Context
**Task 3:** Add `selected`, `onToggleSelect`, `showCheckbox` props to ActionItemRow. Render checkbox left of priority badge. Add source-typed label mapping (type → human-readable label). Show submitter name and age inline below title.
**Task 4:** Add `selectedIds` state + `selectAll` toggle to ActionQueueCard header. Wire checkbox changes through to rows. Track which selected items are audit-sensitive.

### Handoff 3: Floating Batch Bar + Confirmation Modal
**Task 5:** Create `FloatingBatchBar.tsx` — renders at bottom of ActionQueueCard when selection > 0. Buttons: Approve All, Snooze 24h, Delegate, Clear. Create `BatchConfirmModal.tsx` for audit-sensitive batch operations.
**Task 6:** Wire batch bar actions to APIs. Approve All → batch-resolve. Snooze 24h → batch-snooze. Delegate → DelegateModal in batch mode. Show BatchConfirmModal when audit-sensitive items in selection. Clear selection + refetch after each batch action.

### Handoff 4: Post-Approval Flow + Detail Panel Enhancements
**Task 7:** Add post-approval toast with "Next item >" button using existing Toast system. After resolve in ActionQueueCard: show toast with remaining count + next-item action. "Next item" scrolls to and highlights next priority item.
**Task 8:** Enhance ActionItemDetail: add "Snooze 24h" to action buttons. Add auto-advance after resolve (slide to next pending item instead of closing). Add escalation hint banner for purchase approvals > $5K and HR actions. "Escalate to VP" button pre-loads Sandy with context.

### Handoff 5: Polish + Snoozed Items View
**Task 9:** Add "Snoozed" filter tab/pill to ActionQueueCard (shows snoozed items with countdown to return). Allow un-snooze (click to bring back immediately). Show snooze count badge next to filter.
**Task 10:** End-to-end UX audit: verify batch flows work with 0, 1, and many items. Verify keyboard accessibility on checkboxes. Verify mobile layout (batch bar stacks vertically on small screens). Clean up any unused imports or dead code.
