import { ArticulationRecommendation, UserRole } from '../generated/prisma'

export function getEmailDomain(email: string) {
  const [, domain] = email.toLowerCase().split('@')
  return domain ?? null
}

export function clampSimilarityScore(score: number) {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(100, Math.round(score * 10) / 10))
}

export function recommendationForScore(score: number): ArticulationRecommendation {
  if (score >= 90) return ArticulationRecommendation.APPROVE
  if (score < 70) return ArticulationRecommendation.DENY
  return ArticulationRecommendation.NEEDS_REVIEW
}

export function canReviewArticulations(role: UserRole) {
  return role === UserRole.ADMIN || role === UserRole.EDUCATOR
}

export function extractJsonObject(text: string) {
  const trimmed = text.trim()

  try {
    return JSON.parse(trimmed) as Record<string, unknown>
  } catch {}

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('Model did not return a JSON object')
  }

  return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>
}
