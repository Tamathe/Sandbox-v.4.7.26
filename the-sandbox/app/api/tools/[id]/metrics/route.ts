import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { PlatformQuestType } from '../../../../generated/prisma'
import { awardQuestProgress } from '../../../../lib/platform-quests'
import { sendDirectMessage } from '../../../../lib/messaging'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Validate webhook secret
    const authHeader = req.headers.get('Authorization') || ''
    const urlSecret = req.nextUrl.searchParams.get('secret') || ''
    const providedSecret = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : urlSecret

    const tool = await prisma.tool.findUnique({ where: { id } })
    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }

    if (!providedSecret || providedSecret !== tool.webhookSecret) {
      return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 })
    }

    const body = await req.json()
    const { sessionId, metrics } = body

    if (!metrics || !Array.isArray(metrics)) {
      return NextResponse.json({ error: 'metrics array is required' }, { status: 400 })
    }

    const session = sessionId
      ? await prisma.toolSession.findUnique({
          where: { id: String(sessionId) },
          select: { id: true, userId: true, courseId: true },
        })
      : null

    const events = await prisma.metricEvent.createMany({
      data: metrics.map((m: { name: string; value: string | number }) => ({
        toolId: id,
        sessionId: sessionId || null,
        metricName: String(m.name),
        metricValue: String(m.value),
      })),
    })

    const scoreMetric = metrics.find((metric: { name: string; value: string | number }) => {
      if (String(metric.name).toLowerCase() !== 'score') return false
      return Number.isFinite(Number(metric.value))
    })

    if (session?.userId && scoreMetric) {
      const score = Number(scoreMetric.value)

      await prisma.leaderboardEntry.create({
        data: {
          userId: session.userId,
          toolId: id,
          courseId: session.courseId ?? null,
          score,
          metricKey: 'score',
          sessionId: session.id,
        },
      }).catch(() => {})

      await awardQuestProgress(session.userId, PlatformQuestType.SCORE_ABOVE_THRESHOLD, { score }).catch(() => {})
      await awardQuestProgress(session.userId, PlatformQuestType.HIGH_SCORE_N_TOOLS, { score }).catch(() => {})

      const activeChallenge = await prisma.challenge.findFirst({
        where: {
          challengedId: session.userId,
          toolId: id,
          status: { in: ['PENDING', 'ACCEPTED'] },
          expiresAt: { gt: new Date() },
        },
        include: {
          challenged: { select: { id: true, name: true } },
          tool: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      if (activeChallenge) {
        await prisma.challenge.update({
          where: { id: activeChallenge.id },
          data: {
            status: 'COMPLETED',
            challengedScore: score,
            completedAt: new Date(),
          },
        }).catch(() => {})

        await sendDirectMessage(
          session.userId,
          activeChallenge.challengerId,
          `${activeChallenge.challenged.name} finished "${activeChallenge.tool.name}" with a score of ${Math.round(score)}%. ${score > activeChallenge.challengerScore ? 'They beat your score.' : 'Your score still stands.'}`
        ).catch(() => {})
      }
    }

    return NextResponse.json({ success: true, created: events.count })
  } catch (error) {
    console.error('POST /api/tools/[id]/metrics error:', error)
    return NextResponse.json({ error: 'Failed to record metrics' }, { status: 500 })
  }
}
