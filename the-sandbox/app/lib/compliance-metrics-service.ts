import { prisma } from './prisma'

// ── Metric names ─────────────────────────────────────────────────────────────

const METRIC_NAMES = [
  'totalUsers',
  'avgComplianceScore',
  'ferpaTrainingRate',
  'consentCoverage',
  'tosAcceptance',
  'activeIncidents',
  'dpaCompliance',
  'regulatoryMet',
] as const

// ── Snapshot capture ─────────────────────────────────────────────────────────

export async function captureMetricSnapshot() {
  const [
    totalUsers,
    tosAccepted,
    consentAccepted,
    ferpaAcked,
    activeIncidents,
    totalDpas,
    activeDpas,
    regReqs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { tosAcceptedAt: { not: null } } }),
    prisma.user.count({ where: { dataConsentAt: { not: null } } }),
    prisma.user.count({ where: { ferpaAckAt: { not: null } } }),
    prisma.ferpaIncident.count({ where: { status: { in: ['open', 'investigating'] } } }),
    prisma.dataProcessingAgreement.count(),
    prisma.dataProcessingAgreement.count({ where: { active: true } }),
    prisma.regulatoryRequirement.count(),
  ])

  const metReqs = await prisma.regulatoryRequirement.count({ where: { status: 'met' } })

  const metrics: { metricName: string; value: number }[] = [
    { metricName: 'totalUsers', value: totalUsers },
    {
      metricName: 'avgComplianceScore',
      value: totalUsers > 0
        ? Math.round(((tosAccepted + consentAccepted + ferpaAcked) / (totalUsers * 3)) * 100)
        : 0,
    },
    {
      metricName: 'ferpaTrainingRate',
      value: totalUsers > 0 ? Math.round((ferpaAcked / totalUsers) * 100) : 0,
    },
    {
      metricName: 'consentCoverage',
      value: totalUsers > 0 ? Math.round((consentAccepted / totalUsers) * 100) : 0,
    },
    {
      metricName: 'tosAcceptance',
      value: totalUsers > 0 ? Math.round((tosAccepted / totalUsers) * 100) : 0,
    },
    { metricName: 'activeIncidents', value: activeIncidents },
    {
      metricName: 'dpaCompliance',
      value: totalDpas > 0 ? Math.round((activeDpas / totalDpas) * 100) : 100,
    },
    {
      metricName: 'regulatoryMet',
      value: regReqs > 0 ? Math.round((metReqs / regReqs) * 100) : 100,
    },
  ]

  const results = await Promise.all(
    metrics.map((m) =>
      prisma.complianceMetricSnapshot.create({
        data: {
          metricName: m.metricName,
          value: m.value,
        },
      }),
    ),
  )

  return results
}

// ── History ──────────────────────────────────────────────────────────────────

export async function getMetricHistory(metricName: string, days: number = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  return prisma.complianceMetricSnapshot.findMany({
    where: {
      metricName,
      capturedAt: { gte: since },
    },
    orderBy: { capturedAt: 'asc' },
    select: {
      id: true,
      metricName: true,
      value: true,
      capturedAt: true,
    },
  })
}

// ── Trends ───────────────────────────────────────────────────────────────────

export async function getMetricTrends() {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

  const trends: Record<string, { current: number; previous: number; delta: number }> = {}

  for (const metric of METRIC_NAMES) {
    const [currentSnaps, prevSnaps] = await Promise.all([
      prisma.complianceMetricSnapshot.findMany({
        where: { metricName: metric, capturedAt: { gte: oneWeekAgo } },
        orderBy: { capturedAt: 'desc' },
        take: 1,
        select: { value: true },
      }),
      prisma.complianceMetricSnapshot.findMany({
        where: { metricName: metric, capturedAt: { gte: twoWeeksAgo, lt: oneWeekAgo } },
        orderBy: { capturedAt: 'desc' },
        take: 1,
        select: { value: true },
      }),
    ])

    const current = currentSnaps[0]?.value ?? 0
    const previous = prevSnaps[0]?.value ?? 0
    trends[metric] = { current, previous, delta: current - previous }
  }

  return trends
}

// ── CSV Export ────────────────────────────────────────────────────────────────

export async function exportMetricsCSV() {
  const snapshots = await prisma.complianceMetricSnapshot.findMany({
    orderBy: [{ metricName: 'asc' }, { capturedAt: 'asc' }],
  })

  const header = 'id,metricName,value,capturedAt\n'
  const rows = snapshots
    .map((s) => `${s.id},${s.metricName},${s.value},${s.capturedAt.toISOString()}`)
    .join('\n')

  return header + rows
}
