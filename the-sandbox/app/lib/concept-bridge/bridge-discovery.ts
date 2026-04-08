/**
 * Cross-Course Concept Bridge — Bridge Discovery Engine
 *
 * Automatically finds equivalent concepts across courses using normalized
 * name comparison and keyword overlap. Runs as a weekly cron job.
 */

import { prisma } from '../prisma'
import type { BridgeDiscoveryResult } from './types'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Discover new concept bridges across all courses.
 * Compares ConceptState entries across courses using normalized slug similarity.
 */
export async function discoverBridges(): Promise<BridgeDiscoveryResult> {
  // 1. Get all unique concept slugs across courses
  const concepts = await prisma.conceptState.findMany({
    distinct: ['conceptSlug', 'courseId'],
    select: { conceptSlug: true, courseId: true },
  })

  // 2. Find potential matches using normalized slug comparison
  const candidates: Array<{
    a: { conceptSlug: string; courseId: string }
    b: { conceptSlug: string; courseId: string }
    similarity: number
  }> = []

  for (let i = 0; i < concepts.length; i++) {
    for (let j = i + 1; j < concepts.length; j++) {
      if (concepts[i].courseId === concepts[j].courseId) continue // Same course — skip

      const similarity = computeConceptSimilarity(concepts[i], concepts[j])
      if (similarity >= 0.6) {
        candidates.push({ a: concepts[i], b: concepts[j], similarity })
      }
    }
  }

  // 3. Create bridges for qualifying candidates
  let created = 0
  for (const candidate of candidates) {
    const existing = await prisma.conceptBridge.findUnique({
      where: {
        conceptA_courseA_conceptB_courseB: {
          conceptA: candidate.a.conceptSlug,
          courseA: candidate.a.courseId,
          conceptB: candidate.b.conceptSlug,
          courseB: candidate.b.courseId,
        },
      },
    })
    if (existing) continue

    // Also check reverse direction
    const existingReverse = await prisma.conceptBridge.findUnique({
      where: {
        conceptA_courseA_conceptB_courseB: {
          conceptA: candidate.b.conceptSlug,
          courseA: candidate.b.courseId,
          conceptB: candidate.a.conceptSlug,
          courseB: candidate.a.courseId,
        },
      },
    })
    if (existingReverse) continue

    const bridgeType = classifyBridgeType(candidate.similarity)

    await prisma.conceptBridge.create({
      data: {
        conceptA: candidate.a.conceptSlug,
        courseA: candidate.a.courseId,
        conceptB: candidate.b.conceptSlug,
        courseB: candidate.b.courseId,
        similarity: candidate.similarity,
        bridgeType,
        createdBy: 'auto',
      },
    })
    created++
  }

  return { created, verified: 0 }
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function computeConceptSimilarity(
  a: { conceptSlug: string },
  b: { conceptSlug: string },
): number {
  const nameA = normalizeConcept(a.conceptSlug)
  const nameB = normalizeConcept(b.conceptSlug)

  // Exact match after normalization
  if (nameA === nameB) return 1.0

  // Keyword overlap (Jaccard index)
  const wordsA = new Set(nameA.split(/[\s-]+/).filter(Boolean))
  const wordsB = new Set(nameB.split(/[\s-]+/).filter(Boolean))
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)))
  const union = new Set([...wordsA, ...wordsB])
  const jaccard = union.size > 0 ? intersection.size / union.size : 0

  return Math.min(1, jaccard)
}

function normalizeConcept(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function classifyBridgeType(similarity: number): string {
  if (similarity >= 0.95) return 'identical'
  if (similarity >= 0.7) return 'overlapping'
  return 'overlapping'
}
