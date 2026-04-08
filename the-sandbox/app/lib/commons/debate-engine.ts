/**
 * Debate Engine -- Structured argumentation with Sandy as moderator.
 *
 * Participants take opposing positions on a topic. Sandy moderates turns,
 * enforces time limits, fact-checks statements, and delivers a post-debate
 * summary with scoring on logic, evidence, and persuasion.
 *
 * Lifecycle: LOBBY -> TOPIC_REVEAL (COUNTDOWN) -> OPENING per person (QUESTION)
 *   -> REBUTTAL per person (REVEAL) -> VOTE (SCOREBOARD) -> COMPLETE
 * Reuses LiveRoom phases: LOBBY, COUNTDOWN=TOPIC, QUESTION=OPENING/REBUTTAL/CLOSING,
 *   REVEAL=VOTE, SCOREBOARD=RESULTS, COMPLETE
 */

import { prisma } from '../prisma'
import { publishToRoom } from '../sandcastle/room-bus'
import Anthropic from '@anthropic-ai/sdk'
import { setRoomAssessmentResults } from '../assessment/commons-assessment-service'
import {
  persistCrossExamAssessment,
  scoreDebateParticipant,
} from '../assessment/cross-exam-scoring-service'

// -- Config -------------------------------------------------------------------

export type { DebateConfig } from './types'
import type { DebateConfig } from './types'

// -- In-Memory Session State --------------------------------------------------

interface DebateSessionState {
  topic: string
  sides: { name: string; participants: string[] }[]  // 2 sides, participants by userId
  currentPhase: 'TOPIC' | 'OPENING' | 'REBUTTAL' | 'CLOSING' | 'VOTE' | 'RESULTS'
  currentSpeakerIndex: number
  speakerOrder: string[]  // userId order (alternating sides)
  statements: Map<string, { opening: string; rebuttal: string; closing: string }>
  votes: Map<string, number>  // voterId -> sideIndex
  sandyFactChecks: string[]
  timerHandle: ReturnType<typeof setTimeout> | null
  participantNames: Map<string, string>  // userId -> name
}

const sessionState = new Map<string, DebateSessionState>()

function roundUnit(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000
}

// -- Fallback Topics ----------------------------------------------------------

const FALLBACK_TOPICS = [
  {
    topic: 'AI should be regulated like a public utility',
    side1: 'Pro-Regulation',
    side2: 'Pro-Innovation',
  },
  {
    topic: 'Remote work is better than in-office work for productivity',
    side1: 'Team Remote',
    side2: 'Team Office',
  },
  {
    topic: 'Social media does more harm than good for society',
    side1: 'Team Harm',
    side2: 'Team Benefit',
  },
  {
    topic: 'College degrees are still worth the investment',
    side1: 'Pro-Degree',
    side2: 'Pro-Alternative',
  },
]

// -- Start Debate -------------------------------------------------------------

export async function startDebate(roomId: string, hostId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: { include: { user: { select: { id: true, name: true } } } },
      course: { select: { id: true, title: true } },
    },
  })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })
  if (room.hostId !== hostId) throw Object.assign(new Error('Only the host can start'), { status: 403 })
  if (room.type !== 'DEBATE') throw Object.assign(new Error('Not a debate room'), { status: 400 })
  if (room.phase !== 'LOBBY') throw Object.assign(new Error('Room already started'), { status: 400 })
  if (room.participants.length < 2) throw Object.assign(new Error('Need at least 2 participants'), { status: 400 })

  const config = room.config as unknown as DebateConfig

  // Generate topic + assign sides
  const topicData = await generateDebateTopic(
    config.topic,
    room.course?.title ?? 'General',
  )

  // Split participants into 2 sides
  const shuffled = [...room.participants].sort(() => Math.random() - 0.5)
  const half = Math.ceil(shuffled.length / 2)
  const side1Participants = shuffled.slice(0, half).map((p) => p.userId)
  const side2Participants = shuffled.slice(half).map((p) => p.userId)

  const sides = [
    { name: topicData.side1, participants: side1Participants },
    { name: topicData.side2, participants: side2Participants },
  ]

  // Build alternating speaker order
  const speakerOrder: string[] = []
  const maxLen = Math.max(side1Participants.length, side2Participants.length)
  for (let i = 0; i < maxLen; i++) {
    if (i < side1Participants.length) speakerOrder.push(side1Participants[i]!)
    if (i < side2Participants.length) speakerOrder.push(side2Participants[i]!)
  }

  // Name lookup
  const participantNames = new Map<string, string>()
  for (const p of room.participants) {
    participantNames.set(p.userId, p.user.name)
  }

  // Initialize session state
  sessionState.set(roomId, {
    topic: topicData.topic,
    sides,
    currentPhase: 'TOPIC',
    currentSpeakerIndex: -1,
    speakerOrder,
    statements: new Map(),
    votes: new Map(),
    sandyFactChecks: [],
    timerHandle: null,
    participantNames,
  })

  // Initialize statement entries
  const state = sessionState.get(roomId)!
  for (const p of room.participants) {
    state.statements.set(p.userId, { opening: '', rebuttal: '', closing: '' })
  }

  // Update room phase
  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'COUNTDOWN', startedAt: new Date() },
  })

  // Broadcast topic reveal
  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'TOPIC' } })
  publishToRoom(roomId, {
    type: 'debate_topic',
    data: {
      topic: topicData.topic,
      sides: sides.map((s) => ({
        name: s.name,
        participants: s.participants.map((id) => ({
          userId: id,
          name: participantNames.get(id) ?? 'Unknown',
        })),
      })),
    },
  })

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: {
      message: `Welcome to the Debate! Today's topic: "${topicData.topic}". ${sides[0]!.name} vs ${sides[1]!.name}. Each speaker gets 90 seconds for opening statements, 60 seconds for rebuttals, and 60 seconds for closing arguments. Let's keep it civil and evidence-based!`,
    },
  })

  // After 8s topic reading, start opening statements
  setTimeout(() => {
    void advanceDebate(roomId, 'OPENING')
  }, 8000)
}

// -- Advance Debate Phase -----------------------------------------------------

async function advanceDebate(roomId: string, targetPhase: 'OPENING' | 'REBUTTAL' | 'CLOSING' | 'VOTE'): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  if (targetPhase === 'VOTE') {
    await startVoting(roomId)
    return
  }

  state.currentPhase = targetPhase
  state.currentSpeakerIndex = 0

  const dbPhase = targetPhase === 'OPENING' ? 'QUESTION' : 'QUESTION'
  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: dbPhase },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: targetPhase } })
  publishToRoom(roomId, {
    type: 'sandy_says',
    data: {
      message: targetPhase === 'OPENING'
        ? 'Opening statements! Each speaker has 90 seconds to present their position.'
        : targetPhase === 'REBUTTAL'
        ? 'Rebuttal round! Address the other side\'s arguments. 60 seconds each.'
        : 'Closing arguments! Make your final case. 60 seconds each.',
    },
  })

  await promptCurrentSpeaker(roomId)
}

// -- Prompt Current Speaker ---------------------------------------------------

async function promptCurrentSpeaker(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  if (state.currentSpeakerIndex >= state.speakerOrder.length) {
    // All speakers done for this phase, advance
    if (state.currentPhase === 'OPENING') {
      await advanceDebate(roomId, 'REBUTTAL')
    } else if (state.currentPhase === 'REBUTTAL') {
      await advanceDebate(roomId, 'CLOSING')
    } else if (state.currentPhase === 'CLOSING') {
      await advanceDebate(roomId, 'VOTE')
    }
    return
  }

  const speakerUserId = state.speakerOrder[state.currentSpeakerIndex]!
  const speakerName = state.participantNames.get(speakerUserId) ?? 'Unknown'
  const sideIndex = state.sides[0]!.participants.includes(speakerUserId) ? 0 : 1
  const sideName = state.sides[sideIndex]!.name

  const config = await getConfig(roomId)
  const timeMs = state.currentPhase === 'OPENING'
    ? (config?.openingTimeMs ?? 90000)
    : (config?.rebuttalTimeMs ?? 60000)

  publishToRoom(roomId, {
    type: 'speaker_turn',
    data: {
      speakerUserId,
      speakerName,
      sideName,
      sideIndex,
      phase: state.currentPhase,
      timeMs,
      speakerIndex: state.currentSpeakerIndex,
      totalSpeakers: state.speakerOrder.length,
    },
  })

  // Auto-advance after timeout
  if (state.timerHandle) clearTimeout(state.timerHandle)
  state.timerHandle = setTimeout(() => {
    void autoAdvanceSpeaker(roomId)
  }, timeMs)
}

// -- Auto Advance Speaker (timeout) -------------------------------------------

async function autoAdvanceSpeaker(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  const speakerUserId = state.speakerOrder[state.currentSpeakerIndex]
  if (speakerUserId) {
    const stmts = state.statements.get(speakerUserId)
    if (stmts) {
      const phase = state.currentPhase.toLowerCase() as 'opening' | 'rebuttal' | 'closing'
      if (!stmts[phase]) {
        stmts[phase] = '(No statement submitted in time)'
      }
    }
  }

  state.currentSpeakerIndex++
  await promptCurrentSpeaker(roomId)
}

// -- Submit Statement ---------------------------------------------------------

export async function submitStatement(
  roomId: string,
  userId: string,
  text: string,
  phase: 'opening' | 'rebuttal' | 'closing',
): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) throw Object.assign(new Error('Session not found'), { status: 404 })

  const currentSpeaker = state.speakerOrder[state.currentSpeakerIndex]
  if (currentSpeaker !== userId) throw Object.assign(new Error('Not your turn to speak'), { status: 403 })

  const expectedPhase = state.currentPhase.toLowerCase()
  if (expectedPhase !== phase) throw Object.assign(new Error(`Current phase is ${state.currentPhase}, not ${phase}`), { status: 400 })

  const stmts = state.statements.get(userId)
  if (!stmts) throw Object.assign(new Error('Not a participant'), { status: 403 })
  if (stmts[phase]) throw Object.assign(new Error('Already submitted for this phase'), { status: 400 })

  stmts[phase] = text
  const speakerName = state.participantNames.get(userId) ?? 'Unknown'
  const sideIndex = state.sides[0]!.participants.includes(userId) ? 0 : 1

  // Broadcast the statement
  publishToRoom(roomId, {
    type: 'statement_submitted',
    data: {
      speakerUserId: userId,
      speakerName,
      sideIndex,
      phase,
      text,
    },
  })

  // Fact-check in background
  void generateFactCheck(roomId, state.topic, speakerName, phase, text)

  // Clear timer and advance to next speaker
  if (state.timerHandle) {
    clearTimeout(state.timerHandle)
    state.timerHandle = null
  }

  // Brief pause to let people read, then advance
  setTimeout(() => {
    state.currentSpeakerIndex++
    void promptCurrentSpeaker(roomId)
  }, 3000)
}

// -- Start Voting -------------------------------------------------------------

async function startVoting(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  state.currentPhase = 'VOTE'

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'REVEAL' },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'VOTE' } })
  publishToRoom(roomId, {
    type: 'voting_open',
    data: {
      sides: state.sides.map((s) => ({
        name: s.name,
        participants: s.participants.map((id) => ({
          userId: id,
          name: state.participantNames.get(id) ?? 'Unknown',
        })),
      })),
      timeMs: 30000,
    },
  })

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: { message: 'Time to vote! Choose the side you found most persuasive. You cannot vote for your own side. 30 seconds!' },
  })

  // Auto-close voting after 30s
  if (state.timerHandle) clearTimeout(state.timerHandle)
  state.timerHandle = setTimeout(() => {
    void completeDebate(roomId)
  }, 30000)
}

// -- Cast Vote ----------------------------------------------------------------

export async function castVote(roomId: string, userId: string, sideIndex: number): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) throw Object.assign(new Error('Session not found'), { status: 404 })
  if (state.currentPhase !== 'VOTE') throw Object.assign(new Error('Voting is not open'), { status: 400 })

  // Check participant is not voting for own side
  const voterSideIndex = state.sides[0]!.participants.includes(userId) ? 0 : 1
  if (!state.sides[0]!.participants.includes(userId) && !state.sides[1]!.participants.includes(userId)) {
    throw Object.assign(new Error('Not a participant'), { status: 403 })
  }
  if (sideIndex === voterSideIndex) throw Object.assign(new Error('Cannot vote for your own side'), { status: 400 })
  if (sideIndex < 0 || sideIndex > 1) throw Object.assign(new Error('Invalid side index'), { status: 400 })

  state.votes.set(userId, sideIndex)

  const voteCount = state.votes.size
  const totalParticipants = state.sides[0]!.participants.length + state.sides[1]!.participants.length

  publishToRoom(roomId, {
    type: 'vote_cast',
    data: { voteCount, totalParticipants },
  })

  // If all voted, end early
  if (voteCount >= totalParticipants) {
    if (state.timerHandle) {
      clearTimeout(state.timerHandle)
      state.timerHandle = null
    }
    setTimeout(() => {
      void completeDebate(roomId)
    }, 2000)
  }
}

// -- Complete Debate ----------------------------------------------------------

async function completeDebate(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  state.currentPhase = 'RESULTS'

  // Tally votes
  const voteTally = [0, 0]
  for (const sideIdx of state.votes.values()) {
    voteTally[sideIdx]!++
  }

  // Generate Sandy's analysis
  const analysis = await generateDebateAnalysis(roomId, state)

  const roomMeta = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    select: { assessmentMode: true },
  })
  const config = (await getConfig(roomId)) as (DebateConfig & {
    aiWeight?: number
    peerWeight?: number
    selfWeight?: number
  }) | null
  const crossExamWeights = {
    ai: typeof config?.aiWeight === 'number' ? config.aiWeight : 0.4,
    peer: typeof config?.peerWeight === 'number' ? config.peerWeight : 0.4,
    self: typeof config?.selfWeight === 'number' ? config.selfWeight : 0.2,
  }

  const assessmentResults = await Promise.all(
    [...state.participantNames.entries()].map(async ([userId, name]) => {
      const sideIndex = state.sides[0]!.participants.includes(userId) ? 0 : 1
      const sideName = state.sides[sideIndex]!.name
      const statements = state.statements.get(userId) ?? {
        opening: '',
        rebuttal: '',
        closing: '',
      }

      const aiResult = await scoreDebateParticipant({
        userId,
        name,
        topic: state.topic,
        sideName,
        opening: statements.opening,
        rebuttal: statements.rebuttal,
        closing: statements.closing,
      })

      const peerRatings = [...state.votes.entries()]
        .filter(([voterId]) => {
          const voterSideIndex = state.sides[0]!.participants.includes(voterId) ? 0 : 1
          return voterId !== userId && voterSideIndex !== sideIndex
        })
        .map(([, votedSideIndex]) => (votedSideIndex === sideIndex ? 1 : 0))

      aiResult.peer = {
        ratings: peerRatings,
        average:
          peerRatings.length > 0
            ? roundUnit(
                peerRatings.reduce<number>((sum, rating) => sum + rating, 0) /
                  peerRatings.length
              )
            : 0,
      }

      return aiResult
    })
  )

  if (roomMeta?.assessmentMode) {
    await setRoomAssessmentResults(roomId, {
      roomType: 'DEBATE',
      weights: crossExamWeights,
      participants: assessmentResults,
    })
    await persistCrossExamAssessment(roomId)

    await Promise.all(
      assessmentResults.map((result) =>
        prisma.liveRoomParticipant.updateMany({
          where: { roomId, userId: result.userId },
          data: {
            score: Math.round(
              (result.ai.overall * crossExamWeights.ai +
                result.peer.average * crossExamWeights.peer) *
                100
            ),
          },
        })
      )
    )
  }

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'SCOREBOARD' },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'RESULTS' } })
  publishToRoom(roomId, {
    type: 'debate_results',
    data: {
      topic: state.topic,
      sides: state.sides.map((s, i) => ({
        name: s.name,
        voteCount: voteTally[i],
        participants: s.participants.map((id) => ({
          userId: id,
          name: state.participantNames.get(id) ?? 'Unknown',
        })),
      })),
      totalVotes: voteTally[0]! + voteTally[1]!,
      winner: voteTally[0]! > voteTally[1]! ? 0 : voteTally[1]! > voteTally[0]! ? 1 : -1,
      analysis,
      factChecks: state.sandyFactChecks,
    },
  })

  const winnerName = voteTally[0]! > voteTally[1]!
    ? state.sides[0]!.name
    : voteTally[1]! > voteTally[0]!
    ? state.sides[1]!.name
    : null

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: {
      message: winnerName
        ? `The votes are in! ${winnerName} wins with ${Math.max(voteTally[0]!, voteTally[1]!)} votes. Great debate, everyone!`
        : `It's a tie! Both sides made compelling arguments. That's the sign of a truly balanced debate.`,
    },
  })

  // Auto-complete after viewing results
  setTimeout(() => {
    void finalizeDebate(roomId)
  }, 15000)
}

// -- Finalize Debate ----------------------------------------------------------

async function finalizeDebate(roomId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: { include: { user: { select: { name: true } } } },
      channel: true,
    },
  })
  if (!room || room.phase === 'COMPLETE') return

  const config = room.config as unknown as DebateConfig
  const state = sessionState.get(roomId)

  if (room.assessmentMode) {
    await persistCrossExamAssessment(roomId)
  }

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'COMPLETE', endedAt: new Date() },
  })

  const participantNames = room.participants.map((p) => p.user.name)

  // Tally votes for summary
  let side1Votes = 0
  let side2Votes = 0
  if (state) {
    for (const sideIdx of state.votes.values()) {
      if (sideIdx === 0) side1Votes++
      else side2Votes++
    }
  }

  await prisma.channelMessage.create({
    data: {
      channelId: room.channelId,
      authorId: room.hostId,
      content: `Debate Complete -- "${config.topic}"\n\n${participantNames.length} participants debated across opening statements, rebuttals, and closing arguments.\n\n${state ? `${state.sides[0]!.name}: ${side1Votes} votes | ${state.sides[1]!.name}: ${side2Votes} votes` : ''}\n\nParticipants: ${participantNames.join(', ')}`,
      messageType: 'system',
      isSandy: true,
    },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'COMPLETE' } })
  publishToRoom(roomId, {
    type: 'complete',
    data: { participants: participantNames },
  })

  // Cleanup
  if (state?.timerHandle) clearTimeout(state.timerHandle)
  sessionState.delete(roomId)
}

// -- End Debate (host early termination) --------------------------------------

export async function endDebate(roomId: string, userId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({ where: { id: roomId } })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })
  if (room.hostId !== userId) throw Object.assign(new Error('Only the host can end'), { status: 403 })
  if (room.phase === 'COMPLETE') return

  const state = sessionState.get(roomId)
  if (state?.timerHandle) clearTimeout(state.timerHandle)

  await finalizeDebate(roomId)
}

// -- AI: Generate Debate Topic ------------------------------------------------

async function generateDebateTopic(
  topic: string,
  courseName: string,
): Promise<{ topic: string; side1: string; side2: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    const fallback = FALLBACK_TOPICS[Math.floor(Math.random() * FALLBACK_TOPICS.length)]!
    return { topic: topic || fallback.topic, side1: fallback.side1, side2: fallback.side2 }
  }

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `You are Sandy, an AI debate moderator at the University of Kentucky. Generate a provocative but educational debate topic with two named sides.

Course context: ${courseName}

Return ONLY valid JSON: {"topic": "the debate proposition", "side1": "Short Side 1 Name", "side2": "Short Side 2 Name"}

Make the topic debatable with strong arguments on both sides. Side names should be 2-3 words max.`,
      messages: [{ role: 'user', content: `Generate a debate topic related to: "${topic}"` }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const parsed = JSON.parse(text) as { topic: string; side1: string; side2: string }
    if (parsed.topic && parsed.side1 && parsed.side2) return parsed

    const fallback = FALLBACK_TOPICS[0]!
    return { topic: topic || fallback.topic, side1: fallback.side1, side2: fallback.side2 }
  } catch (err) {
    console.error('[DebateEngine] Topic generation failed:', err)
    const fallback = FALLBACK_TOPICS[0]!
    return { topic: topic || fallback.topic, side1: fallback.side1, side2: fallback.side2 }
  }
}

// -- AI: Fact-Check Statement -------------------------------------------------

async function generateFactCheck(
  roomId: string,
  topic: string,
  speakerName: string,
  phase: string,
  statement: string,
): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  if (!process.env.ANTHROPIC_API_KEY) {
    const check = `${speakerName}'s ${phase}: Sandy notes this is an interesting perspective. Keep the evidence coming!`
    state.sandyFactChecks.push(check)
    publishToRoom(roomId, {
      type: 'fact_check',
      data: { speakerName, phase, commentary: check },
    })
    return
  }

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: `You are Sandy, a debate moderator. Provide a brief fact-check or analytical commentary on a debate statement. Be neutral and educational. 1-2 sentences max. Note any strong logic, questionable claims, or missing evidence. Do NOT pick sides.`,
      messages: [{
        role: 'user',
        content: `Debate topic: "${topic}"\nSpeaker: ${speakerName} (${phase} statement)\nStatement: "${statement.substring(0, 500)}"`,
      }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const commentary = text.trim() || `${speakerName} presents an interesting argument.`
    state.sandyFactChecks.push(`${speakerName} (${phase}): ${commentary}`)

    publishToRoom(roomId, {
      type: 'fact_check',
      data: { speakerName, phase, commentary },
    })
  } catch (err) {
    console.error('[DebateEngine] Fact-check failed:', err)
  }
}

// -- AI: Debate Analysis ------------------------------------------------------

async function generateDebateAnalysis(
  roomId: string,
  state: DebateSessionState,
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return `Both sides presented their arguments on "${state.topic}". Each team showed strong reasoning and engagement. The real winner is everyone who practiced critical thinking and persuasive communication today.`
  }

  try {
    const statementsText = state.speakerOrder.map((userId) => {
      const name = state.participantNames.get(userId) ?? 'Unknown'
      const sideIdx = state.sides[0]!.participants.includes(userId) ? 0 : 1
      const sideName = state.sides[sideIdx]!.name
      const stmts = state.statements.get(userId)
      return `${name} (${sideName}):\n  Opening: ${(stmts?.opening ?? '(none)').substring(0, 200)}\n  Rebuttal: ${(stmts?.rebuttal ?? '(none)').substring(0, 200)}\n  Closing: ${(stmts?.closing ?? '(none)').substring(0, 200)}`
    }).join('\n\n')

    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: `You are Sandy, analyzing a completed debate. Provide a 2-3 paragraph analysis covering:
1. Strongest arguments from each side
2. Scoring commentary on logic, evidence, and persuasion
3. What both sides could improve

Be encouraging but substantive. Do NOT declare a winner -- let the votes speak.

Topic: "${state.topic}"
${state.sides[0]!.name} vs ${state.sides[1]!.name}

Return ONLY the analysis text.`,
      messages: [{
        role: 'user',
        content: `Analyze this debate:\n\n${statementsText}`,
      }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    if (text.trim().length < 30) {
      return `Both sides made compelling arguments on "${state.topic}". The debate showcased strong critical thinking and communication skills from all participants.`
    }

    return text.trim()
  } catch (err) {
    console.error('[DebateEngine] Analysis generation failed:', err)
    return `Both sides presented strong arguments on "${state.topic}". Everyone demonstrated excellent critical thinking and persuasive skills. The real winner is the learning that happened today.`
  }
}

// -- Helpers ------------------------------------------------------------------

async function getConfig(roomId: string): Promise<DebateConfig | null> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    select: { config: true },
  })
  return room?.config as unknown as DebateConfig | null
}
