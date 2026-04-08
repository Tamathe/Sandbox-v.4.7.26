import { prisma } from '../prisma'

/** Re-score quality for all evidence in a cycle */
export async function rescoreAllEvidence(cycleId: string): Promise<{ rescored: number }> {
  const evidence = await prisma.accreditationEvidence.findMany({
    where: { cycleId },
    include: { standard: true },
  })

  let rescored = 0
  for (const e of evidence) {
    const quality = computeQuality(e)
    await prisma.accreditationEvidence.update({
      where: { id: e.id },
      data: {
        quality: quality.level as 'EXCELLENT' | 'GOOD' | 'FAIR' | 'WEAK' | 'MISSING',
        qualityScore: quality.score,
        completeness: quality.completeness,
        recency: quality.recency,
        alignment: quality.alignment,
        qualityNotes: quality.notes,
      },
    })
    rescored++
  }

  return { rescored }
}

function computeQuality(evidence: {
  sourceCount: number
  semesterCode: string | null
  evidenceType: string
  dataSnapshot: unknown
  standard: { evidenceTypes: string[]; standardNumber: string }
}): {
  level: string
  score: number
  completeness: number
  recency: number
  alignment: number
  notes: string
} {
  const completeness = Math.min(1, evidence.sourceCount / getExpectedCount(evidence.evidenceType))
  const recency = computeRecency(evidence.semesterCode)
  const alignment = evidence.standard.evidenceTypes.includes(evidence.evidenceType) ? 0.9 : 0.5

  // Composite quality score
  const score = completeness * 0.4 + recency * 0.35 + alignment * 0.25

  let level: string
  if (score >= 0.8) level = 'EXCELLENT'
  else if (score >= 0.6) level = 'GOOD'
  else if (score >= 0.4) level = 'FAIR'
  else if (score >= 0.2) level = 'WEAK'
  else level = 'MISSING'

  const notes = [
    `Completeness: ${(completeness * 100).toFixed(0)}%`,
    `Recency: ${(recency * 100).toFixed(0)}%`,
    `Alignment: ${(alignment * 100).toFixed(0)}%`,
  ].join('. ')

  return { level, score, completeness, recency, alignment, notes }
}

function getExpectedCount(evidenceType: string): number {
  switch (evidenceType) {
    case 'assessment_data': return 200
    case 'rubric_data': return 100
    case 'competency_data': return 50
    case 'syllabi': return 30
    case 'accessibility_report': return 50
    case 'student_support': return 20
    case 'feedback': return 50
    default: return 10
  }
}

function computeRecency(semesterCode: string | null): number {
  if (!semesterCode) return 0.5
  const now = new Date()
  const year = parseInt(semesterCode.slice(2))
  const currentYear = now.getFullYear()
  const yearDiff = currentYear - year

  if (yearDiff === 0) return 1.0
  if (yearDiff === 1) return 0.8
  if (yearDiff === 2) return 0.5
  if (yearDiff === 3) return 0.3
  return 0.1
}
