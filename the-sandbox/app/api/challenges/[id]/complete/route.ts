import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { sendDirectMessage } from '../../../../lib/messaging'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userEmail = request.headers.get('x-demo-user-email')
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({ where: { email: userEmail } })
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { score } = await request.json()
    const numericScore = Number(score)
    if (!Number.isFinite(numericScore)) {
      return NextResponse.json({ error: 'A numeric score is required' }, { status: 400 })
    }

    const challenge = await prisma.challenge.findUnique({
      where: { id },
      include: {
        challenger: { select: { id: true, name: true } },
        challenged: { select: { id: true, name: true } },
        tool: { select: { id: true, name: true } },
      },
    })

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    if (challenge.challengedId !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await prisma.challenge.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        challengedScore: numericScore,
        completedAt: new Date(),
      },
    })

    await sendDirectMessage(
      currentUser.id,
      challenge.challengerId,
      `${challenge.challenged.name} finished "${challenge.tool.name}" with a score of ${Math.round(numericScore)}%. ${numericScore > challenge.challengerScore ? 'They beat your score.' : 'Your score still stands.'}`
    ).catch(() => {})

    return NextResponse.json(updated)
  } catch (error) {
    console.error('POST /api/challenges/[id]/complete error:', error)
    return NextResponse.json({ error: 'Failed to complete challenge' }, { status: 500 })
  }
}
