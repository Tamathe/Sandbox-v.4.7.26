// ─── Action Queue Service ─────────────────────────────────────
// CRUD + business logic for staff action items. Supports inline
// approve/reject/delegate/flag/dismiss from the daily briefing.

import { prisma } from '../prisma'
import { Prisma } from '../../generated/prisma'
import type { StaffActionItem } from '../../generated/prisma'

// ── Types ────────────────────────────────────────────────────

export interface ActionQueueOpts {
  status?: string[]
  type?: string[]
  priority?: string[]
  limit?: number
  offset?: number
  includeSnoozed?: boolean
}

export interface ActionQueueResult {
  items: StaffActionItem[]
  total: number
}

export interface ActionQueueCounts {
  total: number
  byPriority: Record<string, number>
  byType: Record<string, number>
  overdue: number
}

export interface ResolveInput {
  status: 'approved' | 'rejected' | 'flagged' | 'dismissed'
  resolution?: string
  resolvedBy: string
}

export interface DelegateInput {
  delegatedToId: string
  delegatedBy: string
  note?: string
}

export interface CreateActionInput {
  assigneeId: string
  submitterId?: string
  type: string
  priority?: string
  title: string
  description: string
  amount?: number
  department?: string
  deadline?: Date
  metadata?: Record<string, unknown>
}

export interface BatchResolveResult {
  resolved: number
  failed: string[]
}

// ── Priority sort order ──────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
}

// ── Functions ────────────────────────────────────────────────

/**
 * Get action items for a user, sorted by priority then deadline.
 * Defaults to pending items only, capped at 50.
 */
export async function getActionQueue(
  userId: string,
  opts?: ActionQueueOpts
): Promise<ActionQueueResult> {
  const statusFilter = opts?.status ?? ['pending']
  const limit = opts?.limit ?? 50
  const offset = opts?.offset ?? 0

  const snoozeFilter = opts?.includeSnoozed
    ? {}
    : { OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: new Date() } }] }

  const where = {
    assigneeId: userId,
    status: { in: statusFilter },
    ...(opts?.type?.length ? { type: { in: opts.type } } : {}),
    ...(opts?.priority?.length ? { priority: { in: opts.priority } } : {}),
    ...snoozeFilter,
  }

  const [items, total] = await Promise.all([
    prisma.staffActionItem.findMany({
      where,
      include: { submitter: { select: { name: true } } },
      orderBy: [
        { priority: 'asc' },
        { deadline: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'asc' },
      ],
      take: limit,
      skip: offset,
    }),
    prisma.staffActionItem.count({ where }),
  ])

  // Prisma sorts priority alphabetically (P0 < P1 < P2 < P3) which
  // matches our desired order, so the DB sort is sufficient.
  return { items, total }
}

/**
 * Lightweight counts for badge display — no full records fetched.
 */
export async function getActionQueueCounts(
  userId: string
): Promise<ActionQueueCounts> {
  const pending = await prisma.staffActionItem.findMany({
    where: {
      assigneeId: userId,
      status: 'pending',
      OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: new Date() } }],
    },
    select: { priority: true, type: true, deadline: true },
  })

  const now = new Date()
  const byPriority: Record<string, number> = {}
  const byType: Record<string, number> = {}
  let overdue = 0

  for (const item of pending) {
    byPriority[item.priority] = (byPriority[item.priority] ?? 0) + 1
    byType[item.type] = (byType[item.type] ?? 0) + 1
    if (item.deadline && item.deadline < now) overdue++
  }

  return {
    total: pending.length,
    byPriority,
    byType,
    overdue,
  }
}

/**
 * Resolve an action item: approve, reject, flag, or dismiss.
 * Logs the resolution to AssistantActionLog for audit trail.
 * If the item is a purchase-approval that gets approved, updates
 * the relevant budget snapshot's committed amount.
 */
export async function resolveAction(
  itemId: string,
  resolution: ResolveInput
): Promise<StaffActionItem> {
  const item = await prisma.staffActionItem.update({
    where: { id: itemId },
    data: {
      status: resolution.status,
      resolution: resolution.resolution ?? null,
      resolvedAt: new Date(),
    },
  })

  // Audit log
  await prisma.assistantActionLog.create({
    data: {
      userId: resolution.resolvedBy,
      actionType: `action-${resolution.status}`,
      summary: `${resolution.status} action item: ${item.title}`,
      metadata: {
        actionItemId: item.id,
        type: item.type,
        resolution: resolution.resolution ?? null,
      },
    },
  })

  // Side-effect: update budget committed amount on purchase approval
  if (item.type === 'purchase-approval' && resolution.status === 'approved' && item.amount && item.department) {
    await updateBudgetCommitted(item.assigneeId, item.department, item.amount)
  }

  return item
}

/**
 * Delegate an action item to another user.
 * Creates a copy for the delegatee and marks the original as delegated.
 */
export async function delegateAction(
  itemId: string,
  input: DelegateInput
): Promise<StaffActionItem> {
  const original = await prisma.staffActionItem.findUniqueOrThrow({
    where: { id: itemId },
  })

  // Update original to delegated status
  const updated = await prisma.staffActionItem.update({
    where: { id: itemId },
    data: {
      status: 'delegated',
      delegatedToId: input.delegatedToId,
      resolvedAt: new Date(),
      resolution: input.note ? `Delegated: ${input.note}` : 'Delegated',
    },
  })

  // Create a new action item for the delegatee
  await prisma.staffActionItem.create({
    data: {
      assigneeId: input.delegatedToId,
      submitterId: original.submitterId,
      type: original.type,
      priority: original.priority,
      title: original.title,
      description: input.note
        ? `${original.description}\n\n---\nDelegation note: ${input.note}`
        : original.description,
      amount: original.amount,
      department: original.department,
      deadline: original.deadline,
      metadata: (original.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      source: original.source,
      externalId: original.externalId,
    },
  })

  // Audit log
  await prisma.assistantActionLog.create({
    data: {
      userId: input.delegatedBy,
      actionType: 'action-delegated',
      summary: `Delegated action item "${original.title}" to another user`,
      metadata: {
        actionItemId: itemId,
        delegatedToId: input.delegatedToId,
        note: input.note ?? null,
      },
    },
  })

  return updated
}

/**
 * Create a new action item.
 */
export async function createAction(
  input: CreateActionInput
): Promise<StaffActionItem> {
  return prisma.staffActionItem.create({
    data: {
      assigneeId: input.assigneeId,
      submitterId: input.submitterId ?? null,
      type: input.type,
      priority: input.priority ?? 'P2',
      title: input.title,
      description: input.description,
      amount: input.amount ?? null,
      department: input.department ?? null,
      deadline: input.deadline ?? null,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      source: 'manual',
    },
  })
}

/**
 * Batch resolve multiple action items at once.
 * Used for Sandy's "batch-approve routine items" recommendation.
 * Processes each individually so partial failures don't block the batch.
 */
export async function batchResolve(
  itemIds: string[],
  resolution: { status: 'approved' | 'rejected'; resolvedBy: string }
): Promise<BatchResolveResult> {
  let resolved = 0
  const failed: string[] = []

  for (const id of itemIds) {
    try {
      await resolveAction(id, {
        status: resolution.status,
        resolvedBy: resolution.resolvedBy,
      })
      resolved++
    } catch {
      failed.push(id)
    }
  }

  return { resolved, failed }
}

// ── Snooze ───────────────────────────────────────────────────

/**
 * Snooze an action item for a given number of hours.
 */
export async function snoozeAction(
  itemId: string,
  hours: number,
  userId: string,
): Promise<StaffActionItem> {
  const until = new Date(Date.now() + hours * 60 * 60 * 1000)
  const item = await prisma.staffActionItem.update({
    where: { id: itemId },
    data: { snoozedUntil: until },
  })
  await prisma.assistantActionLog.create({
    data: {
      userId,
      actionType: 'action-snoozed',
      summary: `Snoozed action item for ${hours}h`,
      metadata: { itemId, hours, until: until.toISOString() },
    },
  })
  return item
}

/**
 * Un-snooze an action item immediately.
 */
export async function unsnoozeAction(itemId: string): Promise<StaffActionItem> {
  return prisma.staffActionItem.update({
    where: { id: itemId },
    data: { snoozedUntil: null },
  })
}

/**
 * Batch snooze multiple action items.
 */
export async function batchSnooze(
  itemIds: string[],
  hours: number,
  userId: string,
): Promise<{ snoozed: number; failed: string[] }> {
  const failed: string[] = []
  let snoozed = 0
  for (const id of itemIds) {
    try {
      await snoozeAction(id, hours, userId)
      snoozed++
    } catch {
      failed.push(id)
    }
  }
  return { snoozed, failed }
}

// ── Email Resolution ─────────────────────────────────────────

/**
 * Resolve a user email to a user ID. Throws if not found.
 */
export async function resolveUserByEmail(email: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  })
  if (!user) throw new Error(`User not found: ${email}`)
  return user.id
}

// ── Approval Queue Integration ───────────────────────────────

/**
 * Create action items for pending approval steps so they appear
 * in the approver's action queue / daily briefing.
 */
export async function createApprovalActionItem(
  approverEmail: string,
  communicationId: string,
  communicationSubject: string | null,
  stepLabel: string
): Promise<StaffActionItem | null> {
  // Look up the approver user by email
  const approver = await prisma.user.findUnique({
    where: { email: approverEmail.toLowerCase() },
    select: { id: true },
  })

  if (!approver) return null

  // Check for existing action item to avoid duplicates
  const existing = await prisma.staffActionItem.findFirst({
    where: {
      assigneeId: approver.id,
      type: 'communication-approval',
      status: 'pending',
      externalId: communicationId,
    },
  })

  if (existing) return existing

  return prisma.staffActionItem.create({
    data: {
      assigneeId: approver.id,
      type: 'communication-approval',
      priority: 'P1',
      title: `Approve: ${communicationSubject ?? 'Communication'}`,
      description: `${stepLabel} required for communication "${communicationSubject ?? '(no subject)'}". Review and approve or request revisions.`,
      source: 'system',
      externalId: communicationId,
      metadata: {
        communicationId,
        stepLabel,
      } as Prisma.InputJsonValue,
    },
  })
}

/**
 * Resolve (dismiss) action items for a communication when approval
 * is complete or the communication is reverted to draft.
 */
export async function resolveApprovalActionItems(
  communicationId: string,
  resolvedBy: string
): Promise<void> {
  const items = await prisma.staffActionItem.findMany({
    where: {
      type: 'communication-approval',
      status: 'pending',
      externalId: communicationId,
    },
  })

  for (const item of items) {
    await prisma.staffActionItem.update({
      where: { id: item.id },
      data: {
        status: 'approved',
        resolvedAt: new Date(),
        resolution: 'Communication approval workflow completed',
      },
    })
  }
}

// ── Internal helpers ─────────────────────────────────────────

/**
 * After a purchase-approval is approved, increment the committed
 * amount in the most recent budget snapshot for that department.
 */
async function updateBudgetCommitted(
  userId: string,
  unitName: string,
  amount: number
): Promise<void> {
  const snapshot = await prisma.staffBudgetSnapshot.findFirst({
    where: { userId, unitName },
    orderBy: { snapshotDate: 'desc' },
  })

  if (!snapshot) return

  await prisma.staffBudgetSnapshot.update({
    where: { id: snapshot.id },
    data: {
      committed: snapshot.committed + amount,
      remaining: snapshot.remaining - amount,
    },
  })
}
