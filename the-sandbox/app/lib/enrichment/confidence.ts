// ─── Confidence Scoring ───────────────────────────────────────────────────────
// Computes per-field and overall confidence scores for an enrichment result.

import type {
  EnrichmentProfile,
  EnrichedCourse,
  EnrichedInterest,
  ConfidenceLevel,
} from './types'

type ScoreInput = {
  profile:   EnrichmentProfile
  courses:   EnrichedCourse[]
  interests: EnrichedInterest[]
}

/**
 * Returns a confidence score 0.0–1.0 and a categorical level.
 *
 * Weights:
 *   - name found from real source (not just email parse): +0.20
 *   - title present:                                      +0.20
 *   - department present:                                 +0.15
 *   - college present:                                    +0.15
 *   - role is not UNKNOWN:                                +0.15
 *   - at least one course found:                          +0.10
 *   - at least two interests found:                       +0.05
 */
export function scoreConfidence(input: ScoreInput): {
  score: number
  level: ConfidenceLevel
} {
  const { profile, courses, interests } = input
  let score = 0

  // Name came from a real source (not just email parse)
  if (profile.name.source !== 'email-parse') score += 0.20
  else score += 0.05 // partial credit for parsed name

  if (profile.title.value)      score += 0.20
  if (profile.department.value) score += 0.15
  if (profile.college.value)    score += 0.15
  if (profile.role.value !== 'UNKNOWN') score += 0.15
  if (courses.length > 0)       score += 0.10
  if (interests.length >= 2)    score += 0.05

  // Cap at 1.0
  const capped = Math.min(1.0, score)

  const level: ConfidenceLevel =
    capped >= 0.80 ? 'high'
    : capped >= 0.50 ? 'medium'
    : 'low'

  return { score: Math.round(capped * 100) / 100, level }
}
