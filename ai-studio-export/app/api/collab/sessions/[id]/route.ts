import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { CollabSessionStatus } from '../../../../generated/prisma'
import { parseRequestBody } from '../../../../lib/server-auth'
import { validateBody } from '../../../../lib/validate'
import {
  awardCollabCompletionXp,
  buildCollabShareUrl,
  endParticipantToolSessions,
  getAuthorizedParticipantSession,
  getUserByEmail,
  loadCollabSession,
  serializeCollabSession,
} from '../../../../lib/collab'
import { publishToCollabSession } from '../../../../lib/collab-bus'
import { prisma } from '../../../../lib/prisma'

const UpdateSessionSchema = z.object({
  action: z.enum(['end']),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserByEmail(request.headers.get('x-demo-user-email'))
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const session = await getAuthorizedParticipantSession(id, user.id)
    if (!session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    }

    return NextResponse.json(serializeCollabSession(session, buildCollabShareUrl(request, session.toolId, session.joinCode)))
  } catch (error) {
    console.error('GET /api/collab/sessions/[id] error:', error)
    return NextResponse.json({ error: 'Failed to load collaborative session' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserByEmail(request.headers.get('x-demo-user-email'))
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const session = await getAuthorizedParticipantSession(id, user.id)
    if (!session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    }

    if (session.hostId !== user.id) {
      return NextResponse.json({ error: 'Only the host can end this session.' }, { status: 403 })
    }

    const parsed = await parseRequestBody(request)
    if ('error' in parsed) return parsed.error
    const validation = validateBody(UpdateSessionSchema, parsed.data)
    if ('error' in validation) return validation.error

    const endedAt = new Date()

    await prisma.$transaction(async (tx) => {
      await tx.collabSession.update({
        where: { id: session.id },
        data: {
          status: CollabSessionStatus.ENDED,
          endedAt,
        },
      })

      await tx.collabParticipant.updateMany({
        where: { collabSessionId: session.id },
        data: {
          isActive: false,
          leftAt: endedAt,
        },
      })
    })

    const finalSession = await loadCollabSession(session.id)
    if (!finalSession) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    }

    await endParticipantToolSessions(finalSession.participants)
    await awardCollabCompletionXp(finalSession)

    publishToCollabSession(finalSession.id, {
      type: 'session_end',
      payload: {
        endedBy: user.id,
        endedByName: user.name,
        endedAt: endedAt.toISOString(),
      },
    })

    return NextResponse.json(
      serializeCollabSession(
        finalSession,
        buildCollabShareUrl(request, finalSession.toolId, finalSession.joinCode)
      )
    )
  } catch (error) {
    console.error('PATCH /api/collab/sessions/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update collaborative session' }, { status: 500 })
  }
}
