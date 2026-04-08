import { prisma } from '../prisma'
import type { ComplianceDashboard, StandardCompliance } from './types'

/** Get institution-level compliance dashboard */
export async function getComplianceDashboard(cycleId: string): Promise<ComplianceDashboard> {
  const cycle = await prisma.accreditationCycle.findUnique({
    where: { id: cycleId },
  })
  if (!cycle) throw new Error('Cycle not found')

  const standards = await prisma.accreditationStandard.findMany({
    where: { isActive: true, body: cycle.body },
    include: {
      evidence: { where: { cycleId } },
      gaps: { where: { cycleId, remediationStatus: { not: 'resolved' } } },
      narratives: {
        where: { cycleId },
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
  })

  // Classify standards
  let met = 0, partial = 0, gapped = 0
  for (const std of standards) {
    if (std.evidence.length > 0 && std.gaps.length === 0) {
      const avgQuality = std.evidence.reduce((sum, e) => sum + (e.qualityScore ?? 0), 0) / std.evidence.length
      if (avgQuality >= 0.6) met++
      else partial++
    } else if (std.evidence.length > 0) {
      partial++
    } else {
      gapped++
    }
  }

  // Gap summary
  const allGaps = standards.flatMap(s => s.gaps)
  const gapSummary = {
    critical: allGaps.filter(g => g.severity === 'critical').length,
    major: allGaps.filter(g => g.severity === 'major').length,
    minor: allGaps.filter(g => g.severity === 'minor').length,
    informational: allGaps.filter(g => g.severity === 'informational').length,
  }

  // Narrative summary
  const allNarratives = standards.map(s => s.narratives[0]).filter(Boolean)
  const narrativeSummary = {
    notStarted: standards.length - allNarratives.length,
    aiDraft: allNarratives.filter(n => n.status === 'AI_DRAFT').length,
    inReview: allNarratives.filter(n => n.status === 'IN_REVIEW').length,
    approved: allNarratives.filter(n => n.status === 'APPROVED').length,
    final: allNarratives.filter(n => n.status === 'FINAL').length,
  }

  // Overall readiness
  const overallReadiness = standards.length > 0 ? met / standards.length : 0

  // Days until site visit
  const daysUntilSiteVisit = cycle.siteVisitDate
    ? Math.ceil((cycle.siteVisitDate.getTime() - Date.now()) / 86400000)
    : null

  // Recent activity (last 30 days)
  const recentEvidence = await prisma.accreditationEvidence.findMany({
    where: { cycleId, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { standard: { select: { standardNumber: true } } },
  })

  // Trend data
  const snapshots = await prisma.accreditationReadinessSnapshot.findMany({
    where: { cycleId },
    orderBy: { snapshotAt: 'desc' },
    take: 90,
  })

  return {
    cycleId,
    cycleName: cycle.cycleName,
    phase: cycle.phase,
    overallReadiness,
    siteVisitDate: cycle.siteVisitDate,
    daysUntilSiteVisit,
    standardsSummary: { total: standards.length, met, partial, gapped },
    gapSummary,
    narrativeSummary,
    recentActivity: recentEvidence.map(e => ({
      date: e.createdAt,
      action: `Evidence harvested: ${e.title}`,
      standard: e.standard.standardNumber,
    })),
    trendData: snapshots.map(s => ({ date: s.snapshotAt, readiness: s.overallReadiness })).reverse(),
  }
}

/** Get per-standard compliance detail */
export async function getStandardCompliance(standardId: string, cycleId: string): Promise<StandardCompliance> {
  const standard = await prisma.accreditationStandard.findUnique({
    where: { id: standardId },
    include: {
      evidence: { where: { cycleId }, orderBy: { qualityScore: 'desc' } },
      gaps: { where: { cycleId, remediationStatus: { not: 'resolved' } } },
      narratives: { where: { cycleId }, orderBy: { version: 'desc' }, take: 1 },
    },
  })
  if (!standard) throw new Error('Standard not found')

  const avgQuality = standard.evidence.length > 0
    ? standard.evidence.reduce((sum, e) => sum + (e.qualityScore ?? 0), 0) / standard.evidence.length
    : 0

  const qualityLevel = avgQuality >= 0.8 ? 'EXCELLENT' :
    avgQuality >= 0.6 ? 'GOOD' :
    avgQuality >= 0.4 ? 'FAIR' :
    avgQuality >= 0.2 ? 'WEAK' : 'MISSING'

  // Group by program
  const byProgram = new Map<string, typeof standard.evidence>()
  for (const e of standard.evidence) {
    const code = e.programCode ?? 'institution-wide'
    if (!byProgram.has(code)) byProgram.set(code, [])
    byProgram.get(code)!.push(e)
  }

  return {
    standardId: standard.id,
    standardNumber: standard.standardNumber,
    standardTitle: standard.standardTitle,
    evidenceCount: standard.evidence.length,
    evidenceQuality: qualityLevel,
    qualityScore: avgQuality,
    gapCount: standard.gaps.length,
    criticalGaps: standard.gaps.filter(g => g.severity === 'critical').length,
    narrativeStatus: (standard.narratives[0]?.status ?? 'NOT_STARTED') as StandardCompliance['narrativeStatus'],
    isAutoHarvestable: standard.autoHarvestable,
    lastHarvestedAt: standard.evidence[0]?.harvestedAt ?? null,
    programs: Array.from(byProgram.entries()).map(([code, evidence]) => ({
      programCode: code,
      programName: code,
      evidenceCount: evidence.length,
      qualityScore: evidence.reduce((sum, e) => sum + (e.qualityScore ?? 0), 0) / evidence.length,
      gaps: standard.gaps.filter(g => g.affectedPrograms.includes(code)).map(g => g.title),
    })),
  }
}

/** Build Sandy context block for accreditation readiness */
export function buildSandyAccreditationContext(dashboard: ComplianceDashboard): string {
  const lines: string[] = ['<accreditation-status>']
  lines.push(`  <cycle>${dashboard.cycleName}</cycle>`)
  lines.push(`  <phase>${dashboard.phase}</phase>`)
  lines.push(`  <readiness>${(dashboard.overallReadiness * 100).toFixed(0)}%</readiness>`)
  lines.push(`  <standards-met>${dashboard.standardsSummary.met}/${dashboard.standardsSummary.total}</standards-met>`)
  if (dashboard.gapSummary.critical > 0) {
    lines.push(`  <critical-gaps>${dashboard.gapSummary.critical}</critical-gaps>`)
  }
  if (dashboard.daysUntilSiteVisit && dashboard.daysUntilSiteVisit < 365) {
    lines.push(`  <days-until-site-visit>${dashboard.daysUntilSiteVisit}</days-until-site-visit>`)
  }
  lines.push('</accreditation-status>')
  return lines.join('\n')
}

/** Get the active cycle (convenience) */
export async function getActiveCycle() {
  return prisma.accreditationCycle.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })
}
