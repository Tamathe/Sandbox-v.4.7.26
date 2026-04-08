import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { prisma } from '../../../../lib/prisma'
import type { DrillHistoryEntry, DrillScores } from '../../../../lib/crisis-comms/spokesperson-trainer/types'
import { withErrorHandling } from '../../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  try {
    const sessions = await prisma.toolSession.findMany({
      where: {
        toolId: 'tool-crisis-spokesperson-trainer',
        userId: auth.user.id,
        score: { not: null },
        endedAt: { not: null },
      },
      orderBy: { endedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        notes: true,
        endedAt: true,
      },
    })

    const entries: DrillHistoryEntry[] = sessions
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
            sessionId: s.id,
            scenarioTitle: data.scenarioTitle ?? 'Custom',
            difficulty: data.difficulty ?? 'standard',
            scores: data.scores,
            completedAt: s.endedAt.toISOString(),
          }
        } catch {
          return null
        }
      })
      .filter((e): e is DrillHistoryEntry => e !== null)

    return NextResponse.json(entries, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  } catch (error) {
    console.error('Spokesperson trainer history error:', error)
    return NextResponse.json({ error: 'Failed to load history' }, { status: 500 })
  }
})
