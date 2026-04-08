import { NextRequest, NextResponse } from 'next/server'

import { CollabSessionStatus } from '../../../../../generated/prisma'
import {
  buildCollabShareUrl,
  endParticipantToolSessions,
  getAuthorizedParticipantSession,
  getUserByEmail,
  loadCollabSession,
  markParticipantInactive,
  promoteNextHostIfNeeded,
  serializeCollabParticipant,
} from '../../../../../lib/collab'
import { publishToCollabSession } from '../../../../../lib/collab-bus'
import { prisma } from '../../../../../lib/prisma'

export async function DELETE(
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

    await markParticipantInactive(session.id, user.id)

    const participant = session.participants.find((entry) => entry.userId === user.id)
    if (participant?.toolSessionId) {
      await prisma.toolSession.update({
        where: { id: participant.toolSessionId },
        data: {
          endedAt: new Date(),
          status: 'completed',
        },
      })
    }

    let refreshedSession = await loadCollabSession(session.id)
    if (!refreshedSession) {
      return NextResponse.json({ success: true, ended: false })
    }

    const activeParticipants = refreshedSession.participants.filter((entry) => entry.isActive)
    let promotedHostId: string | null = null

    if (activeParticipants.length === 0) {
      await prisma.collabSession.update({
        where: { id: refreshedSession.id },
        data: {
          status: CollabSessionStatus.ENDED,
          endedAt: new Date(),
        },
      })
      refreshedSession = await loadCollabSession(session.id)
      if (refreshedSession) {
        await endParticipantToolSessions(refreshedSession.participants)
      }
    } else {
      promotedHostId = await promoteNextHostIfNeeded(refreshedSession, user.id)
      refreshedSession = await loadCollabSession(session.id)
    }

    if (refreshedSession) {
      publishToCollabSession(refreshedSession.id, {
        type: 'presence_update',
        payload: {
          participants: refreshedSession.participants.map((entry) =>
            serializeCollabParticipant(entry, refreshedSession!.hostId)
          ),
          event: 'left',
          user: user.name,
          ...(promotedHostId ? { promotedHostId } : {}),
        },
      })

      if (refreshedSession.status === CollabSessionStatus.ENDED) {
        publishToCollabSession(refreshedSession.id, {
          type: 'session_end',
          payload: {
            endedBy: user.id,
            endedByName: user.name,
            endedAt: refreshedSession.endedAt?.toISOString() ?? new Date().toISOString(),
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      promotedHostId,
      ended: refreshedSession?.status === CollabSessionStatus.ENDED,
      shareUrl:
        refreshedSession ? buildCollabShareUrl(request, refreshedSession.toolId, refreshedSession.joinCode) : null,
    })
  } catch (error) {
    console.error('DELETE /api/collab/sessions/[id]/leave error:', error)
    return NextResponse.json({ error: 'Failed to leave collaborative session' }, { status: 500 })
  }
}
