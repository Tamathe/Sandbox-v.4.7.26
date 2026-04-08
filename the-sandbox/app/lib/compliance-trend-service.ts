import { prisma } from './prisma'

// ── Types ────────────────────────────────────────────────────────────────────

type MonthData = {
  label: string
  avgScore: number
  consentCoverage: number
  ferpaRate: number
  incidents: number
  newDpas: number
}

type TrendDirection = 'improving' | 'declining' | 'stable'

export type TrendResult = {
  months: MonthData[]
  projections: {
    nextMonthScore: number
    trend: TrendDirection
  }
  insights: string[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function monthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
}

function monthRange(monthsBack: number): { start: Date; end: Date }[] {
  const ranges: { start: Date; end: Date }[] = []
  const now = new Date()

  for (let i = monthsBack - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
    ranges.push({ start, end })
  }

  return ranges
}

// ── Main analysis ───────────────────────────────────────────────────────────

export async function analyzeTrends(months: number = 6): Promise<TrendResult> {
  const ranges = monthRange(months)
  const monthlyData: MonthData[] = []

  for (const range of ranges) {
    // Average compliance score from snapshots in this month
    const snapshots = await prisma.complianceMetricSnapshot.findMany({
      where: {
        metricName: 'avgComplianceScore',
        capturedAt: { gte: range.start, lte: range.end },
      },
      select: { value: true },
    })
    const avgScore = snapshots.length > 0
      ? Math.round(snapshots.reduce((s, snap) => s + snap.value, 0) / snapshots.length)
      : 0

    // Consent coverage snapshot
    const consentSnaps = await prisma.complianceMetricSnapshot.findMany({
      where: {
        metricName: 'consentCoverage',
        capturedAt: { gte: range.start, lte: range.end },
      },
      select: { value: true },
      orderBy: { capturedAt: 'desc' },
      take: 1,
    })
    const consentCoverage = consentSnaps[0]?.value ?? 0

    // FERPA training rate snapshot
    const ferpaSnaps = await prisma.complianceMetricSnapshot.findMany({
      where: {
        metricName: 'ferpaTrainingRate',
        capturedAt: { gte: range.start, lte: range.end },
      },
      select: { value: true },
      orderBy: { capturedAt: 'desc' },
      take: 1,
    })
    const ferpaRate = ferpaSnaps[0]?.value ?? 0

    // Active incidents during this month
    const incidents = await prisma.ferpaIncident.count({
      where: {
        status: { in: ['open', 'investigating'] },
        createdAt: { lte: range.end },
        OR: [
          { resolvedAt: null },
          { resolvedAt: { gte: range.start } },
        ],
      },
    })

    // New DPAs signed this month
    const newDpas = await prisma.dataProcessingAgreement.count({
      where: {
        signedAt: { gte: range.start, lte: range.end },
      },
    })

    monthlyData.push({
      label: monthLabel(range.start),
      avgScore,
      consentCoverage,
      ferpaRate,
      incidents,
      newDpas,
    })
  }

  // ── Projections ────────────────────────────────────────────────────────

  const scores = monthlyData.map((m) => m.avgScore).filter((s) => s > 0)
  let trend: TrendDirection = 'stable'
  let nextMonthScore = 0

  if (scores.length >= 2) {
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2))
    const secondHalf = scores.slice(Math.floor(scores.length / 2))
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
    const delta = secondAvg - firstAvg

    if (delta > 3) trend = 'improving'
    else if (delta < -3) trend = 'declining'

    // Simple linear projection
    nextMonthScore = Math.round(Math.min(100, Math.max(0, scores[scores.length - 1] + delta / secondHalf.length)))
  } else if (scores.length === 1) {
    nextMonthScore = scores[0]
  }

  // ── Auto-generated insights ────────────────────────────────────────────

  const insights: string[] = []

  // Consent coverage insight
  const consentValues = monthlyData.map((m) => m.consentCoverage).filter((v) => v > 0)
  if (consentValues.length >= 2) {
    const consentDelta = consentValues[consentValues.length - 1] - consentValues[0]
    if (Math.abs(consentDelta) >= 1) {
      insights.push(
        `Consent coverage ${consentDelta > 0 ? 'improved' : 'declined'} ${Math.abs(Math.round(consentDelta))}% over ${months} months`,
      )
    }
  }

  // FERPA rate insight
  const ferpaValues = monthlyData.map((m) => m.ferpaRate).filter((v) => v > 0)
  if (ferpaValues.length >= 2) {
    const ferpaDelta = ferpaValues[ferpaValues.length - 1] - ferpaValues[0]
    if (Math.abs(ferpaDelta) >= 1) {
      insights.push(
        `FERPA training rate ${ferpaDelta > 0 ? 'increased' : 'decreased'} ${Math.abs(Math.round(ferpaDelta))}% over the period`,
      )
    }
  }

  // Incident trend insight
  const incidentValues = monthlyData.map((m) => m.incidents)
  const totalIncidents = incidentValues.reduce((a, b) => a + b, 0)
  if (totalIncidents === 0) {
    insights.push('Zero active compliance incidents across the entire analysis period')
  } else {
    const recentIncidents = incidentValues[incidentValues.length - 1]
    insights.push(
      `Current month has ${recentIncidents} active incident(s); ${totalIncidents} total across the period`,
    )
  }

  // Score trend insight
  if (scores.length >= 2 && trend !== 'stable') {
    insights.push(
      `Compliance score is ${trend} — projected next month: ${nextMonthScore}/100`,
    )
  }

  // Cap at 3 insights
  const finalInsights = insights.slice(0, 3)

  return {
    months: monthlyData,
    projections: { nextMonthScore, trend },
    insights: finalInsights,
  }
}
