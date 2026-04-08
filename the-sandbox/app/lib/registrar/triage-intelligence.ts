import { prisma } from '../prisma'

export interface TriageInsight {
  id: string
  type: 'batch_approve' | 'anomaly' | 'overdue' | 'trend' | 'graduation'
  severity: 'success' | 'warning' | 'danger' | 'info'
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  count?: number
}

const SEVERITY_ORDER: Record<string, number> = {
  danger: 0,
  warning: 1,
  success: 2,
  info: 3,
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

const SENSITIVE_TYPES = ['LATE_WITHDRAWAL', 'GRADE_CHANGE', 'SAP_APPEAL'] as const

// ── Insight generators ───────────────────────────────────────────────────────

async function findBatchApprovable(): Promise<TriageInsight | null> {
  const candidates = await prisma.petition.findMany({
    where: { status: { in: ['SUBMITTED', 'IN_REVIEW'] } },
    select: { id: true, eligibilityCheck: true },
  })

  const batchReady = candidates.filter((p) => {
    if (!p.eligibilityCheck || typeof p.eligibilityCheck !== 'object') return false
    const check = p.eligibilityCheck as Record<string, unknown>
    if (check.eligible !== true) return false
    const blockers = check.blockers
    return Array.isArray(blockers) && blockers.length === 0
  })

  if (batchReady.length === 0) return null

  return {
    id: 'batch-approve',
    type: 'batch_approve',
    severity: 'success',
    title: `${batchReady.length} petition${batchReady.length === 1 ? '' : 's'} ready for batch approval`,
    description: `These petitions passed eligibility checks with no blockers. Review and approve them in one action.`,
    actionLabel: 'Review batch',
    actionHref: '/registrar?tab=petitions&status=SUBMITTED',
    count: batchReady.length,
  }
}

async function findOverdueItems(): Promise<TriageInsight | null> {
  const sevenDaysAgo = daysAgo(7)

  const [overduePetitions, overdueArticulations] = await Promise.all([
    prisma.petition.count({
      where: {
        status: { in: ['SUBMITTED', 'IN_REVIEW'] },
        submittedAt: { lt: sevenDaysAgo },
      },
    }),
    prisma.articulationRequest.count({
      where: {
        status: 'PENDING',
        createdAt: { lt: sevenDaysAgo },
      },
    }),
  ])

  const total = overduePetitions + overdueArticulations
  if (total === 0) return null

  const parts: string[] = []
  if (overduePetitions > 0) {
    parts.push(`${overduePetitions} petition${overduePetitions === 1 ? '' : 's'}`)
  }
  if (overdueArticulations > 0) {
    parts.push(`${overdueArticulations} articulation request${overdueArticulations === 1 ? '' : 's'}`)
  }

  return {
    id: 'overdue-items',
    type: 'overdue',
    severity: 'danger',
    title: `${total} item${total === 1 ? '' : 's'} overdue (7+ days)`,
    description: `${parts.join(' and ')} waiting longer than 7 days without action.`,
    actionLabel: 'View overdue',
    actionHref: '/registrar?tab=petitions&status=IN_REVIEW',
    count: total,
  }
}

async function findAnomalies(): Promise<TriageInsight[]> {
  const insights: TriageInsight[] = []

  // Find students with >2 petitions
  const frequentFilers = await prisma.petition.groupBy({
    by: ['studentId'],
    _count: { id: true },
    having: { id: { _count: { gt: 2 } } },
  })

  if (frequentFilers.length > 0) {
    const studentIds = frequentFilers.map((f) => f.studentId)

    // Check for repeat sensitive-type petitions
    const sensitivePetitions = await prisma.petition.findMany({
      where: {
        studentId: { in: studentIds },
        type: { in: ['LATE_WITHDRAWAL', 'GRADE_CHANGE', 'SAP_APPEAL'] },
      },
      select: { studentId: true, type: true },
    })

    // Group by student+type to find repeats
    const combos = new Map<string, number>()
    for (const p of sensitivePetitions) {
      const key = `${p.studentId}:${p.type}`
      combos.set(key, (combos.get(key) || 0) + 1)
    }

    let repeatCount = 0
    for (const count of combos.values()) {
      if (count > 1) repeatCount++
    }

    if (repeatCount > 0) {
      insights.push({
        id: 'anomaly-repeat-sensitive',
        type: 'anomaly',
        severity: 'warning',
        title: `${repeatCount} student${repeatCount === 1 ? '' : 's'} with repeat sensitive petitions`,
        description: `Students filing multiple Late Withdrawal, Grade Change, or SAP Appeal petitions may need additional support or review.`,
        actionLabel: 'Investigate',
        actionHref: '/registrar?tab=petitions',
        count: repeatCount,
      })
    }
  }

  // Find low-confidence audits
  const lowConfidenceAudits = await prisma.degreeAuditResult.count({
    where: { confidenceScore: { lt: 50 } },
  })

  if (lowConfidenceAudits > 0) {
    insights.push({
      id: 'anomaly-low-confidence',
      type: 'anomaly',
      severity: 'warning',
      title: `${lowConfidenceAudits} degree audit${lowConfidenceAudits === 1 ? '' : 's'} with low confidence`,
      description: `Audits scored below 50% confidence need manual review to ensure accuracy.`,
      actionLabel: 'Review audits',
      actionHref: '/registrar?tab=audits',
      count: lowConfidenceAudits,
    })
  }

  return insights
}

async function computePetitionTrends(): Promise<TriageInsight | null> {
  const now = new Date()
  const thirtyDaysAgo = daysAgo(30)
  const sixtyDaysAgo = daysAgo(60)

  const [recentCount, previousCount] = await Promise.all([
    prisma.petition.count({
      where: { submittedAt: { gte: thirtyDaysAgo } },
    }),
    prisma.petition.count({
      where: { submittedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
    }),
  ])

  // Top 2 petition types by volume (last 30 days)
  const topTypes = await prisma.petition.groupBy({
    by: ['type'],
    _count: { id: true },
    where: { submittedAt: { gte: thirtyDaysAgo } },
    orderBy: { _count: { id: 'desc' } },
    take: 2,
  })

  const typeLabels: Record<string, string> = {
    LATE_WITHDRAWAL: 'Late Withdrawal',
    GRADE_CHANGE: 'Grade Change',
    NAME_UPDATE: 'Name Update',
    ENROLLMENT_CERTIFICATION: 'Enrollment Cert.',
    ACADEMIC_RENEWAL: 'Academic Renewal',
    COURSE_OVERLOAD: 'Course Overload',
    GRADUATION_APPLICATION: 'Graduation App.',
    MAJOR_CHANGE: 'Major Change',
    LEAVE_OF_ABSENCE: 'Leave of Absence',
    SAP_APPEAL: 'SAP Appeal',
    FINANCIAL_AID_APPEAL: 'Financial Aid Appeal',
    COA_BUDGET_APPEAL: 'COA Budget Appeal',
    UNUSUAL_CIRCUMSTANCES: 'Unusual Circumstances',
    INCOME_REDUCTION: 'Income Reduction',
  }

  let changeStr: string
  if (previousCount === 0) {
    changeStr = recentCount > 0 ? `${recentCount} new petition${recentCount === 1 ? '' : 's'}` : 'No petitions'
  } else {
    const pctChange = Math.round(((recentCount - previousCount) / previousCount) * 100)
    const direction = pctChange >= 0 ? 'up' : 'down'
    changeStr = `${Math.abs(pctChange)}% ${direction} from last month (${previousCount} → ${recentCount})`
  }

  const topTypeStr =
    topTypes.length > 0
      ? ` Top types: ${topTypes.map((t) => typeLabels[t.type] || t.type).join(', ')}.`
      : ''

  return {
    id: 'petition-trends',
    type: 'trend',
    severity: 'info',
    title: 'Petition volume trend',
    description: `${changeStr}.${topTypeStr}`,
    count: recentCount,
  }
}

async function findGraduationBlockers(): Promise<TriageInsight | null> {
  const pendingGradApps = await prisma.petition.count({
    where: {
      type: 'GRADUATION_APPLICATION',
      status: { in: ['SUBMITTED', 'IN_REVIEW'] },
    },
  })

  if (pendingGradApps === 0) return null

  return {
    id: 'graduation-blockers',
    type: 'graduation',
    severity: pendingGradApps >= 5 ? 'warning' : 'info',
    title: `${pendingGradApps} graduation application${pendingGradApps === 1 ? '' : 's'} pending`,
    description: `Unresolved graduation applications may delay commencement eligibility. Prioritize review as deadlines approach.`,
    actionLabel: 'Review applications',
    actionHref: '/registrar?tab=petitions&type=GRADUATION_APPLICATION',
    count: pendingGradApps,
  }
}

// ── Simulated fallback insights (shown when DB is empty) ─────────────────────

function simulatedInsights(): TriageInsight[] {
  return [
    {
      id: 'sim-overdue',
      type: 'overdue',
      severity: 'danger',
      title: '3 petitions overdue (7+ days)',
      description: '2 Late Withdrawal and 1 Grade Change petition waiting longer than 7 days without action.',
      actionLabel: 'View overdue',
      actionHref: '/registrar?tab=petitions&status=IN_REVIEW',
      count: 3,
    },
    {
      id: 'sim-batch',
      type: 'batch_approve',
      severity: 'success',
      title: '8 petitions ready for batch approval',
      description: 'These petitions passed eligibility checks with no blockers. Review and approve them in one action.',
      actionLabel: 'Review batch',
      actionHref: '/registrar?tab=petitions&status=SUBMITTED',
      count: 8,
    },
    {
      id: 'sim-graduation',
      type: 'graduation',
      severity: 'warning',
      title: '12 graduation applications pending',
      description: 'Unresolved graduation applications may delay commencement eligibility. Spring deadline is April 15.',
      actionLabel: 'Review applications',
      actionHref: '/registrar?tab=petitions&type=GRADUATION_APPLICATION',
      count: 12,
    },
    {
      id: 'sim-trend',
      type: 'trend',
      severity: 'info',
      title: 'Petition volume trend',
      description: '18% up from last month (74 → 87). Top types: Late Withdrawal, Course Overload.',
      count: 87,
    },
  ]
}

// ── Main entry point ─────────────────────────────────────────────────────────

export async function generateTriageInsights(): Promise<TriageInsight[]> {
  // Quick check: if the database has zero petitions, return simulated data
  const totalPetitions = await prisma.petition.count()
  if (totalPetitions === 0) {
    return simulatedInsights()
  }

  const [batchApprovable, overdueItems, anomalies, trends, graduationBlockers] =
    await Promise.all([
      findBatchApprovable(),
      findOverdueItems(),
      findAnomalies(),
      computePetitionTrends(),
      findGraduationBlockers(),
    ])

  const insights: TriageInsight[] = []

  if (batchApprovable) insights.push(batchApprovable)
  if (overdueItems) insights.push(overdueItems)
  insights.push(...anomalies)
  if (trends) insights.push(trends)
  if (graduationBlockers) insights.push(graduationBlockers)

  // Sort by severity: danger → warning → success → info
  insights.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9))

  return insights
}
