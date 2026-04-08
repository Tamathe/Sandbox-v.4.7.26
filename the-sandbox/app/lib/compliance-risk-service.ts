import { prisma } from './prisma'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type RiskBreakdownItem = {
  category: string
  score: number
  description: string
}

export type InstitutionalRiskResult = {
  overallScore: number
  riskLevel: RiskLevel
  breakdown: RiskBreakdownItem[]
}

function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 80) return 'low'
  if (score >= 50) return 'medium'
  if (score >= 25) return 'high'
  return 'critical'
}

export async function computeInstitutionalRisk(): Promise<InstitutionalRiskResult> {
  const now = new Date()
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

  const [
    totalUsers,
    expiredConsentUsers,
    educatorsAdmins,
    overdueFerpaUsers,
    activeDPAs,
    expiringDPAs,
    unresolvedIncidents,
    totalRegReqs,
    unmetRegReqs,
    complianceScores,
  ] = await Promise.all([
    // Total users
    prisma.user.count(),
    // Users with expired consent (consent older than 1 year or never given)
    prisma.user.count({
      where: {
        OR: [
          { dataConsentAt: null },
          { dataConsentAt: { lt: oneYearAgo } },
        ],
      },
    }),
    // Educators + admins total (for FERPA)
    prisma.user.count({
      where: { role: { in: ['EDUCATOR', 'ADMIN'] } },
    }),
    // Educators/admins with overdue FERPA (>1 year or never)
    prisma.user.count({
      where: {
        role: { in: ['EDUCATOR', 'ADMIN'] },
        OR: [
          { ferpaAckAt: null },
          { ferpaAckAt: { lt: oneYearAgo } },
        ],
      },
    }),
    // Active DPAs
    prisma.dataProcessingAgreement.count({ where: { active: true } }),
    // DPAs expiring within 90 days
    prisma.dataProcessingAgreement.count({
      where: {
        active: true,
        expiresAt: {
          gte: now,
          lte: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    // Unresolved FERPA incidents
    prisma.ferpaIncident.count({
      where: { status: { in: ['open', 'investigating'] } },
    }),
    // Total regulatory requirements
    prisma.regulatoryRequirement.count(),
    // Unmet regulatory requirements
    prisma.regulatoryRequirement.count({ where: { status: 'unmet' } }),
    // Users with low compliance scores (we'll check TOS + consent + FERPA all present)
    prisma.user.count({
      where: {
        OR: [
          { tosAcceptedAt: null },
          { dataConsentAt: null },
        ],
      },
    }),
  ])

  const breakdown: RiskBreakdownItem[] = []

  // 1. Expired consent % (0-100, higher = better)
  const expiredConsentPct = totalUsers > 0 ? (expiredConsentUsers / totalUsers) * 100 : 0
  const consentScore = Math.max(0, Math.round(100 - expiredConsentPct))
  breakdown.push({
    category: 'Expired Consent',
    score: consentScore,
    description: `${expiredConsentUsers} of ${totalUsers} users (${Math.round(expiredConsentPct)}%) have expired or missing data consent`,
  })

  // 2. Overdue FERPA %
  const ferpaOverduePct = educatorsAdmins > 0 ? (overdueFerpaUsers / educatorsAdmins) * 100 : 0
  const ferpaScore = Math.max(0, Math.round(100 - ferpaOverduePct))
  breakdown.push({
    category: 'FERPA Compliance',
    score: ferpaScore,
    description: `${overdueFerpaUsers} of ${educatorsAdmins} educators/admins (${Math.round(ferpaOverduePct)}%) have overdue FERPA acknowledgments`,
  })

  // 3. Expiring DPAs
  const dpaScore = activeDPAs > 0
    ? Math.max(0, Math.round(100 - (expiringDPAs / activeDPAs) * 100))
    : 100
  breakdown.push({
    category: 'Data Processing Agreements',
    score: dpaScore,
    description: `${expiringDPAs} of ${activeDPAs} active DPAs expiring within 90 days`,
  })

  // 4. Unresolved incidents
  const incidentScore = unresolvedIncidents === 0 ? 100 : Math.max(0, 100 - unresolvedIncidents * 20)
  breakdown.push({
    category: 'Unresolved Incidents',
    score: Math.min(100, incidentScore),
    description: `${unresolvedIncidents} unresolved FERPA incident${unresolvedIncidents !== 1 ? 's' : ''} currently open`,
  })

  // 5. Regulatory requirements coverage
  const regScore = totalRegReqs > 0
    ? Math.max(0, Math.round(100 - (unmetRegReqs / totalRegReqs) * 100))
    : 100
  breakdown.push({
    category: 'Regulatory Requirements',
    score: regScore,
    description: `${unmetRegReqs} of ${totalRegReqs} regulatory requirements are unmet`,
  })

  // 6. Low compliance score users
  const lowCompPct = totalUsers > 0 ? (complianceScores / totalUsers) * 100 : 0
  const compScore = Math.max(0, Math.round(100 - lowCompPct))
  breakdown.push({
    category: 'User Compliance Coverage',
    score: compScore,
    description: `${complianceScores} of ${totalUsers} users (${Math.round(lowCompPct)}%) missing TOS or data consent`,
  })

  // Weighted average
  const weights = [20, 25, 15, 15, 15, 10]
  const overallScore = Math.round(
    breakdown.reduce((sum, item, i) => sum + item.score * weights[i], 0) / weights.reduce((a, b) => a + b, 0),
  )

  return {
    overallScore,
    riskLevel: riskLevelFromScore(overallScore),
    breakdown,
  }
}
