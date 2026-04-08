/**
 * transfer-event-service.ts
 *
 * Detects and records cross-course concept transfer events.
 */

import { prisma } from './prisma'
import { invalidateCurriculumSignalCache } from './curriculum-signal-service'

/**
 * Detects whether a student is applying a concept learned in a different course.
 * Upserts a TransferEvent if all detection conditions are met.
 */
export async function detectAndUpsertTransferEvent(
  userId: string,
  concept: string,
  currentCourseId: string,
  score: number,
): Promise<void> {
  const mastery = await prisma.studentConceptMastery.findUnique({
    where: { userId_concept: { userId, concept } },
    select: {
      firstCourseId: true,
      coursesEncountered: true,
      successCount: true,
      encounterCount: true,
    },
  })

  if (!mastery) return
  if (!mastery.firstCourseId) return

  const transferRate =
    mastery.encounterCount > 0 ? mastery.successCount / mastery.encounterCount : 0

  const isTransfer =
    score >= 0.7 &&
    mastery.firstCourseId !== currentCourseId &&
    mastery.coursesEncountered.length >= 2 &&
    transferRate >= 0.6

  if (!isTransfer) return

  await prisma.transferEvent.upsert({
    where: {
      userId_concept_targetCourseId: {
        userId,
        concept,
        targetCourseId: currentCourseId,
      },
    },
    create: {
      userId,
      concept,
      sourceCourseId: mastery.firstCourseId,
      targetCourseId: currentCourseId,
      sessionScore: score,
    },
    update: {
      sessionScore: score,
    },
  })

  invalidateCurriculumSignalCache()
}
