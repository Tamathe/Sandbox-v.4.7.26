import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth
    const { toolId } = await params

    const sessions = await prisma.toolSession.findMany({
      where: {
        toolId,
        userId: user.id,
        messageCount: { gt: 0 }, // Only sessions that had actual interaction
      },
      orderBy: { startedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        messageCount: true,
        notes: true,
        courseId: true,
        score: true,
        summary: true,
        qualitySignal: true,
        durationSeconds: true,
        conceptsTouched: true,
      },
    })

    // Derive enriched session data for the UI
    const enriched = sessions.map(s => ({
      ...s,
      // Derive a topic snippet from the summary (first line after "Covered:")
      topicSummary: s.summary
        ? s.summary.match(/\*\*Covered:\*\*\s*(.+)/)?.[1]?.slice(0, 80) ?? null
        : null,
      // Duration in minutes
      durationMin: s.durationSeconds ? Math.round(s.durationSeconds / 60) : null,
    }))

    return NextResponse.json(enriched, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
