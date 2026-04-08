/**
 * Speed Mentoring Engine — Rapid-rotation paired mentoring sessions.
 *
 * Sandy pairs participants round-robin, provides conversation prompts per
 * round, manages timers and rotations, then delivers a debrief summary.
 *
 * Lifecycle: LOBBY -> PAIR (COUNTDOWN) -> SESSION (QUESTION, 10 min) ->
 *   ROTATE (REVEAL) -> SESSION -> ... -> DEBRIEF (SCOREBOARD) -> COMPLETE
 * Reuses LiveRoom phases: LOBBY, COUNTDOWN=PAIR, QUESTION=SESSION,
 *   REVEAL=ROTATE, SCOREBOARD=DEBRIEF, COMPLETE
 */

import { prisma } from '../prisma'
import { publishToRoom } from '../sandcastle/room-bus'
import Anthropic from '@anthropic-ai/sdk'

// -- Config -------------------------------------------------------------------

export type { SpeedMentoringConfig } from './types'
import type { SpeedMentoringConfig } from './types'

// -- In-Memory Session State --------------------------------------------------

interface SpeedMentoringSessionState {
  pairings: Array<{ round: number; pairs: Array<[string, string]> }>
  currentRound: number
  totalRounds: number
  prompts: string[] // Sandy-generated conversation prompts per round
  participantNames: Map<string, string> // userId -> name
  timerHandle: ReturnType<typeof setTimeout> | null
}

const sessionState = new Map<string, SpeedMentoringSessionState>()

// -- Fallback Prompts ---------------------------------------------------------

function fallbackPrompts(topic: string, count: number): string[] {
  const prompts = [
    `Share your biggest challenge related to "${topic}" and how you've been approaching it. Ask your partner for their perspective.`,
    `What's one thing about "${topic}" that you wish more people understood? Discuss why it matters.`,
    `If you could change one thing about how "${topic}" is taught or practiced, what would it be? Compare ideas with your partner.`,
    `Describe a real experience you've had with "${topic}" -- what went well and what you'd do differently. Listen to your partner's story too.`,
    `What's the most surprising thing you've learned about "${topic}"? Share insights and see where your knowledge overlaps or diverges.`,
  ]
  return prompts.slice(0, count)
}

// -- Pairing Logic (round-robin) ----------------------------------------------

function generateRoundRobinPairings(
  userIds: string[],
  totalRounds: number,
): Array<{ round: number; pairs: Array<[string, string]> }> {
  const ids = [...userIds]
  // If odd number, add a "bye" placeholder
  const hasBye = ids.length % 2 !== 0
  if (hasBye) ids.push('__bye__')

  const n = ids.length
  const rounds: Array<{ round: number; pairs: Array<[string, string]> }> = []

  for (let r = 0; r < totalRounds; r++) {
    const pairs: Array<[string, string]> = []
    for (let i = 0; i < n / 2; i++) {
      const a = ids[i]!
      const b = ids[n - 1 - i]!
      if (a !== '__bye__' && b !== '__bye__') {
        pairs.push([a, b])
      }
    }
    rounds.push({ round: r + 1, pairs })

    // Rotate: fix first element, rotate the rest
    const last = ids.pop()!
    ids.splice(1, 0, last)
  }

  return rounds
}

// -- Start Speed Mentoring ----------------------------------------------------

export async function startSpeedMentoring(roomId: string, hostId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: { include: { user: { select: { id: true, name: true } } } },
      course: { select: { id: true, title: true } },
    },
  })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })
  if (room.hostId !== hostId) throw Object.assign(new Error('Only the host can start'), { status: 403 })
  if (room.type !== 'SPEED_MENTORING') throw Object.assign(new Error('Not a speed mentoring room'), { status: 400 })
  if (room.phase !== 'LOBBY') throw Object.assign(new Error('Room already started'), { status: 400 })
  if (room.participants.length < 2) throw Object.assign(new Error('Need at least 2 participants'), { status: 400 })

  const config = room.config as unknown as SpeedMentoringConfig
  const totalRounds = Math.min(room.participants.length - 1, 3)
  const userIds = room.participants.map((p) => p.userId)

  // Build name map
  const participantNames = new Map<string, string>()
  for (const p of room.participants) {
    participantNames.set(p.userId, p.user.name)
  }

  // Generate pairings
  const pairings = generateRoundRobinPairings(userIds, totalRounds)

  // Generate conversation prompts
  const prompts = await generatePrompts(config.topic, totalRounds, room.course?.title ?? 'General')

  // Phase -> COUNTDOWN (PAIR)
  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'COUNTDOWN', startedAt: new Date() },
  })

  // Initialize state
  sessionState.set(roomId, {
    pairings,
    currentRound: 0,
    totalRounds,
    prompts,
    participantNames,
    timerHandle: null,
  })

  // Broadcast pairings overview
  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'PAIR' } })
  publishToRoom(roomId, {
    type: 'mentoring_paired',
    data: {
      totalRounds,
      pairings: pairings.map((r) => ({
        round: r.round,
        pairs: r.pairs.map(([a, b]) => ({
          userA: a,
          nameA: participantNames.get(a) ?? 'Unknown',
          userB: b,
          nameB: participantNames.get(b) ?? 'Unknown',
        })),
      })),
    },
  })

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: {
      message: `Speed Mentoring is starting! You'll have ${totalRounds} rounds of paired conversations. Each round is 10 minutes with a Sandy-provided conversation prompt. Let's make meaningful connections!`,
    },
  })

  // After 5s, start first round
  setTimeout(() => {
    void advanceRound(roomId)
  }, 5000)
}

// -- Advance Round ------------------------------------------------------------

async function advanceRound(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  state.currentRound++
  const roundIndex = state.currentRound - 1

  if (state.currentRound > state.totalRounds) {
    await debriefPhase(roomId)
    return
  }

  const roundData = state.pairings[roundIndex]
  if (!roundData) {
    await debriefPhase(roomId)
    return
  }

  const prompt = state.prompts[roundIndex] ?? `Discuss your experiences and insights about the topic with your partner.`

  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    select: { config: true },
  })
  const config = room?.config as unknown as SpeedMentoringConfig
  const sessionTimeMs = config?.sessionTimeMs ?? 600000

  // Phase -> QUESTION (SESSION)
  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'QUESTION', currentRound: state.currentRound },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'SESSION' } })
  publishToRoom(roomId, {
    type: 'round_started',
    data: {
      round: state.currentRound,
      totalRounds: state.totalRounds,
      prompt,
      sessionTimeMs,
      pairs: roundData.pairs.map(([a, b]) => ({
        userA: a,
        nameA: state.participantNames.get(a) ?? 'Unknown',
        userB: b,
        nameB: state.participantNames.get(b) ?? 'Unknown',
      })),
    },
  })

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: {
      message: `Round ${state.currentRound} of ${state.totalRounds} -- You have ${Math.round(sessionTimeMs / 60000)} minutes. Here's your conversation starter: "${prompt}"`,
    },
  })

  // Timer for auto-rotate
  if (state.timerHandle) clearTimeout(state.timerHandle)
  state.timerHandle = setTimeout(() => {
    void rotateRound(roomId)
  }, sessionTimeMs)
}

// -- Rotate -------------------------------------------------------------------

async function rotateRound(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  if (state.currentRound >= state.totalRounds) {
    await debriefPhase(roomId)
    return
  }

  // Phase -> REVEAL (ROTATE) briefly
  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'REVEAL' },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'ROTATE' } })
  publishToRoom(roomId, {
    type: 'sandy_says',
    data: { message: `Time's up! Rotating to your next partner...` },
  })

  // Brief pause, then advance
  setTimeout(() => {
    void advanceRound(roomId)
  }, 3000)
}

// -- Debrief ------------------------------------------------------------------

async function debriefPhase(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  const config = (await prisma.liveRoom.findUnique({
    where: { id: roomId },
    select: { config: true },
  }))?.config as unknown as SpeedMentoringConfig

  const summary = await generateDebrief(config?.topic ?? 'the topic', state.totalRounds, state.prompts)

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'SCOREBOARD' },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'DEBRIEF' } })
  publishToRoom(roomId, {
    type: 'debrief',
    data: { summary },
  })

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: { message: 'All rounds complete! Here\'s a summary of the key themes from your conversations.' },
  })

  // Auto-complete after 15s
  setTimeout(() => {
    void completeSpeedMentoring(roomId)
  }, 15000)
}

// -- Complete -----------------------------------------------------------------

async function completeSpeedMentoring(roomId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: { include: { user: { select: { name: true } } } },
      channel: true,
    },
  })
  if (!room || room.phase === 'COMPLETE') return

  const config = room.config as unknown as SpeedMentoringConfig
  const state = sessionState.get(roomId)

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'COMPLETE', endedAt: new Date() },
  })

  const names = room.participants.map((p) => p.user.name)
  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'COMPLETE' } })
  publishToRoom(roomId, { type: 'complete', data: { participants: names } })

  await prisma.channelMessage.create({
    data: {
      channelId: room.channelId,
      authorId: room.hostId,
      content: `Speed Mentoring Complete -- "${config.topic}"\n\n${names.length} participants completed ${state?.totalRounds ?? 3} rounds of paired conversations.\n\nParticipants: ${names.join(', ')}\n\nEvery conversation builds understanding. Great networking!`,
      messageType: 'system',
      isSandy: true,
    },
  })

  if (state?.timerHandle) clearTimeout(state.timerHandle)
  sessionState.delete(roomId)
}

// -- End (host early termination) ---------------------------------------------

export async function endSpeedMentoring(roomId: string, userId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({ where: { id: roomId } })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })
  if (room.hostId !== userId) throw Object.assign(new Error('Only the host can end'), { status: 403 })
  if (room.phase === 'COMPLETE') return

  const state = sessionState.get(roomId)
  if (state?.timerHandle) clearTimeout(state.timerHandle)

  await completeSpeedMentoring(roomId)
}

// -- AI: Generate Prompts -----------------------------------------------------

async function generatePrompts(topic: string, count: number, courseName: string): Promise<string[]> {
  if (!process.env.ANTHROPIC_API_KEY) return fallbackPrompts(topic, count)

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: `Generate exactly ${count} conversation prompts for a speed mentoring session. Each prompt should spark a meaningful 10-minute discussion between two people. Make them progressively deeper. Topic: "${topic}", Course: "${courseName}". Return ONLY a JSON array of strings. No markdown.`,
      messages: [{ role: 'user', content: `Generate ${count} mentoring conversation prompts about: ${topic}` }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const parsed = JSON.parse(text) as string[]
    if (Array.isArray(parsed) && parsed.length >= count) return parsed.slice(0, count)
    return fallbackPrompts(topic, count)
  } catch {
    return fallbackPrompts(topic, count)
  }
}

// -- AI: Generate Debrief -----------------------------------------------------

async function generateDebrief(topic: string, rounds: number, prompts: string[]): Promise<string> {
  const fallback = `Great speed mentoring session! Over ${rounds} rounds, you explored different facets of "${topic}" with different partners. Each conversation brought fresh perspectives. The connections you made today are the foundation for ongoing collaboration.`

  if (!process.env.ANTHROPIC_API_KEY) return fallback

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: `You are Sandy. Summarize a speed mentoring session. Topic: "${topic}". ${rounds} rounds were completed with these prompts:\n${prompts.map((p, i) => `Round ${i + 1}: ${p}`).join('\n')}\n\nWrite a 2-3 paragraph debrief that:\n1. Highlights likely key themes that emerged\n2. Notes the value of multiple perspectives\n3. Encourages continued connection\n\nReturn ONLY the debrief text.`,
      messages: [{ role: 'user', content: `Generate a debrief summary for the speed mentoring session.` }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    if (text.trim().length < 30) return fallback
    return text.trim()
  } catch (err) {
    console.error('[SpeedMentoringEngine] Debrief generation failed:', err)
    return fallback
  }
}
