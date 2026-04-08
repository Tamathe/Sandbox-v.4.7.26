/**
 * episodic-memory-service.ts
 *
 * Surfaces recent, contextually relevant tool sessions to Sandy.
 * FERPA: only fetches sessions where sensitiveSession = false.
 */

import { prisma } from './prisma'

export type EpisodicMemory = {
  toolName: string
  courseCode: string
  conceptsOverlap: string[]
  score: number | null
  createdAt: Date
}

function daysSince(date: Date): number {
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
}

function intersection(a: string[], b: string[]): string[] {
  const setB = new Set(b)
  return a.filter((x) => setB.has(x))
}

/**
 * Returns up to `limit` episodically relevant sessions for Sandy context injection.
 * Scored by recency + concept overlap with currentConcepts.
 */
export async function getEpisodicMemory(
  userId: string,
  currentConcepts: string[],
  limit = 5,
): Promise<EpisodicMemory[]> {
  const sessions = await prisma.toolSession.findMany({
    where: {
      userId,
      sensitiveSession: false,
    },
    select: {
      score: true,
      startedAt: true,
      conceptsTouched: true,
      tool: { select: { name: true } },
      course: { select: { courseCode: true } },
    },
    orderBy: { startedAt: 'desc' },
    take: 50,
  })

  const scored = sessions.map((s) => {
    const days = daysSince(s.startedAt)
    const recencyScore = 1 / (1 + days)
    const overlap = intersection(s.conceptsTouched, currentConcepts)
    const relevanceScore =
      currentConcepts.length > 0 ? overlap.length / currentConcepts.length : 0
    const total = 0.5 * recencyScore + 0.5 * relevanceScore

    return {
      toolName: s.tool.name,
      courseCode: s.course?.courseCode ?? 'General',
      conceptsOverlap: overlap,
      score: s.score,
      createdAt: s.startedAt,
      _total: total,
    }
  })

  return scored
    .sort((a, b) => b._total - a._total)
    .slice(0, limit)
    .map(({ _total: _, ...rest }) => rest)
}

/**
 * Formats episodic memories into a Sandy context block (~360 tokens max).
 */
export function formatEpisodicBlock(memories: EpisodicMemory[]): string {
  if (memories.length === 0) return ''

  const lines = memories.map((m) => {
    const scorePart = m.score != null ? ` (score: ${Math.round(m.score * 100)}%)` : ''
    const conceptPart =
      m.conceptsOverlap.length > 0 ? ` — covered: ${m.conceptsOverlap.slice(0, 3).join(', ')}` : ''
    return `- ${m.toolName} in ${m.courseCode}${scorePart}${conceptPart}`
  })

  return `Recent relevant sessions:\n${lines.join('\n')}`
}
