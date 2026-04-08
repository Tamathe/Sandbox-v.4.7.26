/**
 * The Commons SSE Stream — real-time events for participants.
 *
 * Reuses room-bus (Redis Streams + EventEmitter fallback) from Sandcastle.
 * Supports Last-Event-ID for gap-free reconnection.
 * Supports targetUserId filtering for private events (e.g. Simulation Room).
 */

import { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getLiveRoom } from '../../../../lib/commons/commons-service'
import { subscribeToRoom, type RoomBusEvent } from '../../../../lib/sandcastle/room-bus'

export const dynamic = 'force-dynamic'

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { roomId } = await params

  // Verify room exists and user has access
  try {
    await getLiveRoom(roomId)
  } catch {
    return new Response('Room not found', { status: 404 })
  }

  const lastEventId = req.headers.get('Last-Event-ID') ?? undefined
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Send initial snapshot
      getLiveRoom(roomId)
        .then((room) => {
          const data = `event: connected\ndata: ${JSON.stringify(room)}\n\n`
          controller.enqueue(encoder.encode(data))
        })
        .catch(() => {
          // Room may have been deleted between check and here
        })

      // Subscribe to room bus events
      const unsubscribe = subscribeToRoom(
        roomId,
        (event, streamId) => {
          try {
            // Skip private events not intended for this user (e.g. Simulation branching)
            const targetUserId = (event as RoomBusEvent & { targetUserId?: string }).targetUserId
            if (targetUserId && targetUserId !== auth.user.id) return

            const frame = `id: ${streamId}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`
            controller.enqueue(encoder.encode(frame))

            // Close stream when room completes
            if (event.type === 'complete') {
              setTimeout(() => {
                try {
                  controller.close()
                } catch {
                  // already closed
                }
              }, 500)
            }
          } catch {
            // Controller may be closed if client disconnected
          }
        },
        lastEventId,
      )

      // Keep-alive every 30s
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'))
        } catch {
          clearInterval(keepAlive)
        }
      }, 30000)

      // Cleanup on client disconnect
      req.signal.addEventListener('abort', () => {
        unsubscribe()
        clearInterval(keepAlive)
        try {
          controller.close()
        } catch {
          // already closed
        }
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
