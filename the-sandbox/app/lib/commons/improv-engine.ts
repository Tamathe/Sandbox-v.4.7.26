/**
 * Improv Engine -- Improvisational learning with field-relevant scenarios.
 *
 * Sandy generates a scenario, each participant performs in turn (60s),
 * others rate on empathy/accuracy/professionalism, and Sandy provides
 * coaching feedback. Debrief shows average scores + Sandy's coaching summary.
 *
 * Lifecycle: LOBBY -> SCENARIO (COUNTDOWN) -> PERFORM per person (QUESTION)
 *   -> RATE (REVEAL) -> repeat -> DEBRIEF (SCOREBOARD) -> COMPLETE
 * Reuses LiveRoom phases: LOBBY, COUNTDOWN=SCENARIO, QUESTION=PERFORM,
 *   REVEAL=RATE, SCOREBOARD=DEBRIEF, COMPLETE
 */

import { prisma } from '../prisma'
import { publishToRoom } from '../sandcastle/room-bus'
import Anthropic from '@anthropic-ai/sdk'

// -- Config -------------------------------------------------------------------

export type { ImprovConfig } from './types'
import type { ImprovConfig } from './types'

// -- In-Memory Session State --------------------------------------------------

interface ImprovRating {
  empathy: number
  accuracy: number
  professionalism: number
}

interface ImprovSessionState {
  scenario: string
  performOrder: string[]  // userId order
  currentPerformerIndex: number
  performances: Map<string, string>  // userId -> response text
  ratings: Map<string, Map<string, ImprovRating>>  // performerUserId -> { raterUserId -> rating }
  sandyCoaching: Map<string, string>  // performerUserId -> coaching text
  timerHandle: ReturnType<typeof setTimeout> | null
  participantNames: Map<string, string>  // userId -> name
}

const sessionState = new Map<string, ImprovSessionState>()

// -- Fallback Scenarios -------------------------------------------------------

const FALLBACK_SCENARIOS = [
  'A frustrated parent arrives at your office. Their child was just suspended for something they insist was a misunderstanding. They are visibly upset and demand to speak with someone in charge. You need to de-escalate the situation, gather facts, and find a path forward.',
  'You are a customer service representative at a tech company. A long-time client calls threatening to cancel their contract because a recent software update broke a critical workflow. They have a presentation to the board tomorrow and need a solution immediately.',
  'You are a nurse in a busy ER. A patient who has been waiting 3 hours approaches the desk. They are in pain, scared, and starting to raise their voice. Their family members are also getting agitated. You need to manage the situation while maintaining the triage order.',
  'You are a project manager. In a team meeting, two senior engineers get into a heated disagreement about the architecture for a critical deadline. Both have valid points but are talking past each other. The rest of the team looks uncomfortable. You need to facilitate resolution.',
]

// -- Start Improv -------------------------------------------------------------

export async function startImprov(roomId: string, hostId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: { include: { user: { select: { id: true, name: true } } } },
      course: { select: { id: true, title: true } },
    },
  })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })
  if (room.hostId !== hostId) throw Object.assign(new Error('Only the host can start'), { status: 403 })
  if (room.type !== 'IMPROV') throw Object.assign(new Error('Not an improv room'), { status: 400 })
  if (room.phase !== 'LOBBY') throw Object.assign(new Error('Room already started'), { status: 400 })
  if (room.participants.length < 2) throw Object.assign(new Error('Need at least 2 participants'), { status: 400 })

  const config = room.config as unknown as ImprovConfig

  // Generate scenario
  const scenario = await generateImprovScenario(
    config.topic,
    room.course?.title ?? 'General',
  )

  // Randomize perform order
  const shuffled = [...room.participants].sort(() => Math.random() - 0.5)
  const performOrder = shuffled.map((p) => p.userId)

  // Name lookup
  const participantNames = new Map<string, string>()
  for (const p of room.participants) {
    participantNames.set(p.userId, p.user.name)
  }

  // Initialize session state
  sessionState.set(roomId, {
    scenario,
    performOrder,
    currentPerformerIndex: -1,
    performances: new Map(),
    ratings: new Map(),
    sandyCoaching: new Map(),
    timerHandle: null,
    participantNames,
  })

  // Update room phase
  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'COUNTDOWN', startedAt: new Date() },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'SCENARIO' } })
  publishToRoom(roomId, {
    type: 'improv_scenario',
    data: {
      scenario,
      performOrder: performOrder.map((id) => ({
        userId: id,
        name: participantNames.get(id) ?? 'Unknown',
      })),
    },
  })

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: {
      message: `Improv time! Read the scenario carefully. Each of you will take a turn responding as if you were in this situation. You have 60 seconds to perform. After each performance, everyone rates on empathy, accuracy, and professionalism. Let's go!`,
    },
  })

  // After 8s reading time, start first performer
  setTimeout(() => {
    void advanceToNextPerformer(roomId)
  }, 8000)
}

// -- Advance to Next Performer ------------------------------------------------

async function advanceToNextPerformer(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  state.currentPerformerIndex++

  if (state.currentPerformerIndex >= state.performOrder.length) {
    // All done performing, show debrief
    await showDebrief(roomId)
    return
  }

  const performerUserId = state.performOrder[state.currentPerformerIndex]!
  const performerName = state.participantNames.get(performerUserId) ?? 'Unknown'

  const config = await getConfig(roomId)
  const performTimeMs = config?.performTimeMs ?? 60000

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'QUESTION', currentRound: state.currentPerformerIndex + 1 },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'PERFORM' } })
  publishToRoom(roomId, {
    type: 'perform_turn',
    data: {
      performerUserId,
      performerName,
      performTimeMs,
      turnNumber: state.currentPerformerIndex + 1,
      totalTurns: state.performOrder.length,
    },
  })

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: { message: `${performerName}, you're up! How would you handle this situation? You have 60 seconds.` },
  })

  // Auto-advance after timeout
  if (state.timerHandle) clearTimeout(state.timerHandle)
  state.timerHandle = setTimeout(() => {
    void autoAdvancePerformer(roomId)
  }, performTimeMs)
}

// -- Auto Advance Performer ---------------------------------------------------

async function autoAdvancePerformer(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  const performerUserId = state.performOrder[state.currentPerformerIndex]
  if (performerUserId && !state.performances.has(performerUserId)) {
    state.performances.set(performerUserId, '(No response submitted in time)')
  }

  // Move to rating
  await transitionToRating(roomId)
}

// -- Submit Performance -------------------------------------------------------

export async function submitPerformance(
  roomId: string,
  userId: string,
  text: string,
): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) throw Object.assign(new Error('Session not found'), { status: 404 })

  const currentPerformer = state.performOrder[state.currentPerformerIndex]
  if (currentPerformer !== userId) throw Object.assign(new Error('Not your turn to perform'), { status: 403 })
  if (state.performances.has(userId)) throw Object.assign(new Error('Already submitted'), { status: 400 })

  state.performances.set(userId, text)
  const performerName = state.participantNames.get(userId) ?? 'Unknown'

  publishToRoom(roomId, {
    type: 'performance_submitted',
    data: {
      performerUserId: userId,
      performerName,
      text,
    },
  })

  // Clear timer, transition to rating after brief pause
  if (state.timerHandle) {
    clearTimeout(state.timerHandle)
    state.timerHandle = null
  }

  // Generate Sandy's coaching in background
  void generateCoaching(roomId, userId, state.scenario, text)

  setTimeout(() => {
    void transitionToRating(roomId)
  }, 2000)
}

// -- Transition to Rating -----------------------------------------------------

async function transitionToRating(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  const performerUserId = state.performOrder[state.currentPerformerIndex]
  if (!performerUserId) return

  const performerName = state.participantNames.get(performerUserId) ?? 'Unknown'
  const performance = state.performances.get(performerUserId) ?? '(No response)'

  const config = await getConfig(roomId)
  const rateTimeMs = config?.rateTimeMs ?? 30000

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'REVEAL' },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'RATE' } })
  publishToRoom(roomId, {
    type: 'rate_performance',
    data: {
      performerUserId,
      performerName,
      performance,
      rateTimeMs,
    },
  })

  // Auto-advance after rating time
  if (state.timerHandle) clearTimeout(state.timerHandle)
  state.timerHandle = setTimeout(() => {
    void advanceToNextPerformer(roomId)
  }, rateTimeMs)
}

// -- Submit Rating ------------------------------------------------------------

export async function submitImprovRating(
  roomId: string,
  raterId: string,
  performerId: string,
  empathy: number,
  accuracy: number,
  professionalism: number,
): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) throw Object.assign(new Error('Session not found'), { status: 404 })

  const currentPerformer = state.performOrder[state.currentPerformerIndex]
  if (currentPerformer !== performerId) throw Object.assign(new Error('Not rating the current performer'), { status: 400 })
  if (raterId === performerId) throw Object.assign(new Error('Cannot rate yourself'), { status: 400 })

  const clamp = (v: number) => Math.min(5, Math.max(1, Math.round(v)))

  if (!state.ratings.has(performerId)) {
    state.ratings.set(performerId, new Map())
  }
  state.ratings.get(performerId)!.set(raterId, {
    empathy: clamp(empathy),
    accuracy: clamp(accuracy),
    professionalism: clamp(professionalism),
  })

  const raterCount = state.ratings.get(performerId)!.size
  const totalRaters = state.performOrder.length - 1  // everyone except performer

  publishToRoom(roomId, {
    type: 'improv_rating_received',
    data: { performerUserId: performerId, raterCount, totalRaters },
  })

  // If all rated, advance early
  if (raterCount >= totalRaters) {
    if (state.timerHandle) {
      clearTimeout(state.timerHandle)
      state.timerHandle = null
    }
    setTimeout(() => {
      void advanceToNextPerformer(roomId)
    }, 1000)
  }
}

// -- Show Debrief -------------------------------------------------------------

async function showDebrief(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'SCOREBOARD' },
  })

  // Calculate average ratings per performer
  const results = state.performOrder.map((userId) => {
    const name = state.participantNames.get(userId) ?? 'Unknown'
    const performance = state.performances.get(userId) ?? ''
    const peerRatings = state.ratings.get(userId)
    const coaching = state.sandyCoaching.get(userId) ?? ''

    let avgEmpathy = 0
    let avgAccuracy = 0
    let avgProfessionalism = 0

    if (peerRatings && peerRatings.size > 0) {
      let totalE = 0, totalA = 0, totalP = 0
      for (const r of peerRatings.values()) {
        totalE += r.empathy
        totalA += r.accuracy
        totalP += r.professionalism
      }
      const count = peerRatings.size
      avgEmpathy = Math.round((totalE / count) * 10) / 10
      avgAccuracy = Math.round((totalA / count) * 10) / 10
      avgProfessionalism = Math.round((totalP / count) * 10) / 10
    }

    const overall = avgEmpathy + avgAccuracy + avgProfessionalism > 0
      ? Math.round(((avgEmpathy + avgAccuracy + avgProfessionalism) / 3) * 10) / 10
      : 0

    return {
      userId,
      name,
      performance: performance.substring(0, 300),
      empathy: avgEmpathy,
      accuracy: avgAccuracy,
      professionalism: avgProfessionalism,
      overall,
      coaching,
    }
  })

  // Update participant scores
  for (const r of results) {
    if (r.overall > 0) {
      await prisma.liveRoomParticipant.update({
        where: { roomId_userId: { roomId, userId: r.userId } },
        data: { score: Math.round(r.overall * 100) },
      }).catch(() => {})
    }
  }

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'DEBRIEF' } })
  publishToRoom(roomId, {
    type: 'improv_debrief',
    data: { scenario: state.scenario, results },
  })

  const best = [...results].sort((a, b) => b.overall - a.overall)[0]
  if (best && best.overall > 0) {
    publishToRoom(roomId, {
      type: 'sandy_says',
      data: {
        message: `${best.name} had the highest overall score at ${best.overall}/5. Great improv session! Remember -- in real situations, empathy is just as important as accuracy.`,
      },
    })
  }

  // Auto-complete after viewing debrief
  setTimeout(() => {
    void completeImprov(roomId)
  }, 15000)
}

// -- Complete Improv ----------------------------------------------------------

async function completeImprov(roomId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: { include: { user: { select: { name: true } } } },
      channel: true,
    },
  })
  if (!room || room.phase === 'COMPLETE') return

  const config = room.config as unknown as ImprovConfig
  const state = sessionState.get(roomId)

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'COMPLETE', endedAt: new Date() },
  })

  const names = room.participants.map((p) => p.user.name)

  await prisma.channelMessage.create({
    data: {
      channelId: room.channelId,
      authorId: room.hostId,
      content: `Improv Complete -- "${config.topic}"\n\n${names.length} participants practiced real-world scenario responses.\n\nParticipants: ${names.join(', ')}\n\nPractice makes progress -- every performance builds confidence for the real thing.`,
      messageType: 'system',
      isSandy: true,
    },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'COMPLETE' } })
  publishToRoom(roomId, {
    type: 'complete',
    data: { participants: names },
  })

  // Cleanup
  if (state?.timerHandle) clearTimeout(state.timerHandle)
  sessionState.delete(roomId)
}

// -- End Improv (host early termination) --------------------------------------

export async function endImprov(roomId: string, userId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({ where: { id: roomId } })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })
  if (room.hostId !== userId) throw Object.assign(new Error('Only the host can end'), { status: 403 })
  if (room.phase === 'COMPLETE') return

  const state = sessionState.get(roomId)
  if (state?.timerHandle) clearTimeout(state.timerHandle)

  await completeImprov(roomId)
}

// -- AI: Generate Scenario ----------------------------------------------------

async function generateImprovScenario(
  topic: string,
  courseName: string,
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return FALLBACK_SCENARIOS[Math.floor(Math.random() * FALLBACK_SCENARIOS.length)]!
  }

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: `You are Sandy, an improv facilitator at the University of Kentucky. Generate a realistic, field-relevant scenario for students to practice responding to.

Course context: ${courseName}

The scenario should:
1. Present a realistic interpersonal situation relevant to their field
2. Involve a person who needs help, is upset, or needs guidance
3. Require empathy, accuracy, and professionalism to handle well
4. Be 2-3 paragraphs with enough detail to respond to

Return ONLY the scenario text, no JSON wrapper.`,
      messages: [{ role: 'user', content: `Generate an improv scenario about: "${topic}"` }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    if (text.trim().length < 50) {
      return FALLBACK_SCENARIOS[0]!
    }

    return text.trim()
  } catch (err) {
    console.error('[ImprovEngine] Scenario generation failed:', err)
    return FALLBACK_SCENARIOS[Math.floor(Math.random() * FALLBACK_SCENARIOS.length)]!
  }
}

// -- AI: Generate Coaching Feedback -------------------------------------------

async function generateCoaching(
  roomId: string,
  performerUserId: string,
  scenario: string,
  performance: string,
): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  const performerName = state.participantNames.get(performerUserId) ?? 'Unknown'

  if (!process.env.ANTHROPIC_API_KEY) {
    state.sandyCoaching.set(performerUserId, `${performerName} showed good engagement with the scenario. Keep practicing active listening and empathy in these situations.`)
    return
  }

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: `You are Sandy, a coaching facilitator. Provide brief, constructive feedback on a student's improv performance. Evaluate empathy, accuracy, and professionalism. Be encouraging but honest. 2-3 sentences max.`,
      messages: [{
        role: 'user',
        content: `Scenario: "${scenario.substring(0, 300)}"\n\n${performerName}'s response: "${performance.substring(0, 500)}"`,
      }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    state.sandyCoaching.set(performerUserId, text.trim() || `${performerName} engaged with the scenario thoughtfully.`)
  } catch (err) {
    console.error('[ImprovEngine] Coaching generation failed:', err)
    state.sandyCoaching.set(performerUserId, `${performerName} showed solid engagement. Keep building on those instincts.`)
  }
}

// -- Helpers ------------------------------------------------------------------

async function getConfig(roomId: string): Promise<ImprovConfig | null> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    select: { config: true },
  })
  return room?.config as unknown as ImprovConfig | null
}
