import { prisma } from '../prisma'
import type { GapAnalysisResult, GapSeverity } from './types'

/** Run gap analysis for all standards in a cycle */
export async function analyzeAllGaps(cycleId: string): Promise<GapAnalysisResult[]> {
  const standards = await prisma.accreditationStandard.findMany({
    where: { isActive: true },
    include: {
      evidence: { where: { cycleId } },
      gaps: { where: { cycleId, remediationStatus: { not: 'resolved' } } },
    },
  })

  const results: GapAnalysisResult[] = []

  for (const standard of standards) {
    const gaps = detectGapsForStandard(standard)
    results.push({
      standardId: standard.id,
      standardNumber: standard.standardNumber,
      gaps,
    })

    // Batch upsert gaps — fetch existing unresolved gaps once per standard
    const existingGaps = await prisma.complianceGap.findMany({
      where: { standardId: standard.id, cycleId, remediationStatus: { not: 'resolved' } },
      select: { title: true },
    })
    const existingTitles = new Set(existingGaps.map(g => g.title))

    const newGaps = gaps.filter(gap => !existingTitles.has(gap.title))
    if (newGaps.length > 0) {
      await prisma.complianceGap.createMany({
        data: newGaps.map(gap => ({
          standardId: standard.id,
          cycleId,
          title: gap.title,
          description: `Gap detected: ${gap.title}. ${gap.suggestedActions.join(' ')}`,
          severity: gap.severity,
          missingEvidenceTypes: gap.missingTypes,
          affectedPrograms: gap.affectedPrograms,
          estimatedEffort: gap.estimatedEffort,
          suggestedActions: gap.suggestedActions.map(a => ({
            action: a,
            responsible: 'Department Chair',
            deadline: null,
          })),
        })),
        skipDuplicates: true,
      })
    }
  }

  return results
}

function detectGapsForStandard(
  standard: {
    standardNumber: string
    evidenceTypes: string[]
    collectionFrequency: string
    evidence: { evidenceType: string; quality: string; semesterCode: string | null; programCode: string | null }[]
  },
): GapAnalysisResult['gaps'] {
  const gaps: GapAnalysisResult['gaps'] = []
  const collectedTypes = new Set(standard.evidence.map(e => e.evidenceType))
  const requiredTypes = standard.evidenceTypes

  // Check for missing evidence types
  for (const required of requiredTypes) {
    if (!collectedTypes.has(required)) {
      gaps.push({
        title: `Missing ${required} evidence for Standard ${standard.standardNumber}`,
        severity: determineSeverity(required, standard.collectionFrequency),
        missingTypes: [required],
        affectedPrograms: [],
        suggestedActions: [`Collect ${required} evidence for Standard ${standard.standardNumber}`],
        estimatedEffort: estimateEffort(required),
      })
    }
  }

  // Check evidence quality
  const weakEvidence = standard.evidence.filter(e => e.quality === 'WEAK' || e.quality === 'FAIR')
  if (weakEvidence.length > 0 && standard.evidence.length > 0) {
    const weakRatio = weakEvidence.length / standard.evidence.length
    if (weakRatio > 0.5) {
      gaps.push({
        title: `Low quality evidence for Standard ${standard.standardNumber}`,
        severity: 'major',
        missingTypes: [],
        affectedPrograms: [],
        suggestedActions: [
          'Review and supplement weak evidence items',
          'Consider collecting additional evidence sources',
        ],
        estimatedEffort: '1-2 weeks',
      })
    }
  }

  // Check recency for continuous-collection standards
  if (standard.collectionFrequency === 'continuous') {
    const currentSemester = getCurrentSemester()
    const hasCurrentEvidence = standard.evidence.some(e => e.semesterCode === currentSemester)
    if (!hasCurrentEvidence && standard.evidence.length > 0) {
      gaps.push({
        title: `Stale evidence for Standard ${standard.standardNumber} — no data from current semester`,
        severity: 'minor',
        missingTypes: [],
        affectedPrograms: [],
        suggestedActions: ['Run evidence harvester for current semester data'],
        estimatedEffort: '1 hour',
      })
    }
  }

  return gaps
}

function determineSeverity(evidenceType: string, frequency: string): GapSeverity {
  if (frequency === 'continuous' && ['assessment_data', 'rubric_data'].includes(evidenceType)) return 'critical'
  if (['assessment_data', 'student_support'].includes(evidenceType)) return 'major'
  return 'minor'
}

function estimateEffort(evidenceType: string): string {
  switch (evidenceType) {
    case 'assessment_data': return '1-2 weeks (requires assessment cycle)'
    case 'faculty_credential': return '2-4 weeks (requires HR coordination)'
    case 'syllabi': return '1 week (requires faculty collection)'
    case 'accessibility_report': return '1 day (automated scan)'
    case 'student_support': return '1 semester (requires intervention data accumulation)'
    default: return '1-2 weeks'
  }
}

function getCurrentSemester(): string {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  if (month >= 0 && month <= 4) return `SP${year}`
  if (month >= 5 && month <= 7) return `SU${year}`
  return `FA${year}`
}
