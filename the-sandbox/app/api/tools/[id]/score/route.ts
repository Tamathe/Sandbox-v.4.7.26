import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const email = req.headers.get('x-demo-user-email')
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const sessionIds = await prisma.toolSession.findMany({
      where: {
        toolId: id,
        userId: user.id,
      },
      select: { id: true },
    }).then((sessions) => sessions.map((session) => session.id))

    if (sessionIds.length === 0) {
      return NextResponse.json({ bestScore: null, latestScore: null })
    }

    const events = await prisma.metricEvent.findMany({
      where: {
        toolId: id,
        sessionId: { in: sessionIds },
        metricName: 'score',
      },
      orderBy: { createdAt: 'desc' },
      select: {
        metricValue: true,
        createdAt: true,
      },
    })

    const numericScores = events
      .map((event) => Number(event.metricValue))
      .filter((value) => Number.isFinite(value))

    return NextResponse.json({
      bestScore: numericScores.length ? Math.max(...numericScores) : null,
      latestScore: numericScores.length ? numericScores[0] ?? null : null,
    })
  } catch (error) {
    console.error('GET /api/tools/[id]/score error:', error)
    return NextResponse.json({ error: 'Failed to fetch score summary' }, { status: 500 })
  }
}
