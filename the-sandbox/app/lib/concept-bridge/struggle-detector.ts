/**
 * Cross-Course Concept Bridge — Struggle Detector
 *
 * Called after concept mastery updates, flashcard reviews, and quiz completions.
 * Detects struggle patterns and triggers bridge recommendations.
 */

import { prisma } from '../prisma'
import { generateBridgeRecommendations } from './bridge-recommender'
import type { BridgeRecommendationData, StruggleSignal } from './types'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check if a student is struggling with a concept and generate cross-course
 * recommendations if bridges exist.
 *
 * Returns null if:
 * - A recent non-dismissed recommendation already exists for this concept
 * - The student's mastery is above the struggle threshold (0.5)
 * - No concept bridges exist for this concept
 */
export async function checkForStruggle(
  userId: string,
  concept: string,
  courseId: string,
  _signal: StruggleSignal,
): Promise<BridgeRecommendationData | null> {
  // Check if we already have a recent recommendation for this concept
  const existing = await prisma.bridgeRecommendation.findFirst({
    where: {
      userId,
      concept: { contains: concept, mode: 'insensitive' },
      courseId,
      status: { not: 'dismissed' },
      expiresAt: { gt: new Date() },
    },
  })
  if (existing) return null // Don't spam

  // Verify the student is actually struggling (not just one bad session)
  const mastery = await prisma.studentConceptMastery.findFirst({
    where: {
      userId,
      concept: { contains: concept, mode: 'insensitive' },
    },
  })
  if (mastery && mastery.masteryLevel > 0.5) return null // Not struggling enough

  // Check if bridges exist for this concept
  const bridgeCount = await prisma.conceptBridge.count({
    where: {
      OR: [
        { conceptA: { contains: concept, mode: 'insensitive' } },
        { conceptB: { contains: concept, mode: 'insensitive' } },
      ],
    },
  })
  if (bridgeCount === 0) return null // No cross-course resources available

  return generateBridgeRecommendations(userId, concept, courseId)
}
