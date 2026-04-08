import { prisma } from './prisma'
import { verifyChainIntegrity } from './compliance-audit-chain-service'
import { computeCurrentValues } from './compliance-benchmark-service'
import { runHealthCheck } from './compliance-health-service'

// ── Types ────────────────────────────────────────────────────────────────────

export type MaturityLevel = 1 | 2 | 3 | 4 | 5

export type MaturityDimension = {
  name: string
  level: MaturityLevel
  score: number
  findings: string[]
}

export type MaturityAssessment = {
  overallLevel: MaturityLevel
  overallScore: number
  dimensions: MaturityDimension[]
  recommendations: string[]
}

const LEVEL_LABELS: Record<MaturityLevel, string> = {
  1: 'Initial',
  2: 'Developing',
  3: 'Defined',
  4: 'Managed',
  5: 'Optimizing',
}

export { LEVEL_LABELS }

function scoreToLevel(score: number): MaturityLevel {
  if (score >= 90) return 5
  if (score >= 70) return 4
  if (score >= 50) return 3
  if (score >= 30) return 2
  return 1
}

// ── Main assessment ─────────────────────────────────────────────────────────

export async function assessMaturity(): Promise<MaturityAssessment> {
  const dimensions: MaturityDimension[] = []
  const recommendations: string[] = []

  // ── 1. Policy & Governance ──────────────────────────────────────────────

  const [regReqs, retentionPolicies, consentVersionCount] = await Promise.all([
    prisma.regulatoryRequirement.findMany({ select: { status: true } }),
    prisma.dataRetentionPolicy.count({ where: { active: true } }),
    prisma.consentVersion.count(),
  ])

  const regMetPct = regReqs.length > 0
    ? (regReqs.filter((r) => r.status === 'met').length / regReqs.length) * 100
    : 0
  const policyFindings: string[] = []
  let policyScore = 0

  // Regulatory requirements met (40 pts)
  policyScore += (regMetPct / 100) * 40
  if (regMetPct < 80) policyFindings.push(`Only ${Math.round(regMetPct)}% of regulatory requirements are met`)

  // Active retention policies (30 pts: 0=0, 1-2=15, 3+=30)
  if (retentionPolicies >= 3) policyScore += 30
  else if (retentionPolicies >= 1) policyScore += 15
  else policyFindings.push('No active data retention policies defined')

  // Consent versions published (30 pts: 0=0, 1=15, 2+=30)
  if (consentVersionCount >= 2) policyScore += 30
  else if (consentVersionCount >= 1) policyScore += 15
  else policyFindings.push('No consent versions published')

  if (policyFindings.length === 0) policyFindings.push('All policy & governance controls are in place')
  dimensions.push({ name: 'Policy & Governance', level: scoreToLevel(policyScore), score: Math.round(policyScore), findings: policyFindings })

  // ── 2. Training & Awareness ─────────────────────────────────────────────

  const [ferpaTrainingAttempts, trainingModules, trainingCompletions, educatorCount] = await Promise.all([
    prisma.ferpaTrainingAttempt.findMany({ select: { userId: true, passed: true } }),
    prisma.complianceTrainingModule.count({ where: { active: true } }),
    prisma.complianceTrainingCompletion.count({ where: { passed: true } }),
    prisma.user.count({ where: { role: { in: ['EDUCATOR', 'ADMIN'] } } }),
  ])

  const trainingFindings: string[] = []
  let trainingScore = 0

  // FERPA training pass rate (40 pts)
  const uniquePassed = new Set(ferpaTrainingAttempts.filter((a) => a.passed).map((a) => a.userId)).size
  const ferpaPassRate = educatorCount > 0 ? (uniquePassed / educatorCount) * 100 : 0
  trainingScore += (ferpaPassRate / 100) * 40
  if (ferpaPassRate < 80) trainingFindings.push(`FERPA training pass rate is ${Math.round(ferpaPassRate)}% (target: 80%+)`)

  // Active training modules (30 pts: 0=0, 1=10, 2=20, 3+=30)
  if (trainingModules >= 3) trainingScore += 30
  else if (trainingModules >= 2) trainingScore += 20
  else if (trainingModules >= 1) trainingScore += 10
  else trainingFindings.push('No active compliance training modules')

  // Training completion rate (30 pts)
  const completionRate = trainingModules > 0 && educatorCount > 0
    ? Math.min((trainingCompletions / (trainingModules * educatorCount)) * 100, 100)
    : 0
  trainingScore += (completionRate / 100) * 30
  if (completionRate < 50) trainingFindings.push(`Training completion rate is ${Math.round(completionRate)}%`)

  if (trainingFindings.length === 0) trainingFindings.push('Training & awareness program is robust')
  dimensions.push({ name: 'Training & Awareness', level: scoreToLevel(trainingScore), score: Math.round(trainingScore), findings: trainingFindings })

  // ── 3. Technical Controls ───────────────────────────────────────────────

  const [chainResult, healthResult] = await Promise.all([
    verifyChainIntegrity().catch(() => ({ valid: false, totalRecords: 0, brokenAt: 0 })),
    runHealthCheck().catch(() => ({ status: 'critical' as const, timestamp: new Date().toISOString(), checks: [] })),
  ])

  const techFindings: string[] = []
  let techScore = 0

  // Audit chain integrity (40 pts)
  if (chainResult.valid) {
    techScore += 40
  } else {
    techFindings.push(`Audit chain integrity broken at sequence ${chainResult.brokenAt}`)
  }

  // Health check status (30 pts)
  const passChecks = healthResult.checks.filter((c) => c.status === 'pass').length
  const totalChecks = healthResult.checks.length || 1
  techScore += (passChecks / totalChecks) * 30
  if (healthResult.status === 'critical') techFindings.push('System health is critical — failing checks detected')
  else if (healthResult.status === 'degraded') techFindings.push('System health is degraded — some checks are in warning state')

  // Data classification coverage — check if retention policies cover major categories (30 pts)
  const retentionCategories = await prisma.dataRetentionPolicy.findMany({
    where: { active: true },
    select: { dataCategory: true },
  })
  const coveredCategories = new Set(retentionCategories.map((r) => r.dataCategory))
  const expectedCategories = ['user-data', 'session-data', 'assessment-data', 'audit-logs']
  const coveragePct = expectedCategories.length > 0
    ? (expectedCategories.filter((c) => coveredCategories.has(c)).length / expectedCategories.length) * 100
    : 0
  techScore += (coveragePct / 100) * 30
  if (coveragePct < 75) techFindings.push(`Data classification coverage at ${Math.round(coveragePct)}% of expected categories`)

  if (techFindings.length === 0) techFindings.push('All technical controls are functioning correctly')
  dimensions.push({ name: 'Technical Controls', level: scoreToLevel(techScore), score: Math.round(techScore), findings: techFindings })

  // ── 4. Incident Management ──────────────────────────────────────────────

  const [incidents, playbooks] = await Promise.all([
    prisma.ferpaIncident.findMany({
      select: { status: true, createdAt: true, resolvedAt: true },
    }),
    prisma.incidentPlaybook.count(),
  ])

  type IncidentRow = (typeof incidents)[number]

  const incidentFindings: string[] = []
  let incidentScore = 0

  // Incident resolution time (40 pts): avg < 7 days = 40, < 14 = 25, < 30 = 10
  const resolvedIncidents = incidents.filter((i: IncidentRow) => i.status === 'resolved' && i.resolvedAt)
  if (resolvedIncidents.length > 0) {
    const avgDays = resolvedIncidents.reduce((sum: number, i: IncidentRow) => {
      return sum + (i.resolvedAt!.getTime() - i.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    }, 0) / resolvedIncidents.length
    if (avgDays <= 7) incidentScore += 40
    else if (avgDays <= 14) incidentScore += 25
    else if (avgDays <= 30) incidentScore += 10
    else incidentFindings.push(`Average incident resolution time is ${Math.round(avgDays)} days (target: <7 days)`)
  } else {
    // No resolved incidents — check if there are open ones
    const openCount = incidents.filter((i: IncidentRow) => i.status !== 'resolved' && i.status !== 'dismissed').length
    if (openCount === 0) {
      incidentScore += 40 // No incidents at all is fine
    } else {
      incidentFindings.push(`${openCount} open incident(s) with no resolved incidents to benchmark`)
    }
  }

  // Playbook coverage (30 pts: 0=0, 1-2=15, 3+=30)
  if (playbooks >= 3) incidentScore += 30
  else if (playbooks >= 1) incidentScore += 15
  else incidentFindings.push('No incident response playbooks defined')

  // Response rate — % incidents that have been responded to (30 pts)
  const totalIncidents = incidents.length
  const respondedIncidents = incidents.filter((i: IncidentRow) => i.status !== 'open').length
  const responseRate = totalIncidents > 0 ? (respondedIncidents / totalIncidents) * 100 : 100
  incidentScore += (responseRate / 100) * 30
  if (responseRate < 80 && totalIncidents > 0) incidentFindings.push(`Incident response rate is ${Math.round(responseRate)}%`)

  if (incidentFindings.length === 0) incidentFindings.push('Incident management processes are well-established')
  dimensions.push({ name: 'Incident Management', level: scoreToLevel(incidentScore), score: Math.round(incidentScore), findings: incidentFindings })

  // ── 5. Monitoring & Improvement ─────────────────────────────────────────

  const [recentSnapshots, benchmarkValues, evidenceCount] = await Promise.all([
    prisma.complianceMetricSnapshot.count({
      where: { capturedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    }),
    computeCurrentValues().catch(() => ({} as Record<string, number>)),
    prisma.complianceEvidence.count(),
  ])

  const monitoringFindings: string[] = []
  let monitoringScore = 0

  // Metric snapshot frequency (35 pts: 0=0, 1-7=15, 8-15=25, 16+=35)
  if (recentSnapshots >= 16) monitoringScore += 35
  else if (recentSnapshots >= 8) monitoringScore += 25
  else if (recentSnapshots >= 1) monitoringScore += 15
  else monitoringFindings.push('No metric snapshots captured in the last 30 days')

  // Benchmark target achievement (35 pts)
  const benchmarks = await prisma.complianceBenchmark.findMany()
  if (benchmarks.length > 0) {
    const metTargets = benchmarks.filter((b) => {
      const current = benchmarkValues[b.category] ?? 0
      // For incident-resolution-time, lower is better
      if (b.category === 'incident-resolution-time') return current <= b.targetValue
      return current >= b.targetValue
    }).length
    const targetPct = (metTargets / benchmarks.length) * 100
    monitoringScore += (targetPct / 100) * 35
    if (targetPct < 70) monitoringFindings.push(`Only ${Math.round(targetPct)}% of benchmark targets are being met`)
  } else {
    monitoringFindings.push('No compliance benchmarks configured')
  }

  // Evidence collection (30 pts: 0=0, 1-5=10, 6-15=20, 16+=30)
  if (evidenceCount >= 16) monitoringScore += 30
  else if (evidenceCount >= 6) monitoringScore += 20
  else if (evidenceCount >= 1) monitoringScore += 10
  else monitoringFindings.push('No compliance evidence collected')

  if (monitoringFindings.length === 0) monitoringFindings.push('Monitoring and continuous improvement practices are mature')
  dimensions.push({ name: 'Monitoring & Improvement', level: scoreToLevel(monitoringScore), score: Math.round(monitoringScore), findings: monitoringFindings })

  // ── Overall ─────────────────────────────────────────────────────────────

  const avgScore = Math.round(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length)
  const overallLevel = scoreToLevel(avgScore)

  // Generate recommendations
  const sortedDimensions = [...dimensions].sort((a, b) => a.score - b.score)
  for (const dim of sortedDimensions) {
    if (dim.level <= 2) {
      recommendations.push(`${dim.name} is at Level ${dim.level} (${LEVEL_LABELS[dim.level]}). Priority: address ${dim.findings.filter((f) => !f.includes('in place') && !f.includes('robust') && !f.includes('functioning') && !f.includes('well-established') && !f.includes('mature')).join('; ') || 'foundational gaps'}.`)
    } else if (dim.level === 3) {
      recommendations.push(`${dim.name} is at Level ${dim.level} (${LEVEL_LABELS[dim.level]}). Consider formalizing processes and increasing automation.`)
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('All compliance dimensions are at Level 4 or above. Continue current monitoring cadence and pursue optimization opportunities.')
  }

  return { overallLevel, overallScore: avgScore, dimensions, recommendations }
}
