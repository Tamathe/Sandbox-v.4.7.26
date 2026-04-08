/**
 * Game Show Service — DB operations for Sandcastle Game Show rooms.
 *
 * Manages question lifecycle, buzzer press recording (server-authoritative
 * timestamp per ADR-10), and scoreboard computation.
 */

import { prisma } from '../prisma'
import { publishToRoom } from './room-bus'

export interface ScoreboardEntry {
  participantId: string
  displayName: string
  score: number
}

export interface QuestionSummary {
  questionId: string
  text: string
  imageUrl?: string
  timeoutMs: number
  openedAt: string
  closedAt?: string
  winnerId?: string
  winnerName?: string
  winnerTimestamp?: string
}

export async function openQuestion(
  roomId: string,
  hostId: string,
  text: string,
  imageUrl?: string,
  timeoutMs = 30000,
): Promise<QuestionSummary> {
  const room = await prisma.room.findUnique({ where: { id: roomId } })
  if (!room) throw Object.assign(new Error('Room not found'), { code: 'ROOM_NOT_FOUND', status: 404 })
  if (room.hostId !== hostId) throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN', status: 403 })
  if (room.phase !== 'ACTIVE') throw Object.assign(new Error('Room is not active'), { code: 'ROOM_NOT_ACTIVE', status: 400 })

  const question = await prisma.gameShowQuestion.create({
    data: { roomId, text, imageUrl, timeoutMs },
  })

  // Set room phase to QUESTION_OPEN
  await prisma.room.update({ where: { id: roomId }, data: { phase: 'QUESTION_OPEN' } })

  publishToRoom(roomId, {
    type: 'question_open',
    data: {
      questionId: question.id,
      text: question.text,
      imageUrl: question.imageUrl ?? null,
      timeoutMs: question.timeoutMs,
      openedAt: question.openedAt.toISOString(),
    },
  })

  // Auto-close after timeout
  setTimeout(() => {
    closeQuestion(question.id, roomId, hostId).catch(
      (err) => console.error('[GameShowService] auto-close error:', err),
    )
  }, timeoutMs)

  return {
    questionId: question.id,
    text: question.text,
    imageUrl: question.imageUrl ?? undefined,
    timeoutMs: question.timeoutMs,
    openedAt: question.openedAt.toISOString(),
  }
}

export async function closeQuestion(
  questionId: string,
  roomId: string,
  hostId: string,
): Promise<{ winner: ScoreboardEntry | null; scoreboard: ScoreboardEntry[] }> {
  const question = await prisma.gameShowQuestion.findUnique({
    where: { id: questionId },
    include: { winner: { select: { displayName: true } } },
  })
  if (!question || question.roomId !== roomId) {
    throw Object.assign(new Error('Question not found'), { code: 'NOT_FOUND', status: 404 })
  }

  const room = await prisma.room.findUnique({ where: { id: roomId } })
  if (!room || room.hostId !== hostId) throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN', status: 403 })

  if (question.closedAt) {
    // Already closed — just return current scoreboard
    return { winner: null, scoreboard: await getScoreboard(roomId) }
  }

  await prisma.gameShowQuestion.update({
    where: { id: questionId },
    data: { closedAt: new Date() },
  })

  // Return room to ACTIVE phase
  await prisma.room.update({ where: { id: roomId }, data: { phase: 'ACTIVE' } })

  const scoreboard = await getScoreboard(roomId)

  publishToRoom(roomId, {
    type: 'buzzer_locked',
    data: { questionId },
  })

  publishToRoom(roomId, {
    type: 'scoreboard_update',
    data: { scoreboard },
  })

  const winner = question.winnerId
    ? scoreboard.find((p) => p.participantId === question.winnerId) ?? null
    : null

  return { winner, scoreboard }
}

export async function recordBuzzerPress(
  questionId: string,
  roomId: string,
  participantId: string,
  // clientTimestampMs intentionally ignored — ADR-10: server timestamp is authoritative
): Promise<{ won: boolean }> {
  const serverNow = BigInt(Date.now())

  const question = await prisma.gameShowQuestion.findUnique({
    where: { id: questionId },
  })
  if (!question || question.roomId !== roomId) {
    throw Object.assign(new Error('Question not found'), { code: 'NOT_FOUND', status: 404 })
  }
  if (question.closedAt) {
    publishToRoom(roomId, { type: 'buzzer_locked', data: { questionId } })
    return { won: false }
  }

  // Check if already pressed (idempotency)
  const existing = await prisma.buzzerPress.findUnique({
    where: { questionId_participantId: { questionId, participantId } },
  })
  if (existing) {
    return { won: question.winnerId === participantId }
  }

  // Record the press
  await prisma.buzzerPress.create({
    data: { questionId, participantId, pressedAt: serverNow },
  })

  // First press wins — if no winner yet, crown this participant
  if (!question.winnerId) {
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      select: { displayName: true, score: true },
    })

    await prisma.gameShowQuestion.update({
      where: { id: questionId },
      data: { winnerId: participantId, winnerTimestamp: serverNow },
    })

    // Increment winner's score
    await prisma.participant.update({
      where: { id: participantId },
      data: { score: { increment: 1 } },
    })

    publishToRoom(roomId, {
      type: 'buzzer_winner',
      data: {
        questionId,
        winnerId: participantId,
        winnerName: participant?.displayName ?? 'Unknown',
        pressedAt: String(serverNow),
      },
    })

    const scoreboard = await getScoreboard(roomId)
    publishToRoom(roomId, { type: 'scoreboard_update', data: { scoreboard } })

    return { won: true }
  }

  // Another participant already won
  publishToRoom(roomId, { type: 'buzzer_locked', data: { questionId } })
  return { won: false }
}

export async function getScoreboard(roomId: string): Promise<ScoreboardEntry[]> {
  const participants = await prisma.participant.findMany({
    where: { roomId, leftAt: null },
    orderBy: { score: 'desc' },
    select: { id: true, displayName: true, score: true },
  })
  return participants.map((p) => ({
    participantId: p.id,
    displayName: p.displayName,
    score: p.score,
  }))
}
