/**
 * domain-modality-service.ts
 *
 * Tracks per-student, per-domain preferred learning modality.
 * Used to inject modality hints into Sandy's system prompt.
 */

import { prisma } from './prisma'

/**
 * Cold-start bootstrap — creates a record if none exists.
 * update: {} guarantees we NEVER overwrite real data.
 */
export async function bootstrapDomainModality(userId: string, domain: string): Promise<void> {
  await prisma.studentDomainModality.upsert({
    where: { userId_domain: { userId, domain } },
    create: {
      userId,
      domain,
      preferredModality: 'text',
      confidenceScore: 0.1,
      sessionCount: 0,
      modalityScores: {},
    },
    update: {},
  })
}

/**
 * Updates modality scores for a domain after a tool session completes.
 * Recomputes preferred modality and confidence.
 */
export async function updateDomainModality(
  userId: string,
  domain: string,
  modality: string,
  score: number,
): Promise<void> {
  const existing = await prisma.studentDomainModality.findUnique({
    where: { userId_domain: { userId, domain } },
    select: { modalityScores: true, sessionCount: true },
  })

  const rawScores = (existing?.modalityScores ?? {}) as Record<string, number>
  const currentScore = rawScores[modality] ?? 0
  // Exponential moving average: blend old score with new
  rawScores[modality] = currentScore * 0.7 + score * 0.3

  // Preferred modality = highest-scored
  const preferredModality = Object.entries(rawScores).sort(([, a], [, b]) => b - a)[0]?.[0] ?? modality

  const newSessionCount = (existing?.sessionCount ?? 0) + 1
  const confidenceScore = Math.min(1, newSessionCount / 10)

  await prisma.studentDomainModality.upsert({
    where: { userId_domain: { userId, domain } },
    create: {
      userId,
      domain,
      preferredModality,
      confidenceScore,
      sessionCount: 1,
      modalityScores: rawScores,
    },
    update: {
      preferredModality,
      confidenceScore,
      sessionCount: newSessionCount,
      modalityScores: rawScores,
    },
  })
}

/**
 * Returns a Sandy context string for modality hints.
 * Empty string if no record or domain has no useful signal.
 */
export async function getDomainModalityBlock(userId: string, domain: string): Promise<string> {
  if (!domain) return ''

  const record = await prisma.studentDomainModality.findUnique({
    where: { userId_domain: { userId, domain } },
    select: { preferredModality: true, confidenceScore: true, sessionCount: true },
  })

  if (!record) return ''

  if (record.confidenceScore < 0.2) {
    return `Student recently enrolled in ${domain}. No modality preference established yet. Use varied formats.`
  }

  const pct = Math.round(record.confidenceScore * 100)
  return `Student learns ${domain} best via ${record.preferredModality} (confidence: ${pct}%). Prefer this format.`
}
