// ─── Staff Alert Service ─────────────────────────────────────
// Campus-wide, department, and individual alerts for staff.
// Alerts are dismissible per-user via StaffBriefingDismissal.

import { prisma } from '../prisma'
import type { StaffAlert } from '../../generated/prisma'

// ─── Types ──────────────────────────────────────────────────

export interface CreateAlertInput {
  scope: 'campus-wide' | 'department' | 'individual'
  targetUserId?: string
  targetDept?: string
  alertType: string   // "weather" | "system-outage" | "policy-change" | "safety" | "maintenance" | "deadline" | "custom"
  severity?: 'critical' | 'warning' | 'info'
  title: string
  body: string
  actionUrl?: string
  expiresAt?: Date
  source?: string
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  info: 2,
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Returns active alerts for a user: campus-wide + department-scoped + individual.
 * Excludes expired alerts and alerts the user has dismissed.
 * Sorted: critical → warning → info, then newest first.
 */
export async function getActiveAlerts(userId: string): Promise<StaffAlert[]> {
  // Fetch user to determine department
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { department: true },
  })

  const now = new Date()

  // Get IDs the user has already dismissed
  const dismissals = await prisma.staffBriefingDismissal.findMany({
    where: { userId, itemType: 'alert' },
    select: { itemId: true },
  })
  const dismissedIds = new Set(dismissals.map(d => d.itemId))

  // Fetch active alerts matching user's scope
  const alerts = await prisma.staffAlert.findMany({
    where: {
      isActive: true,
      OR: [
        { scope: 'campus-wide' },
        ...(user?.department
          ? [{ scope: 'department' as const, targetDept: user.department }]
          : []),
        { scope: 'individual', targetUserId: userId },
      ],
    },
    orderBy: { createdAt: 'desc' },
  })

  // Filter out expired and dismissed
  return alerts
    .filter(a => !dismissedIds.has(a.id))
    .filter(a => !a.expiresAt || a.expiresAt > now)
    .sort((a, b) => {
      const sevA = SEVERITY_ORDER[a.severity] ?? 2
      const sevB = SEVERITY_ORDER[b.severity] ?? 2
      if (sevA !== sevB) return sevA - sevB
      return b.createdAt.getTime() - a.createdAt.getTime()
    })
}

/**
 * Create a new staff alert.
 */
export async function createAlert(input: CreateAlertInput): Promise<StaffAlert> {
  return prisma.staffAlert.create({
    data: {
      scope: input.scope,
      targetUserId: input.targetUserId ?? null,
      targetDept: input.targetDept ?? null,
      alertType: input.alertType,
      severity: input.severity ?? 'info',
      title: input.title,
      body: input.body,
      actionUrl: input.actionUrl ?? null,
      expiresAt: input.expiresAt ?? null,
      isActive: true,
      source: input.source ?? 'simulated',
    },
  })
}

/**
 * Dismiss an alert for a specific user.
 * Creates a StaffBriefingDismissal record — the alert remains active for others.
 */
export async function dismissAlert(userId: string, alertId: string): Promise<void> {
  await prisma.staffBriefingDismissal.upsert({
    where: {
      userId_itemType_itemId: {
        userId,
        itemType: 'alert',
        itemId: alertId,
      },
    },
    create: {
      userId,
      itemType: 'alert',
      itemId: alertId,
    },
    update: {}, // already dismissed — no-op
  })
}
