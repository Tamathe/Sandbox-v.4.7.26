import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { CollabSessionStatus } from '../../../../generated/prisma'
import { parseRequestBody } from '../../../../lib/server-auth'
import { validateBody } from '../../../../lib/validate'
import {
  buildCollabShareUrl,
  collabSessionInclude,
  getUserByEmail,
  loadCollabSession,
  reactivateParticipant,
  serializeCollabParticipant,
  serializeCollabSession,
} from '../../../../lib/collab'
import { publishToCollabSession } from '../../../../lib/collab-bus'
import { normalizeJoinCode } from '../../../../lib/join-code'
import { prisma } from '../../../../lib/prisma'

const JoinSessionBodySchema = z.object({
  joinCode: z.string().min(1).max(20),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getUserByEmail(request.headers.get('x-demo-user-email'))
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = await parseRequestBody(request)
    if ('error' in parsed) return parsed.error
    const validation = validateBody(JoinSessionBodySchema, parsed.data)
    if ('error' in validation) return validation.error
    const joinCode = normalizeJoinCode(validation.value.joinCode)
    if (joinCode.length !== 6) {
      return NextResponse.json({ error: 'A valid 6-character join code is required.' }, { status: 400 })
    }

    let session = await prisma.collabSession.findFirst({
      where: {
        joinCode,
        status: {
          in: [CollabSessionStatus.WAITING, CollabSessionStatus.ACTIVE],
        },
      },
      include: collabSessionInclude,
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found or already ended.' },
        { status: 404 }
      )
    }

    const existingParticipant = session.participants.find((participant) => participant.userId === user.id)

    if (existingParticipant) {
      if (!existingParticipant.isActive) {
        await reactivateParticipant(session.id, user.id)
        session = await loadCollabSession(session.id)
      }

      if (!session) {
        return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
      }

      const shareUrl = buildCollabShareUrl(request, session.toolId, session.joinCode)
      return NextResponse.json(serializeCollabSession(session, shareUrl))
    }

    const activeParticipantCount = session.participants.filter((participant) => participant.isActive).length
    if (activeParticipantCount >= session.maxParticipants) {
      return NextResponse.json({ error: 'Session is full.' }, { status: 409 })
    }

    await prisma.$transaction(async (tx) => {
      const toolSession = await tx.toolSession.create({
        data: {
          toolId: session.toolId,
          courseId: session.courseId,
          userId: user.id,
        },
      })

      await tx.collabParticipant.create({
        data: {
          collabSessionId: session.id,
          userId: user.id,
          toolSessionId: toolSession.id,
          turnOrder: session.participants.length,
          isActive: true,
        },
      })

      if (session.status === CollabSessionStatus.WAITING) {
        await tx.collabSession.update({
          where: { id: session.id },
          data: {
            status: CollabSessionStatus.ACTIVE,
            startedAt: new Date(),
          },
        })
      }
    })

    const refreshedSession = await loadCollabSession(session.id)
    if (!refreshedSession) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    }

    const shareUrl = buildCollabShareUrl(request, refreshedSession.toolId, refreshedSession.joinCode)

    publishToCollabSession(refreshedSession.id, {
      type: 'presence_update',
      payload: {
        participants: refreshedSession.participants.map((participant) =>
          serializeCollabParticipant(participant, refreshedSession.hostId)
        ),
        event: 'joined',
        user: user.name,
      },
    })

    return NextResponse.json(serializeCollabSession(refreshedSession, shareUrl))
  } catch (error) {
    console.error('POST /api/collab/sessions/join error:', error)
    return NextResponse.json({ error: 'Failed to join collaborative session' }, { status: 500 })
  }
}
