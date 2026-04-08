/**
 * Watch Room Engine — Shared viewing experiences with live reactions.
 *
 * Use cases: game day watch parties, lecture replays, campus event streams.
 * Sandy acts as color commentator — drops trivia, polls, hype messages.
 *
 * Lifecycle: LOBBY → ACTIVE → COMPLETE
 * Reuses LiveRoom model with type=WATCH. Config stores event details.
 * Phases: LOBBY → COUNTDOWN (active) → COMPLETE
 */

import { prisma } from '../prisma'
import { publishToRoom } from '../sandcastle/room-bus'
import Anthropic from '@anthropic-ai/sdk'

export type { WatchConfig } from './types'
import type { WatchConfig } from './types'

// ── Start Watch Party ─────────────────────────────────────────────────────────

export async function startWatchParty(roomId: string, hostId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: { participants: { include: { user: { select: { name: true } } } } },
  })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })
  if (room.hostId !== hostId) throw Object.assign(new Error('Only the host can start'), { status: 403 })
  if (room.type !== 'WATCH') throw Object.assign(new Error('Not a watch room'), { status: 400 })

  const config = room.config as unknown as WatchConfig

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'COUNTDOWN', startedAt: new Date() },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'ACTIVE' } })

  const names = room.participants.map((p) => p.user.name)
  const eventLabel = config.eventType === 'game' ? 'Game on!'
    : config.eventType === 'lecture' ? 'Lecture starting!'
    : "Here we go!"

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: {
      message: `${eventLabel} ${names.length} of you watching "${config.eventTitle}" together. Drop reactions, talk trash, have fun. I'll be here with commentary.`,
    },
  })

  // If there's a duration, auto-complete
  if (config.durationMinutes) {
    setTimeout(() => {
      void completeWatchParty(roomId)
    }, config.durationMinutes * 60 * 1000)
  }
}

// ── Reactions ─────────────────────────────────────────────────────────────────

const WATCH_REACTIONS = ['🔥', '😱', '💀', '👏', '😤', '🎉', '❤️', '😂'] as const

export async function sendWatchReaction(
  roomId: string,
  userId: string,
  reaction: string,
): Promise<void> {
  const participant = await prisma.liveRoomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
    include: { user: { select: { name: true } } },
  })
  if (!participant) throw Object.assign(new Error('Not a participant'), { status: 403 })

  publishToRoom(roomId, {
    type: 'watch_reaction',
    data: {
      userId,
      name: participant.user.name,
      reaction,
      timestamp: Date.now(),
    },
  })
}

// ── Sandy Commentary (on-demand) ──────────────────────────────────────────────

export async function triggerSandyCommentary(roomId: string, context?: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: { participants: true },
  })
  if (!room) return

  const config = room.config as unknown as WatchConfig

  if (!process.env.ANTHROPIC_API_KEY) {
    // Fallback
    const fallbacks = [
      "The energy in here is unreal right now!",
      "I can feel the tension through the screen.",
      "This is why we watch together — the reactions make it 10x better.",
      "Someone clip that!",
    ]
    publishToRoom(roomId, {
      type: 'sandy_says',
      data: { message: fallbacks[Math.floor(Math.random() * fallbacks.length)] },
    })
    return
  }

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      system: `You are Sandy, the enthusiastic AI color commentator for a watch party at the University of Kentucky. ${config.eventType === 'game' ? "You're watching a UK Wildcats game. Be a hype person." : "You're watching a group viewing session."} Write ONE short, fun commentary line (10-20 words). Casual college energy. Reference the context if provided.`,
      messages: [{ role: 'user', content: context ?? `${room.participants.length} people watching "${config.eventTitle}". Say something hype.` }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()

    if (text) {
      publishToRoom(roomId, { type: 'sandy_says', data: { message: text } })
    }
  } catch {
    publishToRoom(roomId, {
      type: 'sandy_says',
      data: { message: "This is what it's all about — watching together, reacting together." },
    })
  }
}

// ── Quick Poll (in-watch-party mini polls) ────────────────────────────────────

export async function createWatchPoll(
  roomId: string,
  question: string,
  options: string[],
): Promise<string> {
  const pollId = `poll-${Date.now()}`

  publishToRoom(roomId, {
    type: 'watch_poll',
    data: {
      pollId,
      question,
      options,
      votes: options.map(() => 0),
    },
  })

  return pollId
}

export async function voteWatchPoll(
  roomId: string,
  pollId: string,
  userId: string,
  optionIndex: number,
): Promise<void> {
  publishToRoom(roomId, {
    type: 'watch_poll_vote',
    data: { pollId, userId, optionIndex },
  })
}

// ── Complete ──────────────────────────────────────────────────────────────────

export async function completeWatchParty(roomId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: { include: { user: { select: { name: true } } } },
      channel: true,
    },
  })
  if (!room || room.phase === 'COMPLETE') return

  const config = room.config as unknown as WatchConfig
  const names = room.participants.map((p) => p.user.name)

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'COMPLETE', endedAt: new Date() },
  })

  publishToRoom(roomId, {
    type: 'complete',
    data: { participants: names },
  })

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: { message: `That's a wrap! ${names.length} of you watched "${config.eventTitle}" together. Nothing beats the shared experience. Until next time!` },
  })

  await prisma.channelMessage.create({
    data: {
      channelId: room.channelId,
      authorId: room.hostId,
      content: `📺 Watch Party — "${config.eventTitle}"\n\n${names.length} people watched together.\n${names.join(', ')}`,
      messageType: 'system',
      isSandy: true,
    },
  })
}

export async function endWatchParty(roomId: string, userId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({ where: { id: roomId } })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })
  if (room.hostId !== userId) throw Object.assign(new Error('Only the host can end'), { status: 403 })
  await completeWatchParty(roomId)
}
