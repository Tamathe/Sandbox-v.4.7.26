/**
 * Commons Service — CRUD, state machine, scoring for community sessions.
 *
 * Manages the lifecycle: LOBBY → COUNTDOWN → QUESTION → REVEAL → SCOREBOARD → COMPLETE
 * Reuses room-bus pattern from Sandcastle for real-time events.
 */

import { prisma } from '../prisma'
import { toJsonValue } from '../prisma-utils'
import { publishToRoom } from '../sandcastle/room-bus'
import { notifyGroupOfLiveRoom } from './notification-service'
import type { LiveRoomPhase, LiveRoomType } from '../../generated/prisma'

// ── Types ─────────────────────────────────────────────────────────────────────

export type { PlayerScore, LiveRoomSummary, LiveRoomConfig } from './types'
import type { PlayerScore, LiveRoomSummary, LiveRoomConfig } from './types'

// ── Scoring constants ─────────────────────────────────────────────────────────

const CORRECT_POINTS = 100
const SPEED_BONUS = [50, 30, 10] // 1st, 2nd, 3rd correct
const STREAK_BONUS = 25 // per consecutive correct

// ── Create ────────────────────────────────────────────────────────────────────

export async function createLiveRoom(
  channelId: string,
  hostId: string,
  type: LiveRoomType,
  title: string,
  config: LiveRoomConfig = {},
  courseId?: string,
  assignmentId?: string,
  assessmentMode = false,
): Promise<LiveRoomSummary> {
  // Verify channel exists and user is a member of the group
  const channel = await prisma.chatChannel.findUnique({
    where: { id: channelId },
    include: { group: { include: { memberships: { where: { userId: hostId } } } } },
  })
  if (!channel) throw Object.assign(new Error('Channel not found'), { status: 404 })
  if (channel.group.memberships.length === 0) {
    throw Object.assign(new Error('Not a member of this group'), { status: 403 })
  }

  // Check no active session in this channel
  const activeRoom = await prisma.liveRoom.findFirst({
    where: { channelId, phase: { not: 'COMPLETE' } },
  })
  if (activeRoom) {
    throw Object.assign(new Error('A Commons session is already active in this channel'), { status: 409 })
  }

  let resolvedCourseId = courseId ?? null
  let resolvedAssignmentId = assignmentId ?? null
  let resolvedAssessmentMode = Boolean(assessmentMode || assignmentId)

  if (resolvedAssessmentMode && !resolvedAssignmentId) {
    throw Object.assign(
      new Error('Commons assessment rooms must be linked to an assignment'),
      { status: 400 }
    )
  }

  if (resolvedAssignmentId) {
    const [assignment, host] = await Promise.all([
      prisma.assignment.findUnique({
        where: { id: resolvedAssignmentId },
        select: {
          id: true,
          courseId: true,
          course: {
            select: {
              instructorId: true,
            },
          },
        },
      }),
      prisma.user.findUnique({
        where: { id: hostId },
        select: {
          role: true,
        },
      }),
    ])

    if (!assignment) {
      throw Object.assign(new Error('Assignment not found'), { status: 404 })
    }

    if (!host) {
      throw Object.assign(new Error('Host user not found'), { status: 404 })
    }

    const canManageAssignment =
      host.role === 'ADMIN' || assignment.course.instructorId === hostId

    if (!canManageAssignment) {
      throw Object.assign(
        new Error('Only the assignment owner can create a Commons assessment room'),
        { status: 403 }
      )
    }

    if (resolvedCourseId && resolvedCourseId !== assignment.courseId) {
      throw Object.assign(
        new Error('Assignment does not belong to the provided course'),
        { status: 400 }
      )
    }

    resolvedCourseId = assignment.courseId
  }

  const room = await prisma.liveRoom.create({
    data: {
      channelId,
      hostId,
      type,
      title,
      config: toJsonValue(config),
      courseId: resolvedCourseId,
      assignmentId: resolvedAssignmentId,
      assessmentMode: resolvedAssessmentMode,
    },
    include: { host: { select: { id: true, name: true } } },
  })

  // Auto-join the host
  await prisma.liveRoomParticipant.create({
    data: { roomId: room.id, userId: hostId },
  })

  // Post activity message to channel
  await prisma.channelMessage.create({
    data: {
      channelId,
      authorId: hostId,
      content: `started a ${type === 'CHALLENGE' ? 'Challenge' : 'Commons session'}: "${title}"`,
      messageType: 'live_room',
      liveRoomId: room.id,
      isSandy: false,
    },
  })

  // Notify group members (fire-and-forget)
  void notifyGroupOfLiveRoom(room.id, channelId, hostId, type, title)

  return toLiveRoomSummary(room, [{ userId: hostId, name: room.host.name, score: 0, streak: 0 }])
}

// ── Join ──────────────────────────────────────────────────────────────────────

export async function joinLiveRoom(roomId: string, userId: string): Promise<LiveRoomSummary> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      host: { select: { id: true, name: true } },
      participants: { include: { user: { select: { id: true, name: true } } } },
      channel: { include: { group: { include: { memberships: { where: { userId } } } } } },
    },
  })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })
  if (room.phase === 'COMPLETE') throw Object.assign(new Error('Room has ended'), { status: 400 })
  if (room.channel.group.memberships.length === 0) {
    throw Object.assign(new Error('Not a member of this group'), { status: 403 })
  }

  // Idempotent join
  const existing = room.participants.find((p) => p.userId === userId)
  if (!existing) {
    const participant = await prisma.liveRoomParticipant.create({
      data: { roomId, userId },
      include: { user: { select: { id: true, name: true } } },
    })
    // Add to local array for summary (not persisted — just for return value)
    room.participants = [...room.participants, participant as typeof room.participants[0]]

    publishToRoom(roomId, {
      type: 'player_joined',
      data: {
        userId,
        name: participant.user.name,
        count: room.participants.length,
      },
    })
  }

  return toLiveRoomSummary(
    room,
    room.participants.map((p) => ({
      userId: p.userId,
      name: p.user.name,
      score: p.score,
      streak: p.streak,
    })),
  )
}

// ── Get Room State ────────────────────────────────────────────────────────────

export async function getLiveRoom(roomId: string): Promise<LiveRoomSummary> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      host: { select: { id: true, name: true } },
      participants: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { score: 'desc' },
      },
    },
  })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })

  return toLiveRoomSummary(
    room,
    room.participants.map((p) => ({
      userId: p.userId,
      name: p.user.name,
      score: p.score,
      streak: p.streak,
    })),
  )
}

// ── Start Game ────────────────────────────────────────────────────────────────

export async function startLiveRoom(roomId: string, hostId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({ where: { id: roomId } })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })
  if (room.hostId !== hostId) throw Object.assign(new Error('Only the host can start'), { status: 403 })
  if (room.phase !== 'LOBBY') throw Object.assign(new Error('Room already started'), { status: 400 })

  // Transition to COUNTDOWN
  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'COUNTDOWN', startedAt: new Date() },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'COUNTDOWN' } })

  // Countdown 3-2-1
  for (let i = 3; i >= 1; i--) {
    setTimeout(() => {
      publishToRoom(roomId, { type: 'countdown', data: { seconds: i } })
    }, (3 - i) * 1000)
  }

  // After countdown, open first question (4s total: 3s countdown + 1s pause)
  setTimeout(() => {
    void openNextRound(roomId)
  }, 4000)
}

// ── Open Next Round ───────────────────────────────────────────────────────────

export async function openNextRound(roomId: string): Promise<void> {
  const { generateQuestion } = await import('./question-service')

  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      rounds: { orderBy: { roundNumber: 'desc' }, take: 1 },
      participants: { include: { user: { select: { name: true } } } },
      course: { select: { id: true, title: true, courseCode: true } },
    },
  })
  if (!room) return

  const config = room.config as LiveRoomConfig
  const totalRounds = config.rounds ?? 5
  const nextRoundNumber = room.currentRound + 1

  if (nextRoundNumber > totalRounds) {
    // Game over
    await completeLiveRoom(roomId)
    return
  }

  // Generate question via AI
  const questionData = await generateQuestion({
    topic: config.topic ?? room.title,
    courseName: room.course?.title ?? 'General Knowledge',
    roundNumber: nextRoundNumber,
    totalRounds,
    difficulty: config.difficulty ?? 'medium',
    previousQuestions: room.rounds.map((r) => r.question),
  })

  const timeoutMs = config.timeoutMs ?? 15000

  // Create round in DB
  const round = await prisma.liveRoomRound.create({
    data: {
      roomId,
      roundNumber: nextRoundNumber,
      question: questionData.question,
      options: questionData.options,
      correctIndex: questionData.correctIndex,
      explanation: questionData.explanation,
      timeoutMs,
      openedAt: new Date(),
    },
  })

  // Update room
  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'QUESTION', currentRound: nextRoundNumber },
  })

  publishToRoom(roomId, {
    type: 'question_open',
    data: {
      roundId: round.id,
      roundNumber: nextRoundNumber,
      question: questionData.question,
      options: questionData.options,
      timeoutMs,
      totalRounds,
    },
  })

  // Auto-close after timeout
  setTimeout(() => {
    void closeRound(roomId, round.id)
  }, timeoutMs)
}

// ── Record Answer ─────────────────────────────────────────────────────────────

export async function recordAnswer(
  roomId: string,
  userId: string,
  roundId: string,
  selectedIndex: number,
): Promise<{ isCorrect: boolean; responseTimeMs: number }> {
  const round = await prisma.liveRoomRound.findUnique({
    where: { id: roundId },
    include: { responses: true },
  })
  if (!round) throw Object.assign(new Error('Round not found'), { status: 404 })
  if (round.roomId !== roomId) throw Object.assign(new Error('Round does not belong to room'), { status: 400 })
  if (round.closedAt) throw Object.assign(new Error('Round is closed'), { status: 400 })

  const participant = await prisma.liveRoomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
  })
  if (!participant) throw Object.assign(new Error('Not a participant'), { status: 403 })

  // Idempotency — one answer per participant per round
  const existing = round.responses.find((r) => r.participantId === participant.id)
  if (existing) {
    return { isCorrect: existing.isCorrect, responseTimeMs: existing.responseTimeMs }
  }

  const responseTimeMs = round.openedAt ? Date.now() - round.openedAt.getTime() : 0
  const isCorrect = selectedIndex === round.correctIndex

  await prisma.liveRoomResponse.create({
    data: {
      roundId,
      participantId: participant.id,
      selectedIndex,
      isCorrect,
      responseTimeMs,
    },
  })

  // Update score + streak
  if (isCorrect) {
    // Count how many correct answers came before this one (for speed bonus)
    const correctBefore = round.responses.filter((r) => r.isCorrect).length
    const speedBonus = SPEED_BONUS[correctBefore] ?? 0
    const newStreak = participant.streak + 1
    const streakBonus = newStreak * STREAK_BONUS
    const totalPoints = CORRECT_POINTS + speedBonus + streakBonus

    await prisma.liveRoomParticipant.update({
      where: { id: participant.id },
      data: { score: { increment: totalPoints }, streak: newStreak },
    })
  } else {
    // Reset streak
    await prisma.liveRoomParticipant.update({
      where: { id: participant.id },
      data: { streak: 0 },
    })
  }

  // Broadcast answer count
  const totalParticipants = await prisma.liveRoomParticipant.count({ where: { roomId } })
  const answeredCount = round.responses.length + 1

  publishToRoom(roomId, {
    type: 'player_answered',
    data: {
      userId,
      answeredCount,
      totalPlayers: totalParticipants,
    },
  })

  // If all players answered, close early
  if (answeredCount >= totalParticipants) {
    void closeRound(roomId, roundId)
  }

  return { isCorrect, responseTimeMs }
}

// ── Close Round ───────────────────────────────────────────────────────────────

export async function closeRound(roomId: string, roundId: string): Promise<void> {
  const round = await prisma.liveRoomRound.findUnique({
    where: { id: roundId },
    include: { responses: { include: { participant: { include: { user: { select: { name: true } } } } } } },
  })
  if (!round || round.closedAt) return

  await prisma.liveRoomRound.update({
    where: { id: roundId },
    data: { closedAt: new Date() },
  })

  // Find fastest correct answer
  const correctResponses = round.responses
    .filter((r) => r.isCorrect)
    .sort((a, b) => a.responseTimeMs - b.responseTimeMs)
  const fastest = correctResponses[0]

  // Get updated scoreboard
  const participants = await prisma.liveRoomParticipant.findMany({
    where: { roomId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { score: 'desc' },
  })

  const scores: PlayerScore[] = participants.map((p) => ({
    userId: p.userId,
    name: p.user.name,
    score: p.score,
    streak: p.streak,
  }))

  // Update room phase to REVEAL
  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'REVEAL' },
  })

  publishToRoom(roomId, {
    type: 'reveal',
    data: {
      roundId,
      correctIndex: round.correctIndex,
      explanation: round.explanation,
      scores,
      fastestName: fastest?.participant.user.name ?? null,
      fastestTimeMs: fastest?.responseTimeMs ?? null,
    },
  })

  // Generate Sandy commentary
  const { generateCommentary } = await import('./commentary-service')
  const commentary = await generateCommentary(round, scores, fastest)
  if (commentary) {
    publishToRoom(roomId, { type: 'sandy_says', data: { message: commentary } })
  }

  // After reveal pause, show scoreboard then open next round
  const room = await prisma.liveRoom.findUnique({ where: { id: roomId } })
  const totalRounds = (room?.config as LiveRoomConfig)?.rounds ?? 5

  setTimeout(() => {
    publishToRoom(roomId, {
      type: 'scoreboard',
      data: {
        standings: scores,
        roundNumber: round.roundNumber,
        totalRounds,
      },
    })

    // Next round after brief scoreboard display
    setTimeout(() => {
      void openNextRound(roomId)
    }, 3000)
  }, 4000)
}

// ── Complete ──────────────────────────────────────────────────────────────────

export async function completeLiveRoom(roomId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { score: 'desc' },
      },
      channel: true,
    },
  })
  if (!room) return

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'COMPLETE', endedAt: new Date() },
  })

  const finalStandings: PlayerScore[] = room.participants.map((p) => ({
    userId: p.userId,
    name: p.user.name,
    score: p.score,
    streak: p.streak,
  }))

  // Generate summary message
  const { generateSummary } = await import('./commentary-service')
  const summary = await generateSummary(room.title, finalStandings, room.currentRound)

  publishToRoom(roomId, {
    type: 'complete',
    data: { finalStandings, summary },
  })

  // Post results to chat
  const resultsText = formatResultsMessage(room.title, finalStandings, summary)
  await prisma.channelMessage.create({
    data: {
      channelId: room.channelId,
      authorId: room.hostId,
      content: resultsText,
      messageType: 'system',
      isSandy: true,
    },
  })
}

// ── End Room (early termination) ──────────────────────────────────────────────

export async function endLiveRoom(roomId: string, userId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({ where: { id: roomId } })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })
  if (room.hostId !== userId) throw Object.assign(new Error('Only the host can end the room'), { status: 403 })
  if (room.phase === 'COMPLETE') return

  await completeLiveRoom(roomId)
}

// ── Review Data ───────────────────────────────────────────────────────────────

export async function getRoundsForReview(roomId: string) {
  const rounds = await prisma.liveRoomRound.findMany({
    where: { roomId },
    orderBy: { roundNumber: 'asc' },
    select: {
      roundNumber: true,
      question: true,
      options: true,
      correctIndex: true,
      explanation: true,
    },
  })
  return rounds
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toLiveRoomSummary(
  room: {
    id: string
    channelId: string
    type: LiveRoomType
    title: string
    phase: LiveRoomPhase
    hostId: string
    host?: { id: string; name: string }
    courseId: string | null
    assignmentId: string | null
    assessmentMode: boolean
    currentRound: number
    config: unknown
    createdAt: Date
    startedAt: Date | null
    endedAt: Date | null
  },
  participants: PlayerScore[],
): LiveRoomSummary {
  const config = room.config as LiveRoomConfig
  return {
    id: room.id,
    channelId: room.channelId,
    type: room.type,
    title: room.title,
    phase: room.phase,
    hostId: room.hostId,
    hostName: room.host?.name ?? 'Unknown',
    courseId: room.courseId,
    assignmentId: room.assignmentId,
    currentRound: room.currentRound,
    config,
    assessmentMode: room.assessmentMode,
    participants,
    totalRounds: config.rounds ?? 5,
    createdAt: room.createdAt.toISOString(),
    startedAt: room.startedAt?.toISOString() ?? null,
    endedAt: room.endedAt?.toISOString() ?? null,
  }
}

function formatResultsMessage(title: string, standings: PlayerScore[], summary: string): string {
  const medals = ['🥇', '🥈', '🥉']
  const lines = standings.map((p, i) => {
    const medal = medals[i] ?? `${i + 1}.`
    return `${medal} ${p.name} — ${p.score} pts`
  })

  return `🏆 Challenge Complete — ${title}\n\n${lines.join('\n')}\n\n${summary}`
}
