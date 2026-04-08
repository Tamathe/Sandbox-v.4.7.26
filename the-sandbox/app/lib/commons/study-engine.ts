/**
 * Study Session Engine — Shared Pomodoro timer with ambient presence.
 *
 * Lifecycle: LOBBY → FOCUS → BREAK → FOCUS → BREAK → ... → COMPLETE
 * Reuses LiveRoom model with type=STUDY. Config stores timer settings.
 * Room-bus events drive the real-time timer + presence for all participants.
 */

import { prisma } from '../prisma'
import { publishToRoom } from '../sandcastle/room-bus'

// ── Types ─────────────────────────────────────────────────────────────────────

export type { StudyConfig, StudyPhase } from './types'
import type { StudyConfig, StudyPhase } from './types'

// Map LiveRoomPhase enum to study phases:
// LOBBY → LOBBY, QUESTION → FOCUS, REVEAL → BREAK, COMPLETE → COMPLETE
const PHASE_MAP = {
  toDb: { LOBBY: 'LOBBY', FOCUS: 'QUESTION', BREAK: 'REVEAL', COMPLETE: 'COMPLETE' } as const,
  fromDb: { LOBBY: 'LOBBY', QUESTION: 'FOCUS', REVEAL: 'BREAK', COMPLETE: 'COMPLETE' } as Record<string, StudyPhase>,
}

// Active timer handles per room
const activeTimers = new Map<string, ReturnType<typeof setTimeout>>()

// ── Start Study Session ───────────────────────────────────────────────────────

export async function startStudySession(roomId: string, hostId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({ where: { id: roomId } })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })
  if (room.hostId !== hostId) throw Object.assign(new Error('Only the host can start'), { status: 403 })
  if (room.type !== 'STUDY') throw Object.assign(new Error('Not a study room'), { status: 400 })

  const config = room.config as unknown as StudyConfig

  // Transition to first focus period
  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: PHASE_MAP.toDb.FOCUS, startedAt: new Date(), currentRound: 1 },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'FOCUS' } })
  publishToRoom(roomId, {
    type: 'timer_started',
    data: {
      phase: 'FOCUS',
      durationMs: config.focusMinutes * 60 * 1000,
      cycle: 1,
      totalCycles: config.totalCycles,
      endsAt: new Date(Date.now() + config.focusMinutes * 60 * 1000).toISOString(),
    },
  })

  // Sandy opening message
  const participants = await prisma.liveRoomParticipant.count({ where: { roomId } })
  publishToRoom(roomId, {
    type: 'sandy_says',
    data: { message: `Focus time! ${participants} of you studying together. Phones away, let's lock in for ${config.focusMinutes} minutes.` },
  })

  // Schedule transition to break
  scheduleTransition(roomId, config.focusMinutes * 60 * 1000, () => {
    void transitionToBreak(roomId)
  })
}

// ── Phase Transitions ─────────────────────────────────────────────────────────

async function transitionToBreak(roomId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: { participants: { include: { user: { select: { name: true } } } } },
  })
  if (!room || room.phase === 'COMPLETE') return

  const config = room.config as unknown as StudyConfig
  const cycle = room.currentRound

  // Check if this was the last cycle
  if (cycle >= config.totalCycles) {
    await completeStudySession(roomId)
    return
  }

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: PHASE_MAP.toDb.BREAK },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'BREAK' } })
  publishToRoom(roomId, {
    type: 'timer_started',
    data: {
      phase: 'BREAK',
      durationMs: config.breakMinutes * 60 * 1000,
      cycle,
      totalCycles: config.totalCycles,
      endsAt: new Date(Date.now() + config.breakMinutes * 60 * 1000).toISOString(),
    },
  })

  // Sandy break message
  const breakMessages = [
    `Nice work! ${config.breakMinutes} minute break. Stretch, hydrate, check your phone — you earned it.`,
    `Break time! ${cycle}/${config.totalCycles} cycles done. Stand up and move around.`,
    `Solid focus session. Take ${config.breakMinutes} minutes — your brain needs the rest to consolidate.`,
    `${cycle} down, ${config.totalCycles - cycle} to go. Quick break — grab some water.`,
  ]
  publishToRoom(roomId, {
    type: 'sandy_says',
    data: { message: breakMessages[cycle % breakMessages.length] },
  })

  // Schedule next focus
  scheduleTransition(roomId, config.breakMinutes * 60 * 1000, () => {
    void transitionToFocus(roomId)
  })
}

async function transitionToFocus(roomId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({ where: { id: roomId } })
  if (!room || room.phase === 'COMPLETE') return

  const config = room.config as unknown as StudyConfig
  const nextCycle = room.currentRound + 1

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: PHASE_MAP.toDb.FOCUS, currentRound: nextCycle },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'FOCUS' } })
  publishToRoom(roomId, {
    type: 'timer_started',
    data: {
      phase: 'FOCUS',
      durationMs: config.focusMinutes * 60 * 1000,
      cycle: nextCycle,
      totalCycles: config.totalCycles,
      endsAt: new Date(Date.now() + config.focusMinutes * 60 * 1000).toISOString(),
    },
  })

  const focusMessages = [
    `Back to it! Round ${nextCycle} of ${config.totalCycles}. You've got this.`,
    `Focus mode. ${config.focusMinutes} minutes. Let's make them count.`,
    `Round ${nextCycle} — the home stretch is where champions are made.`,
    `Alright, deep breaths. ${config.focusMinutes} more minutes of focused work.`,
  ]
  publishToRoom(roomId, {
    type: 'sandy_says',
    data: { message: focusMessages[nextCycle % focusMessages.length] },
  })

  scheduleTransition(roomId, config.focusMinutes * 60 * 1000, () => {
    void transitionToBreak(roomId)
  })
}

async function completeStudySession(roomId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: { include: { user: { select: { name: true } } } },
      channel: true,
    },
  })
  if (!room) return

  clearTimer(roomId)

  const config = room.config as unknown as StudyConfig
  const totalMinutes = config.totalCycles * config.focusMinutes
  const participantNames = room.participants.map((p) => p.user.name)

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'COMPLETE', endedAt: new Date() },
  })

  publishToRoom(roomId, {
    type: 'complete',
    data: {
      totalMinutes,
      totalCycles: config.totalCycles,
      participants: participantNames,
    },
  })

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: {
      message: `Session complete! ${participantNames.length} of you just put in ${totalMinutes} minutes of focused study. That's real progress. ${participantNames.length > 1 ? "You're stronger together." : 'Proud of you.'}`,
    },
  })

  // Post summary to chat
  const names = participantNames.join(', ')
  await prisma.channelMessage.create({
    data: {
      channelId: room.channelId,
      authorId: room.hostId,
      content: `📚 Study Session Complete\n\n${config.totalCycles} cycles · ${totalMinutes} min of focused study\n${names} studied together${config.topic ? ` on "${config.topic}"` : ''}.\n\nNice work, everyone!`,
      messageType: 'system',
      isSandy: true,
    },
  })
}

// ── Stuck? Request ────────────────────────────────────────────────────────────

export async function requestStuckHelp(roomId: string, userId: string, question: string): Promise<void> {
  const participant = await prisma.liveRoomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
    include: { user: { select: { name: true } } },
  })
  if (!participant) throw Object.assign(new Error('Not a participant'), { status: 403 })

  publishToRoom(roomId, {
    type: 'stuck_request',
    data: {
      userId,
      name: participant.user.name,
      question: question || 'Needs help with the current topic',
    },
  })

  // Sandy responds
  publishToRoom(roomId, {
    type: 'sandy_says',
    data: {
      message: `${participant.user.name} could use a hand${question ? `: "${question}"` : ''}. Anyone able to help? Drop a quick explanation in the chat after this focus block.`,
    },
  })
}

// ── End Session Early ─────────────────────────────────────────────────────────

export async function endStudySession(roomId: string, userId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({ where: { id: roomId } })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })
  if (room.hostId !== userId) throw Object.assign(new Error('Only the host can end'), { status: 403 })
  if (room.phase === 'COMPLETE') return

  await completeStudySession(roomId)
}

// ── Timer Management ──────────────────────────────────────────────────────────

function scheduleTransition(roomId: string, delayMs: number, callback: () => void): void {
  clearTimer(roomId)
  const handle = setTimeout(callback, delayMs)
  activeTimers.set(roomId, handle)
}

function clearTimer(roomId: string): void {
  const existing = activeTimers.get(roomId)
  if (existing) {
    clearTimeout(existing)
    activeTimers.delete(roomId)
  }
}
