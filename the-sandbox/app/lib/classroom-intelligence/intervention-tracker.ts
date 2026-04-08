import { prisma } from '../prisma'
import type { Prisma } from '../../generated/prisma'
import type { Approach } from './types'

// ─── Intervention Tracker ──────────────────────────────────────────────────
// Records teaching interventions and measures their outcomes over time.

/** Record a new teaching intervention and capture pre-metrics */
export async function recordIntervention(input: {
  courseId: string
  instructorId: string
  approach: Approach
  description: string
  targetConcepts: string[]
  targetWeekId?: string
  insightCardId?: string
}): Promise<string> {
  const preMetrics = await captureConceptMetrics(input.courseId, input.targetConcepts)

  const intervention = await prisma.teachingIntervention.create({
    data: {
      courseId: input.courseId,
      instructorId: input.instructorId,
      approach: input.approach,
      description: input.description,
      targetConcepts: input.targetConcepts,
      targetWeekId: input.targetWeekId ?? null,
      insightCardId: input.insightCardId ?? null,
      preMetrics: preMetrics as Prisma.InputJsonValue,
      status: 'active',
    },
  })

  // If linked to an insight card, update it with the action taken
  if (input.insightCardId) {
    await prisma.instructorInsightCard.update({
      where: { id: input.insightCardId },
      data: {
        actionTaken: input.description,
        actionApproach: input.approach,
        respondedAt: new Date(),
        interventionId: intervention.id,
      },
    })
  }

  return intervention.id
}

/** Measure outcomes for active interventions that are at least 7 days old */
export async function measureInterventionOutcomes(): Promise<{ measured: number }> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const activeInterventions = await prisma.teachingIntervention.findMany({
    where: {
      status: 'active',
      createdAt: { lte: sevenDaysAgo },
    },
  })

  let measured = 0

  for (const intervention of activeInterventions) {
    const postMetrics = await captureConceptMetrics(
      intervention.courseId,
      intervention.targetConcepts
    )

    const pre = intervention.preMetrics as Record<string, unknown>
    const preAvg = (pre.avgMastery as number) ?? 0
    const postAvg = (postMetrics.avgMastery as number) ?? 0
    const delta = postAvg - preAvg

    // Simplified Cohen's d: delta / 0.15 (using 0.15 as a practical SD estimate)
    const effectSize = delta / 0.15

    let status: string
    if (delta > 0.1) {
      status = 'effective'
    } else if (delta < -0.05) {
      status = 'ineffective'
    } else {
      status = 'inconclusive'
    }

    await prisma.teachingIntervention.update({
      where: { id: intervention.id },
      data: {
        postMetrics: postMetrics as Prisma.InputJsonValue,
        effectSize,
        improved: delta > 0,
        status,
        measurementDate: new Date(),
      },
    })

    measured++
  }

  return { measured }
}

/** Capture current concept metrics for a set of concepts in a course */
export async function captureConceptMetrics(
  courseId: string,
  concepts: string[]
): Promise<{ avgMastery: number; masteryRate: number; studentCount: number; conceptCount: number }> {
  // StudentConceptMastery uses coursesEncountered[] (string array), not a direct courseId FK
  // and uses masteryLevel (not masteryScore)
  const records = await prisma.studentConceptMastery.findMany({
    where: {
      coursesEncountered: { has: courseId },
      concept: { in: concepts },
    },
  })

  if (records.length === 0) {
    return {
      avgMastery: 0,
      masteryRate: 0,
      studentCount: 0,
      conceptCount: 0,
    }
  }

  const masteryScores = records.map(r => r.masteryLevel)
  const avgMastery = masteryScores.reduce((a, b) => a + b, 0) / masteryScores.length
  const masteryRate = masteryScores.filter(s => s >= 0.7).length / masteryScores.length

  // Count unique students
  const uniqueStudents = new Set(records.map(r => r.userId))
  // Count unique concepts found
  const uniqueConcepts = new Set(records.map(r => r.concept))

  return {
    avgMastery,
    masteryRate,
    studentCount: uniqueStudents.size,
    conceptCount: uniqueConcepts.size,
  }
}

/** Get intervention effectiveness grouped by approach for a course */
export async function getInterventionEffectiveness(courseId: string): Promise<{
  byApproach: {
    approach: string
    total: number
    effective: number
    avgEffectSize: number | null
  }[]
  bestApproach: string | null
  totalInterventions: number
}> {
  const interventions = await prisma.teachingIntervention.findMany({
    where: {
      courseId,
      status: { in: ['effective', 'ineffective', 'inconclusive'] },
    },
  })

  // Group by approach
  const grouped = new Map<string, { total: number; effective: number; effectSizes: number[] }>()

  for (const intervention of interventions) {
    const approach = intervention.approach as string
    if (!grouped.has(approach)) {
      grouped.set(approach, { total: 0, effective: 0, effectSizes: [] })
    }
    const group = grouped.get(approach)!
    group.total++
    if (intervention.status === 'effective') group.effective++
    if (intervention.effectSize !== null) group.effectSizes.push(intervention.effectSize)
  }

  const byApproach = Array.from(grouped.entries()).map(([approach, data]) => ({
    approach,
    total: data.total,
    effective: data.effective,
    avgEffectSize: data.effectSizes.length > 0
      ? data.effectSizes.reduce((a, b) => a + b, 0) / data.effectSizes.length
      : null,
  }))

  // Find best approach: highest effective rate with at least 2 total
  let bestApproach: string | null = null
  let bestRate = 0
  for (const entry of byApproach) {
    if (entry.total >= 2) {
      const rate = entry.effective / entry.total
      if (rate > bestRate) {
        bestRate = rate
        bestApproach = entry.approach
      }
    }
  }

  return {
    byApproach,
    bestApproach,
    totalInterventions: interventions.length,
  }
}

/** Get enrolled student count for a course */
export async function getEnrolledCount(courseId: string): Promise<number> {
  return prisma.courseEnrollment.count({
    where: { courseId },
  })
}
