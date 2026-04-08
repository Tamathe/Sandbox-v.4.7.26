import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { PlatformQuestType } from '../../../generated/prisma'
import { awardQuestProgress } from '../../../lib/platform-quests'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userEmail = req.headers.get('x-demo-user-email')
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email: userEmail } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { endedAt, messageCount, notes, status } = await req.json()

    const session = await prisma.toolSession.findUnique({ where: { id } })
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    if (session.userId && session.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const wasCompleted = session.endedAt !== null || session.status === 'completed'
    const updated = await prisma.toolSession.update({
      where: { id },
      data: {
        endedAt: endedAt ? new Date(endedAt) : new Date(),
        messageCount: messageCount ?? session.messageCount,
        ...(notes !== undefined && { notes }),
        ...(status && { status }),
      },
    })

    if (!wasCompleted && updated.userId) {
      await awardQuestProgress(updated.userId, PlatformQuestType.COMPLETE_ANY_SESSION).catch(() => {})
      await awardQuestProgress(updated.userId, PlatformQuestType.COMPLETE_SESSIONS_N).catch(() => {})
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PUT /api/sessions/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }
}
