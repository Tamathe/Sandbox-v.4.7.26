// ─── Staff Daily Briefing Service ────────────────────────────
// The orchestrator. Assembles a complete morning briefing from
// calendar, action queue, budget, alerts, and insights — then
// generates Sandy recommendations. One call powers the entire
// staff home dashboard.

import { prisma } from '../prisma'
import type { StaffBriefingInsight, StaffAlert, StaffActionItem } from '../../generated/prisma'
import { getCalendarProvider } from '../assistant/providers'
import type { CalendarEvent } from '../assistant/providers'
import { getActionQueue, getActionQueueCounts } from './action-queue-service'
import { getBudgetPulse } from './budget-service'
import type { BudgetPulseSummary } from './budget-service'
import { getActiveAlerts } from './alert-service'

// ─── Types ──────────────────────────────────────────────────

export interface ActionQueueSummary {
  total: number
  byPriority: { P0: number; P1: number; P2: number; P3: number }
  items: StaffActionItem[]
  oldestPending: { title: string; daysOld: number } | null
}

export interface SandyRecommendation {
  id: string
  text: string
  priority: 'high' | 'medium' | 'low'
  actionLabel?: string
  actionType?: string
  relatedItemIds?: string[]
}

export interface ScheduledCommsSummary {
  count: number
  items: { id: string; subject: string | null; scheduledFor: Date }[]
}

export interface DailyBriefing {
  greeting: string
  date: string
  schedule: CalendarEvent[]
  actionQueue: ActionQueueSummary
  insights: StaffBriefingInsight[]
  budgetPulse: BudgetPulseSummary
  alerts: StaffAlert[]
  recommendations: SandyRecommendation[]
  scheduledCommunications: ScheduledCommsSummary
}

interface BriefingContext {
  actionQueue: ActionQueueSummary
  budgetPulse: BudgetPulseSummary
  alerts: StaffAlert[]
  schedule: CalendarEvent[]
  scheduledCommunications: ScheduledCommsSummary
}

// ─── Helpers ────────────────────────────────────────────────

function buildGreeting(name: string): string {
  const hour = new Date().getHours()
  if (hour < 12) return `Good morning, ${name}.`
  if (hour < 17) return `Good afternoon, ${name}.`
  return `Good evening, ${name}.`
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.floor((b.getTime() - a.getTime()) / msPerDay)
}

// ─── Action Queue Summary ───────────────────────────────────

async function buildActionQueueSummary(userId: string): Promise<ActionQueueSummary> {
  const [{ items }, counts] = await Promise.all([
    getActionQueue(userId, { status: ['pending'], limit: 50 }),
    getActionQueueCounts(userId),
  ])

  // Find oldest pending item
  let oldestPending: ActionQueueSummary['oldestPending'] = null
  if (items.length > 0) {
    const oldest = items.reduce((prev, curr) =>
      curr.createdAt < prev.createdAt ? curr : prev
    )
    const daysOld = daysBetween(oldest.createdAt, new Date())
    if (daysOld > 0) {
      oldestPending = { title: oldest.title, daysOld }
    }
  }

  return {
    total: counts.total,
    byPriority: {
      P0: counts.byPriority['P0'] ?? 0,
      P1: counts.byPriority['P1'] ?? 0,
      P2: counts.byPriority['P2'] ?? 0,
      P3: counts.byPriority['P3'] ?? 0,
    },
    items,
    oldestPending,
  }
}

// ─── Insights ───────────────────────────────────────────────

/**
 * Fetch today's briefing insights for the user.
 * If none exist yet, returns the most recent available insights.
 * (In production, a cron job would generate these overnight.)
 */
async function getInsights(userId: string): Promise<StaffBriefingInsight[]> {
  const today = startOfDay(new Date())

  // Try today's insights first
  let insights = await prisma.staffBriefingInsight.findMany({
    where: { userId, briefingDate: today },
    orderBy: { createdAt: 'desc' },
  })

  // Fall back to most recent date with insights
  if (insights.length === 0) {
    const latest = await prisma.staffBriefingInsight.findFirst({
      where: { userId },
      orderBy: { briefingDate: 'desc' },
      select: { briefingDate: true },
    })

    if (latest) {
      insights = await prisma.staffBriefingInsight.findMany({
        where: { userId, briefingDate: latest.briefingDate },
        orderBy: { createdAt: 'desc' },
      })
    }
  }

  return insights
}

// ─── Recommendations ────────────────────────────────────────

/**
 * Generate Sandy's recommendations based on briefing context.
 * Currently returns hardcoded recommendations based on action queue state.
 * Will be upgraded to Haiku-generated recommendations in a future phase.
 */
export async function generateRecommendations(
  _userId: string,
  context: BriefingContext,
): Promise<SandyRecommendation[]> {
  const recommendations: SandyRecommendation[] = []
  let recIndex = 0

  // Recommendation: stale action items
  const staleItems = context.actionQueue.items.filter(item => {
    const age = daysBetween(item.createdAt, new Date())
    return age >= 2 && item.status === 'pending'
  })
  if (staleItems.length > 0) {
    const routineItems = staleItems.filter(
      i => i.priority === 'P2' || i.priority === 'P3'
    )
    if (routineItems.length >= 2) {
      recommendations.push({
        id: `rec-${recIndex++}`,
        text: `You have ${routineItems.length} routine items pending over 48 hours. Consider batch-approving them to clear your queue.`,
        priority: 'medium',
        actionLabel: 'Batch Approve',
        actionType: 'batch-approve-routine',
        relatedItemIds: routineItems.map(i => i.id),
      })
    }

    const highPriorityStale = staleItems.filter(
      i => i.priority === 'P0' || i.priority === 'P1'
    )
    if (highPriorityStale.length > 0) {
      const oldest = highPriorityStale[0]
      const age = daysBetween(oldest.createdAt, new Date())
      recommendations.push({
        id: `rec-${recIndex++}`,
        text: `"${oldest.title}" has been waiting ${age} days and is high priority. This may need escalation.`,
        priority: 'high',
        relatedItemIds: [oldest.id],
      })
    }
  }

  // Recommendation: critical action items needing immediate attention
  if (context.actionQueue.byPriority.P0 > 0) {
    recommendations.push({
      id: `rec-${recIndex++}`,
      text: `You have ${context.actionQueue.byPriority.P0} critical item${context.actionQueue.byPriority.P0 > 1 ? 's' : ''} requiring immediate attention.`,
      priority: 'high',
      actionLabel: 'View Critical',
      actionType: 'filter-critical',
    })
  }

  // Recommendation: budget variances
  if (context.budgetPulse.flaggedVariances.length > 0) {
    const worst = context.budgetPulse.flaggedVariances.reduce(
      (prev, curr) => (curr.percentOver > prev.percentOver ? curr : prev)
    )
    recommendations.push({
      id: `rec-${recIndex++}`,
      text: `${worst.unitName} is ${worst.percentOver}% over budget on ${worst.category}. Consider requesting a reallocation memo.`,
      priority: worst.percentOver > 20 ? 'high' : 'medium',
      actionLabel: 'View Budget',
      actionType: 'view-budget-detail',
    })
  }

  // Recommendation: overall budget tracking
  if (!context.budgetPulse.onTrack && context.budgetPulse.units.length > 0) {
    recommendations.push({
      id: `rec-${recIndex++}`,
      text: `Overall spending is ${context.budgetPulse.percentBudgetSpent}% of budget with ${context.budgetPulse.percentThroughYear}% of the fiscal year elapsed. You may want to review discretionary spending.`,
      priority: 'medium',
      actionLabel: 'Review Budget',
      actionType: 'review-budget',
    })
  }

  // Recommendation: critical alerts
  const criticalAlerts = context.alerts.filter(a => a.severity === 'critical')
  if (criticalAlerts.length > 0) {
    recommendations.push({
      id: `rec-${recIndex++}`,
      text: `There ${criticalAlerts.length === 1 ? 'is' : 'are'} ${criticalAlerts.length} critical campus alert${criticalAlerts.length > 1 ? 's' : ''} that may affect your operations today.`,
      priority: 'high',
    })
  }

  // Recommendation: scheduled communications going out today
  if (context.scheduledCommunications.count > 0) {
    recommendations.push({
      id: `rec-${recIndex++}`,
      text: `You have ${context.scheduledCommunications.count} communication${context.scheduledCommunications.count > 1 ? 's' : ''} scheduled to go out today.`,
      priority: 'low',
      actionLabel: 'View Communications',
      actionType: 'view-communications',
    })
  }

  // Recommendation: busy schedule
  if (context.schedule.length >= 5) {
    recommendations.push({
      id: `rec-${recIndex++}`,
      text: `You have ${context.schedule.length} meetings today. Consider which ones truly need your presence — Sandy can draft a delegate note if needed.`,
      priority: 'low',
    })
  }

  // Sort: high → medium → low
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
  recommendations.sort(
    (a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
  )

  // Cap at 4 recommendations
  return recommendations.slice(0, 4)
}

// ─── Scheduled Communications ───────────────────────────────

/**
 * Fetch communications scheduled to go out in the next 24 hours
 * for the given user.
 */
async function getScheduledCommunications(userId: string): Promise<ScheduledCommsSummary> {
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const items = await prisma.staffCommunication.findMany({
    where: {
      authorId: userId,
      status: 'approved',
      scheduledFor: { not: null, gte: now, lte: in24h },
    },
    select: { id: true, subject: true, scheduledFor: true },
    orderBy: { scheduledFor: 'asc' },
  })

  return {
    count: items.length,
    items: items.map(i => ({
      id: i.id,
      subject: i.subject,
      scheduledFor: i.scheduledFor!,
    })),
  }
}

// ─── Delta Types ────────────────────────────────────────────

export interface BriefingDelta {
  resolvedSince: number
  newSince: number
  meetingsCompleted: number
  meetingsRemaining: number
  budgetChanged: boolean
  newAlerts: number
  greeting: string
  narrative: string
  timeMode: 'morning' | 'afternoon' | 'evening'
  kpiCounts: {
    actionTotal: number
    actionP0: number
    actionP1: number
    meetingsToday: number
    meetingsRemaining: number
    budgetOnTrack: boolean
    budgetFlaggedVariances: number
    budgetRemainingFormatted: string
    alertsTotal: number
    alertsCritical: number
  }
}

// ─── Delta Helpers ──────────────────────────────────────────

function getTimeMode(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural ?? singular + 's'}`
}

function buildDeltaNarrative(
  timeMode: 'morning' | 'afternoon' | 'evening',
  resolved: number,
  newItems: number,
  meetingsRemaining: number,
  meetingsCompleted: number,
  budgetOnTrack: boolean,
  currentPendingTotal: number,
): string {
  if (timeMode === 'morning') {
    return 'Full briefing loaded.'
  }

  if (timeMode === 'afternoon') {
    const parts: string[] = []
    if (resolved > 0 || newItems > 0) {
      let actionPart = `Since this morning: ${pluralize(resolved, 'action')} resolved`
      if (newItems > 0) {
        actionPart += `, ${pluralize(newItems, 'new item')}`
      }
      parts.push(actionPart)
    }
    if (meetingsRemaining > 0) {
      parts.push(`${pluralize(meetingsRemaining, 'meeting')} remaining`)
    } else if (meetingsCompleted > 0) {
      parts.push('all meetings complete')
    }
    if (parts.length === 0) return 'No changes since this morning.'
    return parts.join('. ') + '.'
  }

  // Evening — day-in-review (carryover = current total pending, not new-resolved)
  const parts: string[] = []
  parts.push(`Today: ${pluralize(resolved, 'action')} resolved, ${currentPendingTotal} carry over to tomorrow`)

  if (meetingsCompleted > 0 && meetingsRemaining === 0) {
    parts.push('All meetings complete')
  } else if (meetingsCompleted > 0) {
    parts.push(`${meetingsCompleted} of ${meetingsCompleted + meetingsRemaining} meetings complete`)
  }

  if (!budgetOnTrack) {
    parts.push('Budget pace flagged')
  }

  return parts.join('. ') + '.'
}

// ─── Delta Orchestrator ─────────────────────────────────────

export async function getDailyBriefingDelta(
  userId: string,
  since: string,
): Promise<BriefingDelta> {
  const sinceDate = new Date(since)
  const now = new Date()
  const timeMode = getTimeMode()

  // 1. Fetch user name
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  })
  const firstName = user?.name?.split(' ')[0] ?? 'there'
  const greeting = buildGreeting(firstName)

  // 2. Fetch all delta sources in parallel
  const [
    resolvedSince,
    newSince,
    calendar,
    counts,
    budgetPulse,
    alerts,
    newAlertCount,
  ] = await Promise.all([
    prisma.staffActionItem.count({
      where: {
        assigneeId: userId,
        resolvedAt: { gte: sinceDate },
      },
    }),
    prisma.staffActionItem.count({
      where: {
        assigneeId: userId,
        createdAt: { gte: sinceDate },
        status: 'pending',
      },
    }),
    getCalendarProvider(),
    getActionQueueCounts(userId),
    getBudgetPulse(userId),
    getActiveAlerts(userId),
    prisma.staffAlert.count({
      where: {
        createdAt: { gte: sinceDate },
        isActive: true,
        OR: [
          { scope: 'campus-wide' },
          { targetUserId: userId },
        ],
      },
    }),
  ])

  // 3. Get today's events and partition by completion
  const events = await calendar.getEvents(userId, startOfDay(now), endOfDay(now))
  const meetingsCompleted = events.filter(e => new Date(e.endTime) < now).length
  const meetingsRemaining = events.length - meetingsCompleted

  // 4. Build narrative
  const narrative = buildDeltaNarrative(
    timeMode,
    resolvedSince,
    newSince,
    meetingsRemaining,
    meetingsCompleted,
    budgetPulse.onTrack,
    counts.total,
  )

  // 5. Build KPI counts
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length

  return {
    resolvedSince,
    newSince,
    meetingsCompleted,
    meetingsRemaining,
    budgetChanged: !budgetPulse.onTrack,
    newAlerts: newAlertCount,
    greeting,
    narrative,
    timeMode,
    kpiCounts: {
      actionTotal: counts.total,
      actionP0: counts.byPriority['P0'] ?? 0,
      actionP1: counts.byPriority['P1'] ?? 0,
      meetingsToday: events.length,
      meetingsRemaining,
      budgetOnTrack: budgetPulse.onTrack,
      budgetFlaggedVariances: budgetPulse.flaggedVariances.length,
      budgetRemainingFormatted: `$${Math.round(budgetPulse.totalRemaining / 1000)}K`,
      alertsTotal: alerts.length,
      alertsCritical: criticalAlerts,
    },
  }
}

// ─── Main Orchestrator ──────────────────────────────────────

/**
 * Assemble the complete daily briefing for a staff member.
 * Fetches all sources in parallel for performance.
 */
export async function getDailyBriefing(userId: string): Promise<DailyBriefing> {
  // 1. Fetch user profile
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  })

  const firstName = user?.name?.split(' ')[0] ?? 'there'
  const now = new Date()

  // 2. Fetch all sources in parallel
  const [calendar, actionQueue, insights, budgetPulse, alerts, scheduledCommunications] = await Promise.all([
    getCalendarProvider(),
    buildActionQueueSummary(userId),
    getInsights(userId),
    getBudgetPulse(userId),
    getActiveAlerts(userId),
    getScheduledCommunications(userId),
  ])

  const schedule = await calendar.getEvents(userId, startOfDay(now), endOfDay(now))

  // 3. Generate recommendations based on assembled context
  const context: BriefingContext = { actionQueue, budgetPulse, alerts, schedule, scheduledCommunications }
  const recommendations = await generateRecommendations(userId, context)

  // 4. Assemble and return
  return {
    greeting: buildGreeting(firstName),
    date: formatDate(),
    schedule,
    actionQueue,
    insights,
    budgetPulse,
    alerts,
    recommendations,
    scheduledCommunications,
  }
}
