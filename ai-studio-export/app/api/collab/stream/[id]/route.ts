import { NextRequest, NextResponse } from 'next/server'

import {
  buildCollabShareUrl,
  getSseEmail,
  getUserByEmail,
  loadCollabSession,
  markParticipantInactive,
  reactivateParticipant,
  registerCollabStreamConnection,
  serializeCollabParticipant,
  serializeCollabSession,
  unregisterCollabStreamConnection,
} from '../../../../lib/collab'
import { publishToCollabSession, subscribeToCollabSession } from '../../../../lib/collab-bus'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserByEmail(getSseEmail(request))
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const session = await loadCollabSession(id)
  if (!session || !session.participants.some((participant) => participant.userId === user.id)) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
  }

  await reactivateParticipant(session.id, user.id)
  registerCollabStreamConnection(session.id, user.id)

  const encoder = new TextEncoder()

  return new Response(
    new ReadableStream({
      async start(controller) {
        const sendEvent = (event: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }

        const latestSession = await loadCollabSession(session.id)
        if (!latestSession) {
          controller.close()
          return
        }

        sendEvent({
          type: 'init_state',
          payload: serializeCollabSession(
            latestSession,
            buildCollabShareUrl(request, latestSession.toolId, latestSession.joinCode)
          ),
        })

        publishToCollabSession(latestSession.id, {
          type: 'presence_update',
          payload: {
            participants: latestSession.participants.map((participant) =>
              serializeCollabParticipant(participant, latestSession.hostId)
            ),
            event: 'updated',
            user: user.name,
          },
        })

        const unsubscribe = subscribeToCollabSession(session.id, sendEvent)
        const heartbeat = setInterval(() => {
          controller.enqueue(encoder.encode(': keepalive\n\n'))
        }, 15000)

        const handleAbort = async () => {
          clearInterval(heartbeat)
          unsubscribe()

          const remainingConnections = unregisterCollabStreamConnection(session.id, user.id)
          if (remainingConnections > 0) return

          await markParticipantInactive(session.id, user.id)
          const updatedSession = await loadCollabSession(session.id)
          if (!updatedSession) return

          publishToCollabSession(updatedSession.id, {
            type: 'presence_update',
            payload: {
              participants: updatedSession.participants.map((participant) =>
                serializeCollabParticipant(participant, updatedSession.hostId)
              ),
              event: 'left',
              user: user.name,
            },
          })
        }

        request.signal.addEventListener('abort', handleAbort, { once: true })
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    }
  )
}
