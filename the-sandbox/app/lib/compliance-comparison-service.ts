import { prisma } from './prisma'
import { computeAllComplianceScores } from './compliance-scoring-service'

// ── Types ────────────────────────────────────────────────────────────────────

export type ComparisonDelta = {
  metric: string
  period1Value: number
  period2Value: number
  change: number
  direction: 'improved' | 'declined' | 'stable'
}

export type PeriodMetrics = {
  avgComplianceScore: number
  consentCoverage: number
  ferpaTrainingRate: number
  incidentCount: number
  newDPAs: number
  regulatoryRequirementsMet: number
  tosAcceptance: number
  totalUsers: number
}

export type ComparisonResult = {
  period1: { start: string; end: string; metrics: PeriodMetrics }
  period2: { start: string; end: string; metrics: PeriodMetrics }
  deltas: ComparisonDelta[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function direction(p1: number, p2: number, lowerIsBetter = false): 'improved' | 'declined' | 'stable' {
  const diff = p2 - p1
  if (Math.abs(diff) < 0.5) return 'stable'
  if (lowerIsBetter) return diff < 0 ? 'improved' : 'declined'
  return diff > 0 ? 'improved' : 'declined'
}

async function computePeriodMetrics(startDate: Date, endDate: Date): Promise<PeriodMetrics> {
  // Try to get snapshot data for the period first
  const snapshots = await prisma.complianceMetricSnapshot.findMany({
    where: { capturedAt: { gte: startDate, lte: endDate } },
    orderBy: { capturedAt: 'desc' },
  })

  // Group snapshots by metricName, take the latest per period
  const latestByMetric = new Map<string, number>()
  for (const s of snapshots) {
    if (!latestByMetric.has(s.metricName)) {
      latestByMetric.set(s.metricName, s.value)
    }
  }

  // If we have snapshot data, use it
  if (latestByMetric.size > 0) {
    return {
      avgComplianceScore: latestByMetric.get('avgComplianceScore') ?? 0,
      consentCoverage: latestByMetric.get('consentCoverage') ?? 0,
      ferpaTrainingRate: latestByMetric.get('ferpaTrainingRate') ?? 0,
      incidentCount: latestByMetric.get('activeIncidents') ?? 0,
      newDPAs: 0, // computed below
      regulatoryRequirementsMet: latestByMetric.get('regulatoryMet') ?? 0,
      tosAcceptance: latestByMetric.get('tosAcceptance') ?? 0,
      totalUsers: latestByMetric.get('totalUsers') ?? 0,
    }
  }

  // Fallback: compute live metrics for the period
  const [
    totalUsers,
    tosCount,
    consentCount,
    educatorCount,
    ferpaCount,
    incidentCount,
    newDPAs,
    regReqs,
    metReqs,
  ] = await Promise.all([
    prisma.user.count({ where: { createdAt: { lte: endDate } } }),
    prisma.user.count({ where: { tosAcceptedAt: { gte: startDate, lte: endDate } } }),
    prisma.user.count({ where: { dataConsentAt: { gte: startDate, lte: endDate } } }),
    prisma.user.count({ where: { role: { in: ['EDUCATOR', 'ADMIN'] }, createdAt: { lte: endDate } } }),
    prisma.user.count({ where: { ferpaAckAt: { gte: startDate, lte: endDate } } }),
    prisma.ferpaIncident.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
    prisma.dataProcessingAgreement.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
    prisma.regulatoryRequirement.count(),
    prisma.regulatoryRequirement.count({ where: { status: 'met' } }),
  ])

  // For compliance score, compute the live aggregate
  const allScores = await computeAllComplianceScores()
  const scoreValues = Object.values(allScores)
  const avgScore = scoreValues.length > 0
    ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)
    : 0

  return {
    avgComplianceScore: avgScore,
    consentCoverage: totalUsers > 0 ? Math.round((consentCount / totalUsers) * 100) : 0,
    ferpaTrainingRate: educatorCount > 0 ? Math.round((ferpaCount / educatorCount) * 100) : 0,
    incidentCount,
    newDPAs,
    regulatoryRequirementsMet: regReqs > 0 ? Math.round((metReqs / regReqs) * 100) : 100,
    tosAcceptance: totalUsers > 0 ? Math.round((tosCount / totalUsers) * 100) : 0,
    totalUsers,
  }
}

// ── Main comparison ─────────────────────────────────────────────────────────

export async function generateComparison(
  startDate1: Date,
  endDate1: Date,
  startDate2: Date,
  endDate2: Date,
): Promise<ComparisonResult> {
  const [metrics1, metrics2] = await Promise.all([
    computePeriodMetrics(startDate1, endDate1),
    computePeriodMetrics(startDate2, endDate2),
  ])

  const deltas: ComparisonDelta[] = [
    {
      metric: 'Average Compliance Score',
      period1Value: metrics1.avgComplianceScore,
      period2Value: metrics2.avgComplianceScore,
      change: metrics2.avgComplianceScore - metrics1.avgComplianceScore,
      direction: direction(metrics1.avgComplianceScore, metrics2.avgComplianceScore),
    },
    {
      metric: 'Consent Coverage',
      period1Value: metrics1.consentCoverage,
      period2Value: metrics2.consentCoverage,
      change: metrics2.consentCoverage - metrics1.consentCoverage,
      direction: direction(metrics1.consentCoverage, metrics2.consentCoverage),
    },
    {
      metric: 'FERPA Training Rate',
      period1Value: metrics1.ferpaTrainingRate,
      period2Value: metrics2.ferpaTrainingRate,
      change: metrics2.ferpaTrainingRate - metrics1.ferpaTrainingRate,
      direction: direction(metrics1.ferpaTrainingRate, metrics2.ferpaTrainingRate),
    },
    {
      metric: 'Incident Count',
      period1Value: metrics1.incidentCount,
      period2Value: metrics2.incidentCount,
      change: metrics2.incidentCount - metrics1.incidentCount,
      direction: direction(metrics1.incidentCount, metrics2.incidentCount, true),
    },
    {
      metric: 'New DPAs',
      period1Value: metrics1.newDPAs,
      period2Value: metrics2.newDPAs,
      change: metrics2.newDPAs - metrics1.newDPAs,
      direction: direction(metrics1.newDPAs, metrics2.newDPAs),
    },
    {
      metric: 'Regulatory Requirements Met',
      period1Value: metrics1.regulatoryRequirementsMet,
      period2Value: metrics2.regulatoryRequirementsMet,
      change: metrics2.regulatoryRequirementsMet - metrics1.regulatoryRequirementsMet,
      direction: direction(metrics1.regulatoryRequirementsMet, metrics2.regulatoryRequirementsMet),
    },
    {
      metric: 'TOS Acceptance',
      period1Value: metrics1.tosAcceptance,
      period2Value: metrics2.tosAcceptance,
      change: metrics2.tosAcceptance - metrics1.tosAcceptance,
      direction: direction(metrics1.tosAcceptance, metrics2.tosAcceptance),
    },
    {
      metric: 'Total Users',
      period1Value: metrics1.totalUsers,
      period2Value: metrics2.totalUsers,
      change: metrics2.totalUsers - metrics1.totalUsers,
      direction: direction(metrics1.totalUsers, metrics2.totalUsers),
    },
  ]

  return {
    period1: { start: startDate1.toISOString(), end: endDate1.toISOString(), metrics: metrics1 },
    period2: { start: startDate2.toISOString(), end: endDate2.toISOString(), metrics: metrics2 },
    deltas,
  }
}
