import { prisma } from '../prisma'
import { DEFAULT_SIGNAL_WEIGHTS } from './types'

/**
 * Personalize signal weights based on a student's engagement fingerprint.
 * Students who are naturally social get higher weight on commons (more signal if they stop).
 * Students who rely heavily on flashcards get higher weight on flashcard consistency.
 */
export async function getPersonalizedWeights(userId: string): Promise<Record<string, number>> {
  const fingerprint = await prisma.engagementFingerprint.findUnique({
    where: { userId },
  })

  if (!fingerprint || fingerprint.confidence < 0.3) return DEFAULT_SIGNAL_WEIGHTS

  const weights = { ...DEFAULT_SIGNAL_WEIGHTS }

  if (fingerprint.socialOrientation === 'community-active' || fingerprint.socialOrientation === 'small-group') {
    weights.commonsParticipation = 0.10
    weights.toolEngagement = 0.02
  }

  if (fingerprint.preferredStudyModes && fingerprint.preferredStudyModes.includes('flashcards')) {
    weights.flashcardConsistency = 0.15
    weights.contentAccess = 0.01
  }

  if (fingerprint.chronotype === 'night-owl') {
    weights.loginFrequency = 0.05
    weights.gradeTrend = 0.18
  }

  if (fingerprint.deadlineProximity === 'planner') {
    weights.assignmentSubmission = 0.25
  }

  // Normalize to sum to 1.0
  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  for (const key of Object.keys(weights)) {
    weights[key] = weights[key] / total
  }

  return weights
}
