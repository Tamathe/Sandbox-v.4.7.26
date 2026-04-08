/**
 * GET /api/cron/sandcastle-question-timeout
 *
 * Cron: closes any GameShowQuestion that has been open longer than its timeoutMs.
 * Covers the unreliable setTimeout in game-show-service.ts for serverless deployments.
 *
 * Auth: CRON_SECRET Bearer token (timing-safe comparison, fail-closed).
 * Vercel cron schedule: every 2 minutes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { closeQuestion } from '../../../lib/sandcastle/game-show-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const cronError = verifyCronSecret(request)
  if (cronError) return cronError

  const now = Date.now()

  // Find all open questions whose timeout has elapsed
  const timedOutQuestions = await prisma.gameShowQuestion.findMany({
    where: {
      closedAt: null,
      openedAt: { lte: new Date(now - 1) }, // openedAt + timeoutMs < now
    },
    select: { id: true, roomId: true, openedAt: true, timeoutMs: true, room: { select: { hostId: true } } },
  })

  const expired = timedOutQuestions.filter(
    (q) => now - q.openedAt.getTime() >= q.timeoutMs,
  )

  let closed = 0
  for (const q of expired) {
    try {
      await closeQuestion(q.id, q.roomId, q.room.hostId)
      closed++
    } catch (err) {
      console.error(`[cron/sandcastle-question-timeout] failed to close ${q.id}:`, err)
    }
  }

  return NextResponse.json({ ok: true, checked: timedOutQuestions.length, closed }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
