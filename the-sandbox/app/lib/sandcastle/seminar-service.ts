/**
 * Seminar Service — hand-raise queue management for Sandcastle Seminar rooms.
 *
 * Queue state is dual-persisted: handRaisedAt written to Postgres (survives Redis restart)
 * and broadcast via the room bus for real-time SSE delivery.
 */

import { prisma } from '../prisma'
import { publishToRoom } from './room-bus'

export interface QueueEntry {
  participantId: string
  displayName: string
  handRaisedAt: string
  queuePosition: number
}

export async function raiseHand(roomId: string, participantId: string): Promise<{ queuePosition: number }> {
  const now = new Date()

  const participant = await prisma.participant.update({
    where: { id: participantId },
    data: { handRaisedAt: now },
    select: { displayName: true, roomId: true },
  })

  if (participant.roomId !== roomId) {
    throw Object.assign(new Error('Participant not in this room'), { code: 'FORBIDDEN', status: 403 })
  }

  const queue = await getQueue(roomId)
  const position = queue.findIndex((q) => q.participantId === participantId) + 1

  publishToRoom(roomId, {
    type: 'hand_raised',
    data: { participantId, displayName: participant.displayName, queuePosition: position, raisedAt: now.toISOString() },
  })
  publishToRoom(roomId, { type: 'speaker_queue', data: { queue } })

  return { queuePosition: position }
}

export async function lowerHand(roomId: string, participantId: string): Promise<void> {
  const participant = await prisma.participant.update({
    where: { id: participantId },
    data: { handRaisedAt: null },
    select: { displayName: true },
  })

  publishToRoom(roomId, {
    type: 'hand_lowered',
    data: { participantId, displayName: participant.displayName },
  })

  const queue = await getQueue(roomId)
  publishToRoom(roomId, { type: 'speaker_queue', data: { queue } })
}

export async function getQueue(roomId: string): Promise<QueueEntry[]> {
  const participants = await prisma.participant.findMany({
    where: { roomId, handRaisedAt: { not: null }, leftAt: null },
    orderBy: { handRaisedAt: 'asc' },
    select: { id: true, displayName: true, handRaisedAt: true },
  })

  return participants.map((p, i) => ({
    participantId: p.id,
    displayName: p.displayName,
    handRaisedAt: p.handRaisedAt!.toISOString(),
    queuePosition: i + 1,
  }))
}

export async function grantSpeaker(
  roomId: string,
  participantId: string,
  grantedBy: string,
): Promise<void> {
  const participant = await prisma.participant.update({
    where: { id: participantId },
    data: { handRaisedAt: null },
    select: { displayName: true },
  })

  publishToRoom(roomId, {
    type: 'speaker_granted',
    data: { participantId, displayName: participant.displayName, grantedBy },
  })

  const queue = await getQueue(roomId)
  publishToRoom(roomId, { type: 'speaker_queue', data: { queue } })
}
