import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'
import { sendDirectMessage } from '../../lib/messaging'

async function getCurrentUser(request: NextRequest) {
  const userEmail = request.headers.get('x-demo-user-email')
  if (!userEmail) return null
  return prisma.user.findUnique({ where: { email: userEmail } })
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.challenge.updateMany({
      where: {
        status: { in: ['PENDING', 'ACCEPTED'] },
        expiresAt: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    }).catch(() => {})

    const [pending, issued] = await Promise.all([
      prisma.challenge.findMany({
        where: {
          challengedId: currentUser.id,
          status: { in: ['PENDING', 'ACCEPTED'] },
        },
        include: {
          challenger: { select: { id: true, name: true } },
          tool: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.challenge.findMany({
        where: {
          challengerId: currentUser.id,
        },
        include: {
          challenged: { select: { id: true, name: true } },
          tool: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return NextResponse.json({ pending, issued })
  } catch (error) {
    console.error('GET /api/challenges error:', error)
    return NextResponse.json({ error: 'Failed to fetch challenges' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const toolId = String(body.toolId || '')
    const challengedUserId = String(body.challengedUserId || '')
    if (!toolId || !challengedUserId) {
      return NextResponse.json({ error: 'toolId and challengedUserId are required' }, { status: 400 })
    }

    const [tool, challengedUser] = await Promise.all([
      prisma.tool.findUnique({ where: { id: toolId }, select: { id: true, name: true } }),
      prisma.user.findUnique({ where: { id: challengedUserId }, select: { id: true, name: true } }),
    ])

    if (!tool || !challengedUser) {
      return NextResponse.json({ error: 'Tool or user not found' }, { status: 404 })
    }

    const sessionIds = await prisma.toolSession.findMany({
      where: {
        toolId,
        userId: currentUser.id,
      },
      select: { id: true },
    }).then((sessions) => sessions.map((session) => session.id))

    if (sessionIds.length === 0) {
      return NextResponse.json({ error: 'You need a scored session before issuing a challenge' }, { status: 400 })
    }

    const scoreEvents = await prisma.metricEvent.findMany({
      where: {
        toolId,
        sessionId: { in: sessionIds },
        metricName: 'score',
      },
      orderBy: { createdAt: 'desc' },
      select: { metricValue: true },
    })

    const numericScores = scoreEvents
      .map((event) => Number(event.metricValue))
      .filter((value) => Number.isFinite(value))

    if (numericScores.length === 0) {
      return NextResponse.json({ error: 'This tool has no recorded score for you yet' }, { status: 400 })
    }

    const challengerScore = Math.max(...numericScores)

    const challenge = await prisma.challenge.create({
      data: {
        challengerId: currentUser.id,
        challengedId: challengedUserId,
        toolId,
        challengerScore,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      include: {
        tool: { select: { id: true, name: true } },
        challenged: { select: { id: true, name: true } },
      },
    })

    await sendDirectMessage(
      currentUser.id,
      challengedUserId,
      `${currentUser.name} challenged you to beat their score of ${Math.round(challengerScore)}% on "${tool.name}"! Accept the challenge from your Library page.`
    ).catch(() => {})

    return NextResponse.json(challenge, { status: 201 })
  } catch (error) {
    console.error('POST /api/challenges error:', error)
    return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 })
  }
}
