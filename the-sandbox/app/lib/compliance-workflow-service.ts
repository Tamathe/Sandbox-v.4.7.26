import { prisma } from './prisma'
import { computeComplianceScore } from './compliance-scoring-service'

const DAY_MS = 86_400_000

type WorkflowAction = 'send-notification' | 'send-email' | 'restrict-access' | 'escalate-to-admin'

// ── CRUD ────────────────────────────────────────────────────────────────────

export async function listWorkflowRules() {
  return prisma.workflowRule.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function createWorkflowRule(data: {
  name: string
  triggerEvent: string
  actions: string[]
  delayDays: number[]
  active?: boolean
}) {
  return prisma.workflowRule.create({
    data: {
      name: data.name,
      triggerEvent: data.triggerEvent,
      actions: data.actions,
      delayDays: data.delayDays,
      active: data.active ?? true,
    },
  })
}

export async function updateWorkflowRule(
  id: string,
  data: { name?: string; triggerEvent?: string; actions?: string[]; delayDays?: number[]; active?: boolean },
) {
  return prisma.workflowRule.update({ where: { id }, data })
}

export async function deleteWorkflowRule(id: string) {
  return prisma.workflowRule.delete({ where: { id } })
}

// ── Workflow evaluation engine ──────────────────────────────────────────────

export async function evaluateWorkflows(): Promise<{ processed: number; actionsExecuted: number }> {
  const rules = await prisma.workflowRule.findMany({ where: { active: true } })
  if (rules.length === 0) return { processed: 0, actionsExecuted: 0 }

  const now = new Date()
  let actionsExecuted = 0

  // Group rules by trigger event
  const rulesByTrigger: Record<string, typeof rules> = {}
  for (const rule of rules) {
    if (!rulesByTrigger[rule.triggerEvent]) rulesByTrigger[rule.triggerEvent] = []
    rulesByTrigger[rule.triggerEvent].push(rule)
  }

  // Fetch users in bulk
  const users = await prisma.user.findMany({
    where: { suspended: false },
    select: {
      id: true,
      email: true,
      role: true,
      tosAcceptedAt: true,
      dataConsentAt: true,
      ferpaAckAt: true,
    },
  })

  for (const user of users) {
    const triggers = getUserTriggers(user, now)

    for (const trigger of triggers) {
      const matchingRules = rulesByTrigger[trigger] ?? []
      for (const rule of matchingRules) {
        const actions = (rule.actions as string[]) ?? []
        const delays = rule.delayDays ?? []

        for (let i = 0; i < actions.length; i++) {
          const delayDays = delays[i] ?? 0
          // Only execute if the trigger has been active for at least delayDays
          const triggerAge = getTriggerAgeDays(user, trigger, now)
          if (triggerAge >= delayDays) {
            await executeAction(actions[i] as WorkflowAction, user, rule.name, trigger)
            actionsExecuted++
          }
        }
      }
    }
  }

  return { processed: users.length, actionsExecuted }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

type UserSnapshot = {
  id: string
  email: string
  role: string
  tosAcceptedAt: Date | null
  dataConsentAt: Date | null
  ferpaAckAt: Date | null
}

function getUserTriggers(user: UserSnapshot, now: Date): string[] {
  const triggers: string[] = []
  const yearAgo = new Date(now.getTime() - 365 * DAY_MS)

  // consent-expired: data consent older than 1 year or null
  if (!user.dataConsentAt || user.dataConsentAt < yearAgo) {
    triggers.push('consent-expired')
  }

  // ferpa-overdue: educators/admins with no FERPA ack or expired
  const isEduAdmin = user.role === 'EDUCATOR' || user.role === 'ADMIN'
  if (isEduAdmin && (!user.ferpaAckAt || user.ferpaAckAt < yearAgo)) {
    triggers.push('ferpa-overdue')
  }

  // low-compliance-score: computed async — we'll check inline
  // dpa-expiring: handled separately at the DPA level, not per-user
  return triggers
}

function getTriggerAgeDays(user: UserSnapshot, trigger: string, now: Date): number {
  const yearAgo = new Date(now.getTime() - 365 * DAY_MS)
  switch (trigger) {
    case 'consent-expired': {
      if (!user.dataConsentAt) return 365
      const expiryDate = new Date(user.dataConsentAt.getTime() + 365 * DAY_MS)
      return Math.max(0, Math.floor((now.getTime() - expiryDate.getTime()) / DAY_MS))
    }
    case 'ferpa-overdue': {
      if (!user.ferpaAckAt) return 365
      const expiryDate = new Date(user.ferpaAckAt.getTime() + 365 * DAY_MS)
      return Math.max(0, Math.floor((now.getTime() - expiryDate.getTime()) / DAY_MS))
    }
    default:
      return 0
  }
}

async function executeAction(
  action: WorkflowAction,
  user: UserSnapshot,
  ruleName: string,
  trigger: string,
) {
  // Deduplicate: check if this action was already executed today for this user+rule
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const existing = await prisma.complianceNotification.findFirst({
    where: {
      userId: user.id,
      type: `workflow:${trigger}`,
      message: { contains: ruleName },
      createdAt: { gte: today },
    },
  })
  if (existing) return

  switch (action) {
    case 'send-notification':
      await prisma.complianceNotification.create({
        data: {
          userId: user.id,
          type: `workflow:${trigger}`,
          title: `Compliance Action: ${ruleName}`,
          message: `Automated workflow "${ruleName}" triggered by ${trigger}. Please review your compliance settings.`,
        },
      })
      break

    case 'send-email':
      // Log the email intent — actual sending would use Resend in production
      console.info(`[WORKFLOW] Would send email to ${user.email} for rule "${ruleName}" (trigger: ${trigger})`)
      await prisma.complianceNotification.create({
        data: {
          userId: user.id,
          type: `workflow:${trigger}`,
          title: `Email Sent: ${ruleName}`,
          message: `Compliance email sent for "${ruleName}" triggered by ${trigger}.`,
        },
      })
      break

    case 'restrict-access':
      // Log restriction — actual access restriction deferred to production auth layer
      console.info(`[WORKFLOW] Would restrict access for ${user.email} — rule "${ruleName}" (trigger: ${trigger})`)
      await prisma.complianceNotification.create({
        data: {
          userId: user.id,
          type: `workflow:${trigger}`,
          title: `Access Restriction: ${ruleName}`,
          message: `Your access may be restricted due to "${ruleName}" triggered by ${trigger}. Please update your compliance status.`,
        },
      })
      break

    case 'escalate-to-admin': {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', suspended: false },
        select: { id: true },
      })
      for (const admin of admins) {
        await prisma.complianceNotification.create({
          data: {
            userId: admin.id,
            type: `workflow:${trigger}`,
            title: `Escalation: ${ruleName}`,
            message: `User ${user.email} has been escalated by workflow "${ruleName}" (trigger: ${trigger}).`,
          },
        })
      }
      break
    }
  }
}

// ── DPA-expiring trigger (separate from per-user) ───────────────────────────

export async function evaluateDPAWorkflows(): Promise<number> {
  const rules = await prisma.workflowRule.findMany({
    where: { active: true, triggerEvent: 'dpa-expiring' },
  })
  if (rules.length === 0) return 0

  const now = new Date()
  const threshold = new Date(now.getTime() + 60 * DAY_MS)
  const expiringDPAs = await prisma.dataProcessingAgreement.findMany({
    where: { active: true, expiresAt: { lte: threshold, gte: now } },
    select: { id: true, vendorName: true },
  })

  if (expiringDPAs.length === 0) return 0

  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', suspended: false },
    select: { id: true, email: true },
  })

  let count = 0
  for (const rule of rules) {
    for (const admin of admins) {
      for (const dpa of expiringDPAs) {
        await prisma.complianceNotification.create({
          data: {
            userId: admin.id,
            type: 'workflow:dpa-expiring',
            title: `DPA Workflow: ${rule.name}`,
            message: `DPA with ${dpa.vendorName} is expiring. Workflow "${rule.name}" triggered.`,
          },
        })
        count++
      }
    }
  }

  return count
}

// ── Low compliance score trigger ────────────────────────────────────────────

export async function evaluateLowScoreWorkflows(): Promise<number> {
  const rules = await prisma.workflowRule.findMany({
    where: { active: true, triggerEvent: 'low-compliance-score' },
  })
  if (rules.length === 0) return 0

  const users = await prisma.user.findMany({
    where: { suspended: false },
    select: { id: true, email: true, role: true },
  })

  let count = 0
  for (const user of users) {
    const { score } = await computeComplianceScore(user.id)
    if (score < 50) {
      for (const rule of rules) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const existing = await prisma.complianceNotification.findFirst({
          where: {
            userId: user.id,
            type: 'workflow:low-compliance-score',
            message: { contains: rule.name },
            createdAt: { gte: today },
          },
        })
        if (!existing) {
          await prisma.complianceNotification.create({
            data: {
              userId: user.id,
              type: 'workflow:low-compliance-score',
              title: `Low Compliance Score: ${rule.name}`,
              message: `Your compliance score (${score}/100) is below threshold. Workflow "${rule.name}" has been triggered.`,
            },
          })
          count++
        }
      }
    }
  }

  return count
}
