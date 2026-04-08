/**
 * concept-mastery-service.ts
 *
 * Tracks per-student, per-concept mastery across courses.
 * Decay is applied at read time — never written back.
 */

import { prisma } from './prisma'
import type { StudentConceptMastery, Course } from '../generated/prisma'
import { applyMasteryDecay, isMasteryStale } from './mastery-decay'

export type EnrichedMastery = StudentConceptMastery & {
  firstCourse: Course | null
  isStale: boolean
  effectiveMastery: number
}

/**
 * Records one interaction with a concept for a student.
 * score should be 0–1; success threshold is 0.6.
 */
export async function upsertConceptMastery(
  userId: string,
  concept: string,
  courseId: string,
  score: number,
): Promise<void> {
  const normalizedScore = Math.min(1, Math.max(0, score))
  const success = normalizedScore >= 0.6

  // Read existing to compute new masteryLevel and manage array
  const existing = await prisma.studentConceptMastery.findUnique({
    where: { userId_concept: { userId, concept } },
    select: {
      encounterCount: true,
      successCount: true,
      failCount: true,
      coursesEncountered: true,
      firstCourseId: true,
    },
  })

  if (existing) {
    const newEncounterCount = existing.encounterCount + 1
    const newSuccessCount = existing.successCount + (success ? 1 : 0)
    const newFailCount = existing.failCount + (success ? 0 : 1)
    const newMasteryLevel = newSuccessCount / newEncounterCount

    const coursesEncountered = existing.coursesEncountered.includes(courseId)
      ? existing.coursesEncountered
      : [...existing.coursesEncountered, courseId]

    await prisma.studentConceptMastery.update({
      where: { userId_concept: { userId, concept } },
      data: {
        encounterCount: newEncounterCount,
        successCount: newSuccessCount,
        failCount: newFailCount,
        masteryLevel: newMasteryLevel,
        coursesEncountered,
      },
    })
  } else {
    const masteryLevel = success ? 1 : 0
    await prisma.studentConceptMastery.create({
      data: {
        userId,
        concept,
        encounterCount: 1,
        successCount: success ? 1 : 0,
        failCount: success ? 0 : 1,
        masteryLevel,
        coursesEncountered: [courseId],
        firstCourseId: courseId,
      },
    })
  }
}

/**
 * Fetches all concept masteries for a student with decay applied.
 * Does NOT write decay back to the database.
 */
export async function getConceptMasteries(userId: string): Promise<EnrichedMastery[]> {
  const masteries = await prisma.studentConceptMastery.findMany({
    where: { userId },
    include: { firstCourse: true },
    orderBy: { lastSeenAt: 'desc' },
  })

  return masteries.map((m) => ({
    ...m,
    effectiveMastery: applyMasteryDecay(m),
    isStale: isMasteryStale(m),
  }))
}
