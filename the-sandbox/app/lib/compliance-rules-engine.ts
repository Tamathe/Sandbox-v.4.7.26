import { prisma } from './prisma'
import { computeComplianceScore } from './compliance-scoring-service'
import type { User, WorkflowRule } from '../generated/prisma'

// ── Condition evaluation ─────────────────────────────────────────────────────

type Condition = {
  field: string
  operator: string
  value: unknown
}

type UserState = {
  complianceScore?: number
  role?: string
  department?: string | null
  ferpaStatus?: string
  consentStatus?: string
  [key: string]: unknown
}

export function evaluateCondition(condition: Condition, userState: UserState): boolean {
  const fieldValue = userState[condition.field]
  const { operator, value } = condition

  switch (operator) {
    case 'lt':
      return typeof fieldValue === 'number' && fieldValue < (value as number)
    case 'gt':
      return typeof fieldValue === 'number' && fieldValue > (value as number)
    case 'eq':
      return fieldValue === value
    case 'ne':
      return fieldValue !== value
    case 'in':
      return Array.isArray(value) && value.includes(fieldValue)
    case 'contains':
      return typeof fieldValue === 'string' && typeof value === 'string' && fieldValue.toLowerCase().includes(value.toLowerCase())
    default:
      return false
  }
}

// ── Workflow evaluation with conditions ───────────────────────────────────────

type EvaluationResult = {
  triggered: boolean
  reason: string
}

export function evaluateWorkflowWithConditions(
  rule: WorkflowRule,
  _user: User,
  userState: UserState,
): EvaluationResult {
  const conditions = (rule.conditions as Condition[] | null) ?? []

  if (conditions.length === 0) {
    return { triggered: true, reason: 'No conditions defined — always triggered' }
  }

  const failedConditions: string[] = []
  for (const condition of conditions) {
    if (!evaluateCondition(condition, userState)) {
      failedConditions.push(`${condition.field} ${condition.operator} ${JSON.stringify(condition.value)}`)
    }
  }

  if (failedConditions.length === 0) {
    return { triggered: true, reason: `All ${conditions.length} condition(s) met` }
  }

  return {
    triggered: false,
    reason: `Failed conditions: ${failedConditions.join('; ')}`,
  }
}

// ── Dry-run simulation ───────────────────────────────────────────────────────

type DryRunResult = {
  userId: string
  email: string
  triggered: boolean
  reason: string
}

export async function executeWorkflowDryRun(ruleId: string): Promise<DryRunResult[]> {
  const rule = await prisma.workflowRule.findUnique({ where: { id: ruleId } })
  if (!rule) throw new Error('Workflow rule not found')

  const users = await prisma.user.findMany({
    where: { suspended: false },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      department: true,
      tosAcceptedAt: true,
      dataConsentAt: true,
      ferpaAckAt: true,
    },
  })

  const results: DryRunResult[] = []

  for (const user of users) {
    const { score } = await computeComplianceScore(user.id)
    const isEdu = user.role === 'EDUCATOR' || user.role === 'ADMIN'

    const userState: UserState = {
      complianceScore: score,
      role: user.role,
      department: user.department,
      ferpaStatus: isEdu ? (user.ferpaAckAt ? 'acknowledged' : 'missing') : 'not-required',
      consentStatus: user.dataConsentAt ? 'granted' : 'missing',
    }

    const evalResult = evaluateWorkflowWithConditions(rule, user as unknown as User, userState)

    results.push({
      userId: user.id,
      email: user.email,
      triggered: evalResult.triggered,
      reason: evalResult.reason,
    })

    // Log dry-run execution
    if (evalResult.triggered) {
      await logWorkflowExecution(
        ruleId,
        rule.name,
        user.id,
        (rule.actions as string[])?.[0] ?? 'unknown',
        evalResult.reason,
        true,
      )
    }
  }

  return results
}

// ── Execution history ────────────────────────────────────────────────────────

export async function getWorkflowExecutionHistory(ruleId?: string, limit = 20) {
  return prisma.complianceWorkflowExecution.findMany({
    where: ruleId ? { ruleId } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { user: { select: { id: true, email: true, name: true } } },
  })
}

// ── Logging ──────────────────────────────────────────────────────────────────

export async function logWorkflowExecution(
  ruleId: string,
  ruleName: string,
  userId: string,
  action: string,
  result: string,
  dryRun: boolean,
) {
  return prisma.complianceWorkflowExecution.create({
    data: { ruleId, ruleName, userId, action, result, dryRun },
  })
}
