import { prisma } from './prisma'
import { computeInstitutionalRisk } from './compliance-risk-service'
import { verifyChainIntegrity } from './compliance-audit-chain-service'
import { computeCurrentValues } from './compliance-benchmark-service'

// ── Types ────────────────────────────────────────────────────────────────────

type CriterionStatus = 'ready' | 'needs-attention' | 'not-ready'

type ReadinessCriterion = {
  name: string
  status: CriterionStatus
  details: string
}

export type ReadinessResult = {
  readyForAudit: boolean
  score: number
  criteria: ReadinessCriterion[]
  recommendations: string[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusScore(status: CriterionStatus): number {
  if (status === 'ready') return 10
  if (status === 'needs-attention') return 5
  return 0
}

// ── Main assessment ─────────────────────────────────────────────────────────

export async function assessReadiness(): Promise<ReadinessResult> {
  const now = new Date()
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)

  const criteria: ReadinessCriterion[] = []
  const recommendations: string[] = []

  // ── 1. Documentation completeness ──────────────────────────────────────
  const docTypes = ['policy', 'dpa', 'certificate', 'audit-report', 'other']
  const docCounts = await Promise.all(
    docTypes.map(async (type) => ({
      type,
      count: await prisma.complianceDocument.count({ where: { type } }),
    })),
  )

  const failTypes = docCounts.filter((d) => d.count === 0).map((d) => d.type)
  const warnTypes = docCounts.filter((d) => d.count >= 1 && d.count < 3).map((d) => d.type)

  if (failTypes.length > 0) {
    criteria.push({
      name: 'Documentation Completeness',
      status: 'not-ready',
      details: `Missing documentation for: ${failTypes.join(', ')}`,
    })
    recommendations.push(`Upload compliance documents for: ${failTypes.join(', ')}`)
  } else if (warnTypes.length > 0) {
    criteria.push({
      name: 'Documentation Completeness',
      status: 'needs-attention',
      details: `Fewer than 3 documents for: ${warnTypes.join(', ')}`,
    })
    recommendations.push(`Add more documentation for: ${warnTypes.join(', ')} (target: 3+ per type)`)
  } else {
    criteria.push({
      name: 'Documentation Completeness',
      status: 'ready',
      details: 'All document types have 3+ documents on file',
    })
  }

  // ── 2. Policy version currency ─────────────────────────────────────────
  const consentTypes = ['tos', 'consent', 'ferpa']
  const latestVersions = await Promise.all(
    consentTypes.map(async (type) => {
      const latest = await prisma.consentVersion.findFirst({
        where: { type },
        orderBy: { effectiveAt: 'desc' },
        select: { effectiveAt: true },
      })
      return { type, effectiveAt: latest?.effectiveAt ?? null }
    }),
  )

  const staleVersions = latestVersions.filter(
    (v) => !v.effectiveAt || v.effectiveAt < oneYearAgo,
  )

  if (staleVersions.length === 0) {
    criteria.push({
      name: 'Policy Version Currency',
      status: 'ready',
      details: 'All consent versions published within the last year',
    })
  } else if (staleVersions.some((v) => !v.effectiveAt)) {
    criteria.push({
      name: 'Policy Version Currency',
      status: 'not-ready',
      details: `Missing consent versions for: ${staleVersions.filter((v) => !v.effectiveAt).map((v) => v.type).join(', ')}`,
    })
    recommendations.push('Publish consent versions for all required types (tos, consent, ferpa)')
  } else {
    criteria.push({
      name: 'Policy Version Currency',
      status: 'needs-attention',
      details: `Stale consent versions (>1 year): ${staleVersions.map((v) => v.type).join(', ')}`,
    })
    recommendations.push('Update stale consent versions to ensure audit-readiness')
  }

  // ── 3. Training completion ─────────────────────────────────────────────
  const [educatorCount, ferpaAttempts] = await Promise.all([
    prisma.user.count({ where: { role: { in: ['EDUCATOR', 'ADMIN'] } } }),
    prisma.ferpaTrainingAttempt.findMany({
      where: { passed: true },
      select: { userId: true },
    }),
  ])
  const uniquePassed = new Set(ferpaAttempts.map((a) => a.userId)).size
  const ferpaRate = educatorCount > 0 ? (uniquePassed / educatorCount) * 100 : 100

  if (ferpaRate >= 90) {
    criteria.push({
      name: 'Training Completion',
      status: 'ready',
      details: `${Math.round(ferpaRate)}% of educators have passed FERPA training`,
    })
  } else if (ferpaRate >= 70) {
    criteria.push({
      name: 'Training Completion',
      status: 'needs-attention',
      details: `${Math.round(ferpaRate)}% FERPA pass rate (target: 90%+)`,
    })
    recommendations.push('Increase FERPA training completion rate to 90%+ before audit')
  } else {
    criteria.push({
      name: 'Training Completion',
      status: 'not-ready',
      details: `Only ${Math.round(ferpaRate)}% FERPA pass rate (target: 90%+)`,
    })
    recommendations.push('Urgently schedule FERPA training sessions for all educators')
  }

  // ── 4. Incident resolution ─────────────────────────────────────────────
  const oldOpenIncidents = await prisma.ferpaIncident.count({
    where: {
      status: { in: ['open', 'investigating'] },
      createdAt: { lt: thirtyDaysAgo },
    },
  })

  if (oldOpenIncidents === 0) {
    criteria.push({
      name: 'Incident Resolution',
      status: 'ready',
      details: 'No open incidents older than 30 days',
    })
  } else {
    criteria.push({
      name: 'Incident Resolution',
      status: 'not-ready',
      details: `${oldOpenIncidents} open incident(s) older than 30 days`,
    })
    recommendations.push(`Resolve ${oldOpenIncidents} overdue incident(s) before scheduling an audit`)
  }

  // ── 5. DPA coverage ────────────────────────────────────────────────────
  const expiringDPAs = await prisma.dataProcessingAgreement.count({
    where: {
      active: true,
      expiresAt: { lte: sixtyDaysFromNow },
    },
  })

  if (expiringDPAs === 0) {
    criteria.push({
      name: 'DPA Coverage',
      status: 'ready',
      details: 'All active DPAs valid for 60+ days',
    })
  } else {
    criteria.push({
      name: 'DPA Coverage',
      status: 'needs-attention',
      details: `${expiringDPAs} DPA(s) expiring within 60 days`,
    })
    recommendations.push('Renew expiring Data Processing Agreements before audit')
  }

  // ── 6. Evidence collection ─────────────────────────────────────────────
  const [totalReqs, reqsWithEvidence] = await Promise.all([
    prisma.regulatoryRequirement.count(),
    prisma.complianceEvidence.findMany({
      where: { requirementId: { not: null } },
      select: { requirementId: true },
      distinct: ['requirementId'],
    }),
  ])
  const evidenceCoverage = totalReqs > 0 ? reqsWithEvidence.length : 0

  if (totalReqs === 0 || evidenceCoverage >= totalReqs) {
    criteria.push({
      name: 'Evidence Collection',
      status: 'ready',
      details: totalReqs === 0
        ? 'No regulatory requirements defined'
        : `Evidence collected for all ${totalReqs} regulatory requirements`,
    })
  } else if (evidenceCoverage >= 1) {
    criteria.push({
      name: 'Evidence Collection',
      status: 'needs-attention',
      details: `Evidence for ${evidenceCoverage} of ${totalReqs} regulatory requirements`,
    })
    recommendations.push('Collect evidence for all regulatory requirements before audit')
  } else {
    criteria.push({
      name: 'Evidence Collection',
      status: 'not-ready',
      details: 'No compliance evidence collected for any regulatory requirement',
    })
    recommendations.push('Begin evidence collection immediately — auditors will require proof of compliance')
  }

  // ── 7. Access review ───────────────────────────────────────────────────
  const recentReview = await prisma.accessReview.findFirst({
    where: {
      status: 'completed',
      completedAt: { gte: sixMonthsAgo },
    },
    orderBy: { completedAt: 'desc' },
    select: { completedAt: true, reviewCycle: true },
  })

  if (recentReview) {
    criteria.push({
      name: 'Access Review',
      status: 'ready',
      details: `Last completed review: ${recentReview.reviewCycle} (${recentReview.completedAt?.toLocaleDateString()})`,
    })
  } else {
    const anyReview = await prisma.accessReview.findFirst({
      where: { status: 'completed' },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
    })
    if (anyReview) {
      criteria.push({
        name: 'Access Review',
        status: 'needs-attention',
        details: 'No access review completed within the last 6 months',
      })
      recommendations.push('Conduct an access review — last one was over 6 months ago')
    } else {
      criteria.push({
        name: 'Access Review',
        status: 'not-ready',
        details: 'No access review has ever been completed',
      })
      recommendations.push('Complete an access review before scheduling any external audit')
    }
  }

  // ── 8. Risk assessment ─────────────────────────────────────────────────
  try {
    const risk = await computeInstitutionalRisk()
    if (risk.overallScore >= 70) {
      criteria.push({
        name: 'Risk Assessment',
        status: 'ready',
        details: `Institutional risk score: ${risk.overallScore}/100 (${risk.riskLevel})`,
      })
    } else if (risk.overallScore >= 50) {
      criteria.push({
        name: 'Risk Assessment',
        status: 'needs-attention',
        details: `Institutional risk score: ${risk.overallScore}/100 (${risk.riskLevel})`,
      })
      recommendations.push('Address medium-risk items to improve institutional risk score above 70')
    } else {
      criteria.push({
        name: 'Risk Assessment',
        status: 'not-ready',
        details: `Institutional risk score: ${risk.overallScore}/100 (${risk.riskLevel})`,
      })
      recommendations.push('Institutional risk score is critically low — resolve high-risk items urgently')
    }
  } catch {
    criteria.push({
      name: 'Risk Assessment',
      status: 'not-ready',
      details: 'Failed to compute institutional risk score',
    })
    recommendations.push('Investigate risk assessment computation failure')
  }

  // ── 9. Benchmark achievement ───────────────────────────────────────────
  try {
    const benchmarks = await prisma.complianceBenchmark.findMany()
    const currentValues = await computeCurrentValues()
    const metCount = benchmarks.filter((b) => {
      const current = currentValues[b.category] ?? 0
      if (b.category === 'incident-resolution-time') return current <= b.targetValue
      return current >= b.targetValue
    }).length
    const totalBenchmarks = benchmarks.length

    if (totalBenchmarks === 0) {
      criteria.push({
        name: 'Benchmark Achievement',
        status: 'needs-attention',
        details: 'No compliance benchmarks configured',
      })
      recommendations.push('Configure compliance benchmarks to measure audit readiness')
    } else if (metCount >= 6 || metCount >= totalBenchmarks * 0.75) {
      criteria.push({
        name: 'Benchmark Achievement',
        status: 'ready',
        details: `${metCount} of ${totalBenchmarks} benchmarks met`,
      })
    } else if (metCount >= 4) {
      criteria.push({
        name: 'Benchmark Achievement',
        status: 'needs-attention',
        details: `${metCount} of ${totalBenchmarks} benchmarks met (target: 6+)`,
      })
      recommendations.push('Work toward meeting at least 6 of 8 compliance benchmarks')
    } else {
      criteria.push({
        name: 'Benchmark Achievement',
        status: 'not-ready',
        details: `Only ${metCount} of ${totalBenchmarks} benchmarks met (target: 6+)`,
      })
      recommendations.push('Significant benchmark gaps — address before scheduling audit')
    }
  } catch {
    criteria.push({
      name: 'Benchmark Achievement',
      status: 'not-ready',
      details: 'Failed to compute benchmark status',
    })
  }

  // ── 10. Audit chain integrity ──────────────────────────────────────────
  try {
    const chain = await verifyChainIntegrity()
    if (chain.valid) {
      criteria.push({
        name: 'Audit Chain Integrity',
        status: 'ready',
        details: `Chain valid — ${chain.totalRecords} records verified`,
      })
    } else {
      criteria.push({
        name: 'Audit Chain Integrity',
        status: 'not-ready',
        details: `Chain broken at sequence ${chain.brokenAt}`,
      })
      recommendations.push('Audit chain integrity is compromised — investigate and repair before audit')
    }
  } catch {
    criteria.push({
      name: 'Audit Chain Integrity',
      status: 'not-ready',
      details: 'Failed to verify audit chain',
    })
    recommendations.push('Resolve audit chain verification errors')
  }

  // ── Compute overall score ──────────────────────────────────────────────
  const score = Math.round(
    criteria.reduce((sum, c) => sum + statusScore(c.status), 0),
  )

  const notReadyCount = criteria.filter((c) => c.status === 'not-ready').length
  const readyForAudit = score >= 80 && notReadyCount === 0

  return { readyForAudit, score, criteria, recommendations }
}
