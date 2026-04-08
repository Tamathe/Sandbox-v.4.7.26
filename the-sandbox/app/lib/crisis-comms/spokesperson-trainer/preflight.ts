/**
 * Spokesperson Trainer preflight — user context + past drill history.
 */

import { prisma } from '../../prisma'
import type { SpokespersonPreflight, PastDrill, DrillScores } from './types'

const TOOL_ID = 'tool-crisis-spokesperson-trainer'

export async function getSpokespersonTrainerPreflight(
  userId: string,
): Promise<SpokespersonPreflight> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true, role: true, department: true },
  })

  const sessions = await prisma.toolSession.findMany({
    where: {
      toolId: TOOL_ID,
      userId,
      score: { not: null },
      endedAt: { not: null },
    },
    orderBy: { endedAt: 'desc' },
    take: 20,
    select: {
      id: true,
      notes: true,
      score: true,
      endedAt: true,
    },
  })

  const pastDrills: PastDrill[] = sessions
    .map((s) => {
      if (!s.notes || !s.endedAt) return null
      try {
        const data = JSON.parse(s.notes) as {
          scenarioTitle?: string
          difficulty?: string
          scores?: DrillScores
        }
        if (!data.scores) return null
        return {
          id: s.id,
          scenarioTitle: data.scenarioTitle ?? 'Custom',
          difficulty: data.difficulty ?? 'standard',
          scores: data.scores,
          completedAt: s.endedAt.toISOString(),
        }
      } catch {
        return null
      }
    })
    .filter((d): d is PastDrill => d !== null)

  const totalDrillCount = await prisma.toolSession.count({
    where: { toolId: TOOL_ID, userId, score: { not: null } },
  })

  return {
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
    },
    pastDrills,
    totalDrillCount,
  }
}
