import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { prisma } from '../../../../lib/prisma'

/**
 * GET /api/study/[toolId]/observation?sessionId=xxx
 *
 * Returns the latest learning observer signals for a session.
 * Used by Study Buddy v2 for real-time adaptation — poll every 3rd turn.
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  }

  // Verify session belongs to this user
  const session = await prisma.toolSession.findFirst({
    where: { id: sessionId, userId: user.id },
    select: { id: true },
  })
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // Get the most recent observation for this session
  const latest = await prisma.learnerObservationLog.findFirst({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
    select: {
      bloomLevel: true,
      bloomConfidence: true,
      cognitiveLoad: true,
      cognitiveLoadConf: true,
      frustrationScore: true,
      frustrationConf: true,
      isProductiveStruggle: true,
      metacognitionScore: true,
      metacognitionConf: true,
      escalated: true,
      turnNumber: true,
      createdAt: true,
    },
  })

  if (!latest) {
    return NextResponse.json({ observation: null }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  // Also get the session's promoted signals (high-confidence readings)
  const sessionSignals = await prisma.toolSession.findUnique({
    where: { id: sessionId },
    select: {
      bloomLevel: true,
      cognitiveLoad: true,
      frustrationScore: true,
      messageCount: true,
    },
  })

  return NextResponse.json({
    observation: {
      ...latest,
      createdAt: latest.createdAt.toISOString(),
    },
    sessionSignals: sessionSignals ? {
      bloomLevel: sessionSignals.bloomLevel,
      cognitiveLoad: sessionSignals.cognitiveLoad,
      frustrationScore: sessionSignals.frustrationScore,
      messageCount: sessionSignals.messageCount,
    } : null,
  })
})
