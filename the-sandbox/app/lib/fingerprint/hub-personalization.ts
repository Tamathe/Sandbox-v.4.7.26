// ── Engagement Fingerprint — Hub Tool Personalization ────────────────────────
// Reorders tools within collections based on the user's fingerprint affinity.

import { getFingerprint } from './fingerprint-service'
import type { ComputedFingerprint } from './types'
import { prisma } from '../prisma'

/** Minimal tool shape from DB collections */
interface CollectionTool {
  id: string
  pinned?: boolean
  tool: {
    id: string
    name: string
    shortDescription: string
    category: string
    toolType: string
    [key: string]: unknown
  }
}

/** A collection with tools that can be reordered */
interface PersonalizableCollection {
  id: string
  tools: CollectionTool[]
  [key: string]: unknown
}

/**
 * Reorder tools within each collection based on the user's engagement fingerprint.
 * Returns collections unchanged if fingerprint is null or confidence too low.
 * Pinned tools always stay first.
 */
export async function personalizeCollectionOrder<T extends PersonalizableCollection>(
  userId: string,
  collections: T[],
): Promise<T[]> {
  const fp = await getFingerprint(userId)
  if (!fp || fp.meta.confidence < 0.3) return collections

  // Fetch active learning goal keywords for goal-aware boosting
  const goalKeywords = await getGoalKeywords(userId)

  return collections.map(collection => ({
    ...collection,
    tools: reorderTools(collection.tools, fp, goalKeywords),
  }))
}

/** Extract keywords from active learning goals for tool affinity boosting */
async function getGoalKeywords(userId: string): Promise<string[]> {
  try {
    const goals = await prisma.learningGoal.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { title: true, category: true },
      take: 5,
    })
    if (goals.length === 0) return []

    // Extract meaningful words from goal titles and categories
    const stopWords = new Set(['i', 'to', 'the', 'a', 'an', 'and', 'or', 'want', 'learn', 'understand', 'become', 'better', 'how', 'what', 'be', 'at', 'in', 'of', 'for', 'my'])
    const words = goals
      .flatMap(g => [g.title, g.category ?? ''].join(' ').toLowerCase().split(/\s+/))
      .filter(w => w.length > 2 && !stopWords.has(w))
    return [...new Set(words)]
  } catch {
    return []
  }
}

function reorderTools(tools: CollectionTool[], fp: ComputedFingerprint, goalKeywords: string[] = []): CollectionTool[] {
  // Pinned tools always come first, in their original order
  const pinned = tools.filter(t => t.pinned)
  const unpinned = tools.filter(t => !t.pinned)

  const scored = unpinned
    .map(t => ({ entry: t, score: computeToolAffinity(t.tool, fp, goalKeywords) }))
    .sort((a, b) => b.score - a.score)

  return [...pinned, ...scored.map(s => s.entry)]
}

function computeToolAffinity(
  tool: { name: string; shortDescription: string; category: string; toolType: string },
  fp: ComputedFingerprint,
  goalKeywords: string[] = [],
): number {
  let score = 0
  const nameLower = tool.name.toLowerCase()
  const descLower = tool.shortDescription.toLowerCase()
  const catLower = tool.category.toLowerCase()
  const combined = `${nameLower} ${descLower} ${catLower}`

  // Modality match: boost tools whose description/name aligns with preferred modality
  const modality = fp.learning.preferredModality
  if (modality !== 'mixed') {
    const modalityKeywords: Record<string, string[]> = {
      visual: ['visual', 'diagram', 'chart', 'map', 'graph', 'image', 'viewer', 'simulator'],
      auditory: ['audio', 'listen', 'podcast', 'speech', 'ear', 'voice', 'music'],
      kinesthetic: ['interactive', 'simulation', 'hands-on', 'sandbox', 'lab', 'builder', 'drag'],
      reading: ['reading', 'text', 'write', 'essay', 'document', 'brief', 'annotator', 'literature'],
    }
    const keywords = modalityKeywords[modality] || []
    if (keywords.some(kw => combined.includes(kw))) score += 2
  }

  // Collaborative match: boost collaborative tools for social users
  if (fp.social.collaborationIndex > 0.3) {
    const collabKeywords = ['group', 'collab', 'team', 'peer', 'live', 'room', 'debate', 'teach-back']
    if (collabKeywords.some(kw => combined.includes(kw))) score += 1.5
  }

  // Study mode match: boost tools whose name matches a preferred study mode
  for (const mode of fp.learning.preferredStudyModes) {
    if (combined.includes(mode.toLowerCase())) score += 3
  }

  // Cadence-appropriate tools
  if (fp.temporal.sessionCadence === 'sprint-rester' || fp.temporal.sessionCadence === 'binge-learner') {
    // Quick-use tools get a boost for users who do concentrated sessions
    const quickKeywords = ['quick', 'flash', 'quiz', 'checker', 'scan']
    if (quickKeywords.some(kw => combined.includes(kw))) score += 1
  } else if (fp.temporal.sessionCadence === 'daily-grinder') {
    // Deep-work tools for consistent users
    const deepKeywords = ['deep', 'research', 'analysis', 'comprehensive', 'study', 'review']
    if (deepKeywords.some(kw => combined.includes(kw))) score += 1
  }

  // Goal-aligned boost: tools matching active learning goal keywords get priority
  if (goalKeywords.length > 0) {
    const matchCount = goalKeywords.filter(kw => combined.includes(kw)).length
    score += matchCount * 2.5
  }

  return score
}
