// ─── Unified Action Center Service ───────────────────────────
// Aggregates action items from 4 sources (action queue, committees,
// approval workflow, personal tasks) into a single prioritized list.

import { prisma } from '../prisma'
import type { CommitteeMember } from './committee-service'
import { advanceApproval } from './approval-service'
import { resolveAction as resolveQueueAction } from './action-queue-service'

// ── Types ────────────────────────────────────────────────────

export interface UnifiedAction {
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
  createdAt: Date
}

export interface ActionCenterFilters {
  source?: string
  priority?: string
  status?: string
}

export interface ActionCounts {
  action_queue: number
  committee: number
  approval: number
  task: number
  total: number
  overdue: number
}

// ── Priority sort order ──────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
}

// Map committee priority values to P-levels
function normalizeCommitteePriority(priority: string): 'P0' | 'P1' | 'P2' | 'P3' {
  switch (priority.toLowerCase()) {
    case 'critical':
    case 'p0':
      return 'P0'
    case 'high':
    case 'p1':
      return 'P1'
    case 'medium':
    case 'p2':
      return 'P2'
    case 'low':
    case 'p3':
      return 'P3'
    default:
      return 'P2'
  }
}

// ── Get Unified Actions ──────────────────────────────────────

export async function getUnifiedActions(
  userId: string,
  userEmail: string,
  filters?: ActionCenterFilters
): Promise<UnifiedAction[]> {
  const now = new Date()
  const actions: UnifiedAction[] = []

  // Run all 4 queries in parallel
  const [queueItems, committeeItems, approvalSteps, tasks] = await Promise.all([
    // 1. StaffActionItem (action queue)
    (!filters?.source || filters.source === 'action_queue')
      ? prisma.staffActionItem.findMany({
          where: {
            assigneeId: userId,
            status: 'pending',
            ...(filters?.priority ? { priority: filters.priority } : {}),
          },
          orderBy: [{ priority: 'asc' }, { deadline: { sort: 'asc', nulls: 'last' } }],
          take: 100,
        })
      : Promise.resolve([]),

    // 2. CommitteeActionItem (from committees user belongs to)
    (!filters?.source || filters.source === 'committee')
      ? fetchCommitteeActions(userId, filters)
      : Promise.resolve([]),

    // 3. ApprovalStep (pending approvals for this user)
    (!filters?.source || filters.source === 'approval')
      ? prisma.approvalStep.findMany({
          where: {
            approverEmail: userEmail.toLowerCase(),
            status: 'pending',
          },
          include: {
            communication: {
              select: { id: true, subject: true, type: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        })
      : Promise.resolve([]),

    // 4. Task (personal tasks)
    (!filters?.source || filters.source === 'task')
      ? prisma.task.findMany({
          where: {
            userId,
            status: { in: ['open', 'in_progress'] },
            ...(filters?.priority ? { priority: filters.priority } : {}),
          },
          orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
          take: 100,
        })
      : Promise.resolve([]),
  ])

  // Normalize action queue items
  for (const item of queueItems) {
    const dueDate = item.deadline ?? undefined
    const isOverdue = dueDate && dueDate < now
    actions.push({
      id: `aq_${item.id}`,
      source: 'action_queue',
      sourceId: item.id,
      title: item.title,
      description: item.description,
      priority: (item.priority as 'P0' | 'P1' | 'P2' | 'P3') || 'P2',
      category: item.type,
      dueDate: dueDate || undefined,
      status: isOverdue ? 'overdue' : 'pending',
      actionUrl: `/staff/actions`,
      resolveUrl: `/api/staff/action-center/resolve`,
      createdAt: item.createdAt,
    })
  }

  // Normalize committee action items
  for (const item of committeeItems) {
    const dueDate = item.dueDate ?? undefined
    const isOverdue = dueDate && dueDate < now
    actions.push({
      id: `cm_${item.id}`,
      source: 'committee',
      sourceId: item.id,
      title: item.action,
      description: item.notes ?? undefined,
      priority: normalizeCommitteePriority(item.priority),
      category: 'committee',
      dueDate: dueDate || undefined,
      status: isOverdue ? 'overdue' : 'pending',
      actionUrl: `/staff/committees`,
      resolveUrl: `/api/staff/action-center/resolve`,
      createdAt: item.createdAt,
    })
  }

  // Normalize approval steps
  for (const step of approvalSteps) {
    const comm = 'communication' in step ? (step as { communication: { id: string; subject: string | null; type: string } }).communication : null
    actions.push({
      id: `ap_${step.id}`,
      source: 'approval',
      sourceId: step.id,
      title: `Approve: ${comm?.subject ?? 'Communication'}`,
      description: `${step.approverLabel} review required for ${comm?.type ?? 'communication'}`,
      priority: 'P1',
      category: 'communication-approval',
      dueDate: undefined,
      status: 'pending',
      actionUrl: `/staff/communications`,
      resolveUrl: `/api/staff/action-center/resolve`,
      createdAt: step.createdAt,
    })
  }

  // Normalize tasks
  for (const task of tasks) {
    const dueDate = task.dueDate ?? undefined
    const isOverdue = dueDate && dueDate < now
    actions.push({
      id: `tk_${task.id}`,
      source: 'task',
      sourceId: task.id,
      title: task.title,
      description: task.description ?? undefined,
      priority: (task.priority as 'P0' | 'P1' | 'P2' | 'P3') || 'P2',
      category: task.tags?.[0] ?? 'task',
      dueDate: dueDate || undefined,
      status: isOverdue ? 'overdue' : 'pending',
      actionUrl: `/tasks`,
      resolveUrl: `/api/staff/action-center/resolve`,
      createdAt: task.createdAt,
    })
  }

  // Filter by status if requested
  let filtered = actions
  if (filters?.status === 'overdue') {
    filtered = actions.filter((a) => a.status === 'overdue')
  } else if (filters?.status === 'pending') {
    filtered = actions.filter((a) => a.status === 'pending')
  }

  // Sort: priority first (P0 > P1 > P2 > P3), then due date (earliest first)
  filtered.sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 3
    const pb = PRIORITY_ORDER[b.priority] ?? 3
    if (pa !== pb) return pa - pb

    // Due date: items with dates before items without
    if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime()
    if (a.dueDate) return -1
    if (b.dueDate) return 1

    return a.createdAt.getTime() - b.createdAt.getTime()
  })

  return filtered
}

// ── Resolve Action ───────────────────────────────────────────

export async function resolveAction(
  source: string,
  sourceId: string,
  resolution: string,
  userId: string,
  comment?: string
): Promise<{ success: boolean }> {
  switch (source) {
    case 'task': {
      await prisma.task.update({
        where: { id: sourceId },
        data: {
          status: 'done',
          completedAt: new Date(),
        },
      })
      return { success: true }
    }

    case 'action_queue': {
      const validStatuses = ['approved', 'rejected', 'flagged', 'dismissed'] as const
      const status = validStatuses.includes(resolution as typeof validStatuses[number])
        ? (resolution as typeof validStatuses[number])
        : 'approved'
      await resolveQueueAction(sourceId, {
        status,
        resolution: comment ?? undefined,
        resolvedBy: userId,
      })
      return { success: true }
    }

    case 'approval': {
      const decision = resolution === 'rejected' ? 'rejected' : 'approved'
      await advanceApproval(sourceId, decision, comment)
      return { success: true }
    }

    case 'committee': {
      await prisma.committeeActionItem.update({
        where: { id: sourceId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          notes: comment ?? undefined,
        },
      })
      return { success: true }
    }

    default:
      throw new Error(`Unknown action source: ${source}`)
  }
}

// ── Get Action Counts ────────────────────────────────────────

export async function getActionCounts(
  userId: string,
  userEmail: string
): Promise<ActionCounts> {
  const now = new Date()

  const [queueCount, approvalCount, taskCount, committeeItems] = await Promise.all([
    prisma.staffActionItem.count({
      where: { assigneeId: userId, status: 'pending' },
    }),
    prisma.approvalStep.count({
      where: { approverEmail: userEmail.toLowerCase(), status: 'pending' },
    }),
    prisma.task.count({
      where: { userId, status: { in: ['open', 'in_progress'] } },
    }),
    fetchCommitteeActionCount(userId),
  ])

  // Count overdue items across sources
  const [queueOverdue, taskOverdue] = await Promise.all([
    prisma.staffActionItem.count({
      where: { assigneeId: userId, status: 'pending', deadline: { lt: now } },
    }),
    prisma.task.count({
      where: { userId, status: { in: ['open', 'in_progress'] }, dueDate: { lt: now } },
    }),
  ])

  const total = queueCount + committeeItems + approvalCount + taskCount
  const overdue = queueOverdue + taskOverdue

  return {
    action_queue: queueCount,
    committee: committeeItems,
    approval: approvalCount,
    task: taskCount,
    total,
    overdue,
  }
}

// ── Internal Helpers ─────────────────────────────────────────

/**
 * Fetch open committee action items assigned to this user.
 * CommitteeActionItem uses ownerUserId to identify the assignee.
 */
async function fetchCommitteeActions(
  userId: string,
  filters?: ActionCenterFilters
) {
  // Get committees where user is a member
  const allCommittees = await prisma.committee.findMany({
    where: { isActive: true },
    select: { id: true, chairId: true, members: true },
  })

  const userCommitteeIds = allCommittees
    .filter((c) => {
      if (c.chairId === userId) return true
      const members = c.members as CommitteeMember[] | null
      return members?.some((m) => m.userId === userId) ?? false
    })
    .map((c) => c.id)

  if (userCommitteeIds.length === 0) return []

  return prisma.committeeActionItem.findMany({
    where: {
      committeeId: { in: userCommitteeIds },
      status: { in: ['open', 'in-progress'] },
      OR: [
        { ownerUserId: userId },
        { ownerUserId: null }, // unassigned items from user's committees
      ],
      ...(filters?.priority ? { priority: filters.priority } : {}),
    },
    orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
    take: 50,
  })
}

async function fetchCommitteeActionCount(userId: string): Promise<number> {
  const allCommittees = await prisma.committee.findMany({
    where: { isActive: true },
    select: { id: true, chairId: true, members: true },
  })

  const userCommitteeIds = allCommittees
    .filter((c) => {
      if (c.chairId === userId) return true
      const members = c.members as CommitteeMember[] | null
      return members?.some((m) => m.userId === userId) ?? false
    })
    .map((c) => c.id)

  if (userCommitteeIds.length === 0) return 0

  return prisma.committeeActionItem.count({
    where: {
      committeeId: { in: userCommitteeIds },
      status: { in: ['open', 'in-progress'] },
      OR: [
        { ownerUserId: userId },
        { ownerUserId: null },
      ],
    },
  })
}
