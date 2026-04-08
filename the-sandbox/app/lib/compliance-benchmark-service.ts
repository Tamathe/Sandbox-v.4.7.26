import { prisma } from './prisma'
import { computeAllComplianceScores } from './compliance-scoring-service'

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function listBenchmarks() {
  const benchmarks = await prisma.complianceBenchmark.findMany({ orderBy: { category: 'asc' } })
  const currentValues = await computeCurrentValues()

  return benchmarks.map((b) => ({
    ...b,
    currentValue: currentValues[b.category] ?? 0,
  }))
}

export async function updateBenchmark(id: string, data: { targetValue?: number; notes?: string }) {
  return prisma.complianceBenchmark.update({ where: { id }, data })
}

// ── Seed benchmarks ──────────────────────────────────────────────────────────

const BENCHMARK_SEEDS = [
  { category: 'ferpa-training-rate', label: 'FERPA Training Rate', targetValue: 95, unit: '%' },
  { category: 'avg-compliance-score', label: 'Average Compliance Score', targetValue: 80, unit: 'points' },
  { category: 'consent-coverage', label: 'Data Consent Coverage', targetValue: 90, unit: '%' },
  { category: 'tos-acceptance', label: 'TOS Acceptance Rate', targetValue: 95, unit: '%' },
  { category: 'dpa-coverage', label: 'DPA Coverage', targetValue: 100, unit: '%' },
  { category: 'incident-resolution-time', label: 'Incident Resolution Time', targetValue: 7, unit: 'days' },
  { category: 'regulatory-compliance', label: 'Regulatory Compliance', targetValue: 100, unit: '%' },
  { category: 'data-export-readiness', label: 'Data Export Readiness', targetValue: 100, unit: '%' },
]

export async function seedBenchmarks() {
  for (const seed of BENCHMARK_SEEDS) {
    await prisma.complianceBenchmark.upsert({
      where: { category: seed.category },
      update: {},
      create: seed,
    })
  }
}

// ── Compute current values ───────────────────────────────────────────────────

export async function computeCurrentValues(): Promise<Record<string, number>> {
  const values: Record<string, number> = {}

  const [
    totalUsers,
    educatorCount,
    ferpaPassedCount,
    consentCount,
    tosCount,
    totalDPAs,
    expiredDPAs,
    allScores,
    incidents,
    requirements,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: { in: ['EDUCATOR', 'ADMIN'] } } }),
    prisma.user.count({ where: { role: { in: ['EDUCATOR', 'ADMIN'] }, ferpaAckAt: { not: null } } }),
    prisma.user.count({ where: { dataConsentAt: { not: null } } }),
    prisma.user.count({ where: { tosAcceptedAt: { not: null } } }),
    prisma.dataProcessingAgreement.count({ where: { active: true } }),
    prisma.dataProcessingAgreement.count({ where: { active: true, expiresAt: { lt: new Date() } } }),
    computeAllComplianceScores(),
    prisma.ferpaIncident.findMany({
      where: { status: 'resolved', resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
    }),
    prisma.regulatoryRequirement.findMany({ select: { status: true } }),
  ])

  // 1. FERPA training rate
  values['ferpa-training-rate'] = educatorCount > 0
    ? Math.round((ferpaPassedCount / educatorCount) * 100)
    : 100

  // 2. Average compliance score
  const scoreValues = Object.values(allScores)
  values['avg-compliance-score'] = scoreValues.length > 0
    ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)
    : 0

  // 3. Consent coverage
  values['consent-coverage'] = totalUsers > 0
    ? Math.round((consentCount / totalUsers) * 100)
    : 0

  // 4. TOS acceptance
  values['tos-acceptance'] = totalUsers > 0
    ? Math.round((tosCount / totalUsers) * 100)
    : 0

  // 5. DPA coverage
  values['dpa-coverage'] = totalDPAs > 0
    ? Math.round(((totalDPAs - expiredDPAs) / totalDPAs) * 100)
    : 100

  // 6. Incident resolution time (avg days)
  if (incidents.length > 0) {
    const totalDays = incidents.reduce((sum, inc) => {
      const days = (inc.resolvedAt!.getTime() - inc.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      return sum + days
    }, 0)
    values['incident-resolution-time'] = Math.round((totalDays / incidents.length) * 10) / 10
  } else {
    values['incident-resolution-time'] = 0
  }

  // 7. Regulatory compliance
  const metCount = requirements.filter((r) => r.status === 'met').length
  values['regulatory-compliance'] = requirements.length > 0
    ? Math.round((metCount / requirements.length) * 100)
    : 100

  // 8. Data export readiness — always 100 (GDPR export endpoint exists)
  values['data-export-readiness'] = 100

  return values
}
