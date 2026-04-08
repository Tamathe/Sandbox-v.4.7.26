/**
 * Student Participant SSE Stream
 *
 * Delivers real-time poll events to student participants.
 * Filters the room bus to only deliver participant-relevant events.
 * Supports Last-Event-ID for gap-free reconnect.
 *
 * Auth: any authenticated user (must provide participantId query param)
 */

import { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../lib/api-utils'
import { prisma } from '../../../../../../lib/prisma'
import { subscribeToRoom } from '../../../../../../lib/sandcastle/room-bus'

// Events delivered to students (subset of full bus event catalog)
const PARTICIPANT_EVENTS = new Set([
  'phase_changed',
  'poll_opened',
  'poll_vote_update',
  'poll_closed',
  'room_ended',
  'participant_joined',
  'participant_left',
  // Game Show events
  'question_open',
  'buzzer_winner',
  'buzzer_locked',
  'scoreboard_update',
  // Collaborative Canvas events
  'canvas_stroke',
  'canvas_cleared',
  'canvas_critique_chunk',
  'canvas_critique_done',
  // Seminar events
  'hand_raised',
  'hand_lowered',
  'speaker_granted',
  'speaker_queue',
])

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
  const participantId = new URL(request.url).searchParams.get('participantId')

  if (!participantId) {
    return new Response(JSON.stringify({ error: 'participantId query param is required' }), { status: 400 })
  }

  // Verify participant belongs to this room and user
  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
    select: { userId: true, roomId: true },
  })
  if (!participant || participant.roomId !== roomId) {
    return new Response(JSON.stringify({ error: 'Participant not found in this room' }), { status: 404 })
  }
  if (participant.userId && participant.userId !== auth.user.id && auth.user.role !== 'ADMIN') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { phase: true, endedAt: true, tool: { select: { toolType: true } } },
  })
  if (!room) {
    return new Response(JSON.stringify({ error: 'Room not found' }), { status: 404 })
  }

  const lastEventId = request.headers.get('last-event-id') ?? undefined

  // Fetch current open poll (if any) for initial state
  const openPoll = await prisma.poll.findFirst({
    where: { roomId, closedAt: null },
    include: { votes: true },
  })

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

      // Initial snapshot
      send('connected', {
        roomId,
        phase: room.phase,
        experienceType: room.tool?.toolType ?? 'LIVE_POLL',
        serverTimeMs: Date.now(),
        activePoll: openPoll
          ? {
              pollId: openPoll.id,
              question: openPoll.question,
              options: openPoll.options,
              openedAt: openPoll.openedAt.toISOString(),
            }
          : null,
      })

      if (room.endedAt) {
        send('room_ended', { endedAt: room.endedAt.toISOString() })
        controller.close()
        return
      }

      const unsubscribe = subscribeToRoom(
        roomId,
        (busEvent, streamId) => {
          if (!PARTICIPANT_EVENTS.has(busEvent.type)) return
          send(busEvent.type, busEvent.data, streamId)
          if (busEvent.type === 'room_ended') {
            setTimeout(() => {
              try { controller.close() } catch { /* already closed */ }
            }, 200)
          }
        },
        lastEventId,
      )

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
