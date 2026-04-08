import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { CollabSessionStatus } from '../../../../generated/prisma'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { validateBody } from '../../../../lib/validate'
import {
  buildCollabShareUrl,
  endParticipantToolSessions,
  getAuthorizedParticipantSession,
  getCollabSession,
  serializeCollabSession,
} from '../../../../lib/collab'
import { publishToCollabSession } from '../../../../lib/collab-bus'
import { prisma } from '../../../../lib/prisma'
import { withErrorHandling } from '../../../../lib/api-utils'

const UpdateSessionSchema = z.object({
  action: z.enum(['end']),
})

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
    const auth = await requireRequestUser(request)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    const { id } = await params
    const session = await getAuthorizedParticipantSession(id, user.id)
    if (!session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    }

    return NextResponse.json(serializeCollabSession(session, buildCollabShareUrl(request, session.toolId, session.joinCode)), {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })

export const PATCH = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
    const auth = await requireRequestUser(request)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

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

    const finalSession = await getCollabSession(session.id)
    if (!finalSession) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    }

    await endParticipantToolSessions(finalSession.participants)

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
  })
