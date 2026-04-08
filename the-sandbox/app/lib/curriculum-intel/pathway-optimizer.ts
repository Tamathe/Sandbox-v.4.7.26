/**
 * Curriculum Intelligence Network — Pathway Optimizer
 *
 * Analyzes which course sequences produce the best mastery outcomes
 * by comparing mastery of dependent concepts based on where students
 * learned the prerequisite.
 */

import { prisma } from '../prisma'
import type { CurriculumInsightData } from './types'

// ── Helpers ─────────────────────────────────────────────────────────────────

interface CourseMasteryComparison {
  courseId: string
  courseTitle: string
  avgMastery: number
  studentCount: number
}

/**
 * For a given target concept and a list of courses that teach its prerequisite,
 * compare the average mastery of students grouped by which course they first
 * encountered the prerequisite concept in.
 */
async function compareMasteryByPrereqCourse(
  prereqCourseIds: string[],
  targetConceptLabel: string,
): Promise<CourseMasteryComparison[]> {
  const targetSlug = targetConceptLabel.replace(/\s+/g, '-').toLowerCase()

  const results: CourseMasteryComparison[] = []

  for (const courseId of prereqCourseIds) {
    // Find students enrolled in this prereq course
    const enrolled = await prisma.courseEnrollment.findMany({
      where: { courseId },
      select: { studentId: true },
    })

    if (enrolled.length === 0) continue

    const userIds = enrolled.map((e: { studentId: string }) => e.studentId)

    // Check their mastery of the target concept
    const masteryRows = await prisma.studentConceptMastery.findMany({
      where: {
        userId: { in: userIds },
        concept: targetSlug,
      },
      select: { masteryLevel: true },
    })

    if (masteryRows.length < 3) continue // Need sufficient sample

    const avg = masteryRows.reduce((s, r) => s + r.masteryLevel, 0) / masteryRows.length

    // Get course title
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { title: true },
    })

    results.push({
      courseId,
      courseTitle: course?.title ?? courseId,
      avgMastery: avg,
      studentCount: masteryRows.length,
    })
  }

  // Sort by mastery descending
  results.sort((a, b) => b.avgMastery - a.avgMastery)
  return results
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function analyzePathwayEffectiveness(): Promise<CurriculumInsightData[]> {
  const insights: CurriculumInsightData[] = []

  // Find edges with strong prerequisite relationships
  const edges = await prisma.curriculumEdge.findMany({
    where: { strength: { gte: 0.7 } },
    include: {
      source: { include: { courses: true } },
      target: { include: { courses: true } },
    },
  })

  for (const edge of edges) {
    // Need at least 2 courses teaching the prerequisite to compare
    const teachingCourses = edge.source.courses.filter(c => c.role === 'teaches')
    if (teachingCourses.length < 2) continue

    const masteryByCourse = await compareMasteryByPrereqCourse(
      teachingCourses.map(c => c.courseId),
      edge.target.label,
    )

    if (masteryByCourse.length < 2) continue

    const best = masteryByCourse[0]
    const worst = masteryByCourse[masteryByCourse.length - 1]
    const delta = best.avgMastery - worst.avgMastery

    if (delta > 0.15) {
      insights.push({
        type: 'pathway-optimization',
        severity: 'significant',
        title: `Students from ${best.courseTitle} master "${edge.target.label}" ${(delta * 100).toFixed(0)}% better`,
        description: `Students who learned "${edge.source.label}" in ${best.courseTitle} achieved ${(best.avgMastery * 100).toFixed(0)}% mastery of "${edge.target.label}" vs. ${(worst.avgMastery * 100).toFixed(0)}% from ${worst.courseTitle} (n=${best.studentCount + worst.studentCount}).`,
        affectedNodes: [edge.sourceId, edge.targetId],
        affectedCourses: [best.courseId, worst.courseId],
        recommendation: `Consider recommending ${best.courseTitle} as the preferred pathway for students heading toward "${edge.target.label}"-dependent courses.`,
      })
    }
  }

  return insights
}
