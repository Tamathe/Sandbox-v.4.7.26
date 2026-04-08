/**
 * Poll Service — DB operations for Sandcastle polls and votes.
 * recordVote uses Prisma upsert (one vote per participantId per pollId).
 */

import { prisma } from '../prisma'
import { publishToRoom } from './room-bus'
import { generatePollInsight } from './insight-service'
import type { Poll, PollVote } from '../../generated/prisma'

export interface PollSummary {
  pollId: string
  question: string
  options: string[]
  durationSeconds?: number
  openedAt: string
  closedAt?: string
  totals: number[]
  totalVotes: number
}

function computeTotals(votes: PollVote[], optionCount: number): number[] {
  const totals = Array(optionCount).fill(0) as number[]
  for (const vote of votes) {
    if (vote.optionIndex >= 0 && vote.optionIndex < optionCount) {
      totals[vote.optionIndex]++
    }
  }
  return totals
}

export async function openPoll(
  roomId: string,
  hostId: string,
  question: string,
  options: string[],
  durationSeconds?: number,
): Promise<{ pollId: string; openedAt: string }> {
  const room = await prisma.room.findUnique({ where: { id: roomId } })
  if (!room) throw Object.assign(new Error('Room not found'), { code: 'ROOM_NOT_FOUND', status: 404 })
  if (room.hostId !== hostId) throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN', status: 403 })
  if (room.phase !== 'ACTIVE') throw Object.assign(new Error('Room is not active'), { code: 'ROOM_NOT_ACTIVE', status: 400 })

  // Check for already-open poll
  const openPoll = await prisma.poll.findFirst({
    where: { roomId, closedAt: null },
  })
  if (openPoll) throw Object.assign(new Error('A poll is already open'), { code: 'POLL_ALREADY_OPEN', status: 400 })

  const poll = await prisma.poll.create({
    data: { roomId, question, options, durationSeconds },
  })

  publishToRoom(roomId, {
    type: 'poll_opened',
    data: {
      pollId: poll.id,
      question: poll.question,
      options: poll.options,
      openedAt: poll.openedAt.toISOString(),
      durationSeconds: durationSeconds ?? null,
    },
  })

  return { pollId: poll.id, openedAt: poll.openedAt.toISOString() }
}

export async function closePoll(
  pollId: string,
  roomId: string,
  hostId: string,
): Promise<{ finalTotals: number[]; totalVotes: number; insightId?: string }> {
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: { votes: true },
  })
  if (!poll) throw Object.assign(new Error('Poll not found'), { code: 'POLL_NOT_FOUND', status: 404 })
  if (poll.roomId !== roomId) throw Object.assign(new Error('Poll not found'), { code: 'POLL_NOT_FOUND', status: 404 })

  const room = await prisma.room.findUnique({ where: { id: roomId } })
  if (!room || room.hostId !== hostId) throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN', status: 403 })
  if (poll.closedAt) throw Object.assign(new Error('Poll already closed'), { code: 'ALREADY_CLOSED', status: 409 })

  const finalTotals = computeTotals(poll.votes, poll.options.length)
  const totalVotes = poll.votes.length

  await prisma.poll.update({
    where: { id: pollId },
    data: { closedAt: new Date(), finalTotals },
  })

  publishToRoom(roomId, {
    type: 'poll_closed',
    data: { pollId, finalTotals, totalVotes },
  })

  // Fire-and-forget AI insight if the room has pollInsights enabled
  try {
    const flags = JSON.parse(room.featureFlagsJson) as Record<string, boolean>
    if (flags['pollInsights']) {
      generatePollInsight(pollId, roomId, poll.question, poll.options, finalTotals).catch(
        (err) => console.error('[PollService] insight generation failed:', err),
      )
    }
  } catch {
    // malformed featureFlagsJson — skip
  }

  return { finalTotals, totalVotes }
}

export async function recordVote(
  pollId: string,
  roomId: string,
  participantId: string,
  optionIndex: number,
): Promise<{ accepted: boolean; reason?: string; totals: number[]; totalVotes: number }> {
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: { votes: true },
  })
  if (!poll || poll.roomId !== roomId) {
    return { accepted: false, reason: 'POLL_NOT_FOUND', totals: [], totalVotes: 0 }
  }
  if (poll.closedAt) {
    return { accepted: false, reason: 'POLL_CLOSED', totals: computeTotals(poll.votes, poll.options.length), totalVotes: poll.votes.length }
  }
  if (optionIndex < 0 || optionIndex >= poll.options.length) {
    return { accepted: false, reason: 'INVALID_OPTION', totals: computeTotals(poll.votes, poll.options.length), totalVotes: poll.votes.length }
  }

  // Check if already voted (upsert is idempotent but we want to signal rejection)
  const existing = await prisma.pollVote.findUnique({
    where: { pollId_participantId: { pollId, participantId } },
  })
  if (existing) {
    return { accepted: false, reason: 'ALREADY_VOTED', totals: computeTotals(poll.votes, poll.options.length), totalVotes: poll.votes.length }
  }

  // Upsert: one vote per participantId per pollId
  await prisma.pollVote.upsert({
    where: { pollId_participantId: { pollId, participantId } },
    update: { optionIndex },
    create: { pollId, participantId, optionIndex },
  })

  // Recount with new vote
  const updatedVotes = await prisma.pollVote.findMany({ where: { pollId } })
  const totals = computeTotals(updatedVotes, poll.options.length)
  const totalVotes = updatedVotes.length

  publishToRoom(roomId, {
    type: 'poll_vote_update',
    data: { pollId, totals, totalVotes },
  })

  return { accepted: true, totals, totalVotes }
}

export async function getPollResults(
  pollId: string,
  roomId: string,
): Promise<PollSummary | null> {
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: { votes: true },
  })
  if (!poll || poll.roomId !== roomId) return null

  const totals = poll.closedAt
    ? poll.finalTotals
    : computeTotals(poll.votes, poll.options.length)

  return {
    pollId: poll.id,
    question: poll.question,
    options: poll.options,
    durationSeconds: poll.durationSeconds ?? undefined,
    openedAt: poll.openedAt.toISOString(),
    closedAt: poll.closedAt?.toISOString(),
    totals,
    totalVotes: poll.votes.length,
  }
}

export async function listPolls(roomId: string): Promise<PollSummary[]> {
  const polls = await prisma.poll.findMany({
    where: { roomId },
    include: { votes: true },
    orderBy: { openedAt: 'asc' },
  })

  return polls.map((poll: Poll & { votes: PollVote[] }) => {
    const totals = poll.closedAt
      ? poll.finalTotals
      : computeTotals(poll.votes, poll.options.length)
    return {
      pollId: poll.id,
      question: poll.question,
      options: poll.options,
      durationSeconds: poll.durationSeconds ?? undefined,
      openedAt: poll.openedAt.toISOString(),
      closedAt: poll.closedAt?.toISOString(),
      totals,
      totalVotes: poll.votes.length,
    }
  })
}
