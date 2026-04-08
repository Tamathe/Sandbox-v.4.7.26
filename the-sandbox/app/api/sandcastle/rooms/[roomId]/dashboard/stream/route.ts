/**
 * Educator Host Dashboard SSE Stream
 *
 * Delivers real-time room events to the educator host view.
 * Subscribes to the room bus and maps events → SSE event frames.
 * Supports Last-Event-ID for gap-free reconnect.
 *
 * Auth: HOST only (room.hostId === auth.user.id || ADMIN)
 */

import { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../lib/api-utils'
import { prisma } from '../../../../../../lib/prisma'
import { subscribeToRoom } from '../../../../../../lib/sandcastle/room-bus'

function sseFrame(event: string, data: unknown, id?: string): string {
  const idLine = id ? `id: ${id}\n` : ''
  return `${idLine}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { roomId } = await params

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { participants: { where: { leftAt: null } } },
  })

  if (!room) {
    return new Response(JSON.stringify({ error: 'Room not found' }), { status: 404 })
  }
  const typedRoom = room
  if (typedRoom.hostId !== auth.user.id && auth.user.role !== 'ADMIN') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }

  // Last-Event-ID for gap-free reconnect
  const lastEventId = request.headers.get('last-event-id') ?? undefined

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder()
      const send = (event: string, data: unknown, id?: string) => {
        try {
          controller.enqueue(enc.encode(sseFrame(event, data, id)))
        } catch {
          // client disconnected
        }
      }

      // Send initial snapshot
      send('connected', {
        roomId,
        phase: room.phase,
        participantCount: typedRoom.participants?.length ?? 0,
        serverTimeMs: Date.now(),
      })

      // If room already ended, close immediately after snapshot
      if (room.endedAt) {
        send('room_ended', { endedAt: room.endedAt.toISOString(), reportStatus: 'PENDING' })
        controller.close()
        return
      }

      const unsubscribe = subscribeToRoom(
        roomId,
        (busEvent, streamId) => {
          // Map bus event type → SSE event name (many bus types pass through as-is)
          send(busEvent.type, busEvent.data, streamId)

          // Close the SSE connection when the room ends
          if (busEvent.type === 'room_ended') {
            setTimeout(() => {
              try { controller.close() } catch { /* already closed */ }
            }, 200)
          }
        },
        lastEventId,
      )

      // Cleanup when client disconnects
      request.signal.addEventListener('abort', () => {
        unsubscribe()
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
})
