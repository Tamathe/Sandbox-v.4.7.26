import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { PlatformQuestType } from '../../../generated/prisma'
import { awardQuestProgress } from '../../../lib/platform-quests'
import { parseRequestBody } from '../../../lib/server-auth'
import { validateBody } from '../../../lib/validate'
import { z } from 'zod'

const UpdateSessionSchema = z.object({
  endedAt: z.string().optional(),
  messageCount: z.number().int().min(0).optional(),
  notes: z.string().max(10000).optional(),
  status: z.string().max(50).optional(),
  audioActivated: z.boolean().optional(),
  audioSessionDurationSecs: z.number().optional(),
})

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

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const validation = validateBody(UpdateSessionSchema, parsed.data)
    if ('error' in validation) return validation.error
    const { endedAt, messageCount, notes, status, audioActivated, audioSessionDurationSecs } = validation.value

    const session = await prisma.toolSession.findUnique({ where: { id } })
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    if (session.userId && session.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const shouldFinalize = endedAt !== undefined || status === 'completed'
    const wasCompleted = session.endedAt !== null || session.status === 'completed'
    const updated = await prisma.toolSession.update({
      where: { id },
      data: {
        ...(shouldFinalize && {
          endedAt: endedAt ? new Date(endedAt) : new Date(),
        }),
        messageCount: messageCount ?? session.messageCount,
        ...(notes !== undefined && { notes }),
        ...(status && { status }),
        ...(audioActivated !== undefined && { audioActivated: Boolean(audioActivated) }),
        ...(audioSessionDurationSecs !== undefined && {
          audioSessionDurationSecs: Math.max(0, Number(audioSessionDurationSecs) || 0),
        }),
      },
    })

    if (shouldFinalize && !wasCompleted && updated.userId) {
      await awardQuestProgress(updated.userId, PlatformQuestType.COMPLETE_ANY_SESSION).catch(() => {})
      await awardQuestProgress(updated.userId, PlatformQuestType.COMPLETE_SESSIONS_N).catch(() => {})
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PUT /api/sessions/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }
}
