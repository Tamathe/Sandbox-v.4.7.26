/**
 * Teach-Back Engine — Peer teaching circles where everyone teaches and rates.
 *
 * Flow: Each participant is assigned a concept. They "teach" it (text explanation).
 * Other participants rate clarity (1-5 stars). Sandy evaluates accuracy.
 * Pedagogically powerful: teaching is the best way to learn.
 *
 * Lifecycle: LOBBY → ASSIGN → TEACH (per person) → RATE → RESULTS → COMPLETE
 * Reuses LiveRoom phases: LOBBY, COUNTDOWN=ASSIGN, QUESTION=TEACH, REVEAL=RATE,
 *   SCOREBOARD=RESULTS, COMPLETE
 */

import { prisma } from '../prisma'
import { publishToRoom } from '../sandcastle/room-bus'
import Anthropic from '@anthropic-ai/sdk'
import { setRoomAssessmentResults } from '../assessment/commons-assessment-service'
import {
  persistTeachbackAssessment,
  scoreTeachbackExplanation,
} from '../assessment/teachback-assessment-service'

export type { TeachBackConfig } from './types'
import type { TeachBackConfig } from './types'

interface ConceptAssignment {
  participantId: string
  userId: string
  name: string
  concept: string
}

// In-memory state for active teach-back sessions
const sessionState = new Map<string, {
  assignments: ConceptAssignment[]
  currentTeacherIndex: number
  teachings: Map<string, string>      // participantId → teaching text
  ratings: Map<string, Map<string, number>>  // teacherParticipantId → { raterUserId → score }
  aiScores: Map<string, { score: number; feedback: string }>
}>()

// ── Start Teach-Back ──────────────────────────────────────────────────────────

export async function startTeachBack(roomId: string, hostId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: { include: { user: { select: { id: true, name: true } } } },
      course: { select: { title: true } },
    },
  })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })
  if (room.hostId !== hostId) throw Object.assign(new Error('Only the host can start'), { status: 403 })
  if (room.type !== 'TEACHBACK') throw Object.assign(new Error('Not a teach-back room'), { status: 400 })
  if (room.participants.length < 2) throw Object.assign(new Error('Need at least 2 participants'), { status: 400 })

  const config = room.config as unknown as TeachBackConfig

  // Generate or use pre-set concepts
  let concepts = config.concepts ?? []
  if (concepts.length < room.participants.length) {
    concepts = await generateConcepts(config.topic, room.participants.length)
  }

  // Assign concepts to participants
  const assignments: ConceptAssignment[] = room.participants.map((p, i) => ({
    participantId: p.id,
    userId: p.userId,
    name: p.user.name,
    concept: concepts[i % concepts.length]!,
  }))

  // Store session state
  sessionState.set(roomId, {
    assignments,
    currentTeacherIndex: -1,
    teachings: new Map(),
    ratings: new Map(),
    aiScores: new Map(),
  })

  // Transition to ASSIGN phase
  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'COUNTDOWN', startedAt: new Date() },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'ASSIGN' } })
  publishToRoom(roomId, {
    type: 'concepts_assigned',
    data: {
      assignments: assignments.map((a) => ({
        userId: a.userId,
        name: a.name,
        concept: a.concept,
      })),
    },
  })

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: {
      message: `Teach-Back time! Each of you has a concept to explain. You'll have 2 minutes to teach it, then everyone rates clarity. Teaching is the deepest form of learning — let's go!`,
    },
  })

  // After 10 seconds of review, start first teacher
  setTimeout(() => {
    void advanceToNextTeacher(roomId)
  }, 10000)
}

// ── Teaching Turns ────────────────────────────────────────────────────────────

async function advanceToNextTeacher(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  state.currentTeacherIndex++

  if (state.currentTeacherIndex >= state.assignments.length) {
    // All done teaching — show results
    await showResults(roomId)
    return
  }

  const teacher = state.assignments[state.currentTeacherIndex]!

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'QUESTION', currentRound: state.currentTeacherIndex + 1 },
  })

  const config = (await prisma.liveRoom.findUnique({ where: { id: roomId }, select: { config: true } }))?.config as unknown as TeachBackConfig
  const teachTimeMs = config?.teachTimeMs ?? 120000

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'TEACH' } })
  publishToRoom(roomId, {
    type: 'teach_turn',
    data: {
      teacherUserId: teacher.userId,
      teacherName: teacher.name,
      concept: teacher.concept,
      teachTimeMs,
      turnNumber: state.currentTeacherIndex + 1,
      totalTurns: state.assignments.length,
    },
  })

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: { message: `${teacher.name}, you're up! Explain "${teacher.concept}" in your own words. Everyone else — listen and get ready to rate.` },
  })

  // Auto-transition to rating after teach time
  setTimeout(() => {
    void transitionToRating(roomId)
  }, teachTimeMs)
}

// ── Submit Teaching ───────────────────────────────────────────────────────────

export async function submitTeaching(roomId: string, userId: string, explanation: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) throw Object.assign(new Error('Session not found'), { status: 404 })

  const teacher = state.assignments[state.currentTeacherIndex]
  if (!teacher || teacher.userId !== userId) throw Object.assign(new Error('Not your turn'), { status: 403 })

  const participant = await prisma.liveRoomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
  })
  if (!participant) throw Object.assign(new Error('Not a participant'), { status: 403 })

  state.teachings.set(participant.id, explanation)

  publishToRoom(roomId, {
    type: 'teaching_submitted',
    data: {
      teacherUserId: userId,
      teacherName: teacher.name,
      explanation,
    },
  })
}

// ── Rating Phase ──────────────────────────────────────────────────────────────

async function transitionToRating(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  const teacher = state.assignments[state.currentTeacherIndex]
  if (!teacher) return

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'REVEAL' },
  })

  const config = (await prisma.liveRoom.findUnique({ where: { id: roomId }, select: { config: true } }))?.config as unknown as TeachBackConfig
  const rateTimeMs = config?.rateTimeMs ?? 30000

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'RATE' } })
  publishToRoom(roomId, {
    type: 'rate_turn',
    data: {
      teacherUserId: teacher.userId,
      teacherName: teacher.name,
      concept: teacher.concept,
      rateTimeMs,
    },
  })

  // Get AI evaluation of the teaching
  const participant = await prisma.liveRoomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId: teacher.userId } },
  })
  if (participant) {
    const teaching = state.teachings.get(participant.id)
    if (teaching) {
      void evaluateTeaching(roomId, participant.id, teacher.concept, teaching)
    }
  }

  // After rating time, advance
  setTimeout(() => {
    void advanceToNextTeacher(roomId)
  }, rateTimeMs)
}

// ── Submit Rating ─────────────────────────────────────────────────────────────

export async function submitRating(
  roomId: string,
  raterId: string,
  score: number,
): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) throw Object.assign(new Error('Session not found'), { status: 404 })

  const teacher = state.assignments[state.currentTeacherIndex]
  if (!teacher) throw Object.assign(new Error('No active teacher'), { status: 400 })

  const participant = await prisma.liveRoomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId: teacher.userId } },
  })
  if (!participant) return

  if (!state.ratings.has(participant.id)) {
    state.ratings.set(participant.id, new Map())
  }
  state.ratings.get(participant.id)!.set(raterId, Math.min(5, Math.max(1, score)))

  publishToRoom(roomId, {
    type: 'rating_received',
    data: { teacherUserId: teacher.userId, raterCount: state.ratings.get(participant.id)!.size },
  })
}

// ── AI Evaluation ─────────────────────────────────────────────────────────────

async function evaluateTeaching(
  roomId: string,
  participantId: string,
  concept: string,
  explanation: string,
): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    const state = sessionState.get(roomId)
    if (state) {
      state.aiScores.set(participantId, {
        score: 4,
        feedback: 'Good explanation! Sandy AI evaluation unavailable for detailed feedback.',
      })
    }
    return
  }

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: 'You are a teaching evaluator. Rate the student\'s explanation of a concept. Return JSON: {"score": 1-5, "feedback": "1-2 sentence feedback"}. Score 5 = perfectly accurate and clear. Score 1 = major misconceptions. Be encouraging but honest.',
      messages: [{
        role: 'user',
        content: `Concept to explain: "${concept}"\n\nStudent's explanation: "${explanation}"`,
      }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const parsed = JSON.parse(text) as { score: number; feedback: string }
    const state = sessionState.get(roomId)
    if (state) {
      state.aiScores.set(participantId, parsed)
    }
  } catch {
    const state = sessionState.get(roomId)
    if (state) {
      state.aiScores.set(participantId, { score: 3, feedback: 'Keep practicing — teaching gets easier every time.' })
    }
  }
}

// ── Results ───────────────────────────────────────────────────────────────────

async function showResults(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    select: {
      assessmentMode: true,
      title: true,
      course: { select: { title: true } },
      config: true,
    },
  })

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'SCOREBOARD' },
  })

  // Calculate scores
  const results = state.assignments.map((a) => {
    const participant = state.assignments.find((x) => x.userId === a.userId)
    const participantId = a.participantId
    const peerRatings = state.ratings.get(participantId)
    const peerAvg = peerRatings && peerRatings.size > 0
      ? [...peerRatings.values()].reduce((s, v) => s + v, 0) / peerRatings.size
      : 0
    const aiResult = state.aiScores.get(participantId)
    const aiScore = aiResult?.score ?? 0
    const combined = peerAvg > 0 && aiScore > 0 ? (peerAvg + aiScore) / 2 : peerAvg || aiScore

    return {
      userId: a.userId,
      name: a.name,
      concept: a.concept,
      peerScore: Math.round(peerAvg * 10) / 10,
      aiScore,
      aiFeedback: aiResult?.feedback ?? '',
      combinedScore: Math.round(combined * 10) / 10,
      teaching: state.teachings.get(participantId) ?? '',
    }
  })

  if (room?.assessmentMode) {
    const config = (room.config as (TeachBackConfig & {
      commonMisconceptions?: string[]
      misconceptionsByConcept?: Record<string, string[]>
    }) | null) ?? null

    const assessmentResults = await Promise.all(
      state.assignments.map(async (assignment) => {
        const conceptSpecificMisconceptions =
          config?.misconceptionsByConcept &&
          typeof config.misconceptionsByConcept === 'object' &&
          Array.isArray(config.misconceptionsByConcept[assignment.concept])
            ? config.misconceptionsByConcept[assignment.concept]
            : []

        return scoreTeachbackExplanation({
          userId: assignment.userId,
          name: assignment.name,
          concept: assignment.concept,
          explanation: state.teachings.get(assignment.participantId) ?? '',
          courseTitle: room.course?.title ?? room.title,
          commonMisconceptions: Array.isArray(config?.commonMisconceptions)
            ? config.commonMisconceptions
            : conceptSpecificMisconceptions,
        })
      })
    )

    await setRoomAssessmentResults(roomId, {
      participants: assessmentResults,
    })
    await persistTeachbackAssessment(roomId)

    for (const result of assessmentResults) {
      await prisma.liveRoomParticipant.updateMany({
        where: { roomId, userId: result.userId },
        data: {
          score: Math.round((result.composite / 5) * 100),
        },
      })
    }

    publishToRoom(roomId, {
      type: 'teachback_assessment_scored',
      data: {
        participants: assessmentResults.map((result) => ({
          userId: result.userId,
          name: result.name,
          concept: result.concept,
          clarity: result.clarity,
          depth: result.depth,
          engagement: result.engagement,
          accuracy: result.accuracy,
          composite: result.composite,
        })),
      },
    })
  }

  // Update participant scores
  for (const r of results) {
    await prisma.liveRoomParticipant.update({
      where: { roomId_userId: { roomId, userId: r.userId } },
      data: { score: Math.round(r.combinedScore * 100) },
    })
  }

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'RESULTS' } })
  publishToRoom(roomId, {
    type: 'teachback_results',
    data: { results },
  })

  const bestTeacher = results.sort((a, b) => b.combinedScore - a.combinedScore)[0]
  if (bestTeacher) {
    publishToRoom(roomId, {
      type: 'sandy_says',
      data: {
        message: `${bestTeacher.name} had the clearest explanation with a ${bestTeacher.combinedScore}/5 on "${bestTeacher.concept}". Everyone taught well — remember, if you can teach it, you know it!`,
      },
    })
  }

  // Complete after showing results
  setTimeout(() => {
    void completeTeachBack(roomId)
  }, 10000)
}

async function completeTeachBack(roomId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: {
        include: { user: { select: { name: true } } },
        orderBy: { score: 'desc' },
      },
      channel: true,
    },
  })
  if (!room || room.phase === 'COMPLETE') return

  const config = room.config as unknown as TeachBackConfig
  const state = sessionState.get(roomId)

  if (room.assessmentMode) {
    await persistTeachbackAssessment(roomId)
  }

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'COMPLETE', endedAt: new Date() },
  })

  const names = room.participants.map((p) => p.user.name)
  publishToRoom(roomId, { type: 'complete', data: { participants: names } })

  // Post summary to chat
  const resultLines = room.participants
    .map((p, i) => `${i + 1}. ${p.user.name} — ${(p.score / 100).toFixed(1)}/5`)
    .join('\n')

  await prisma.channelMessage.create({
    data: {
      channelId: room.channelId,
      authorId: room.hostId,
      content: `🎓 Teach-Back Complete — "${config.topic}"\n\n${resultLines}\n\n"If you can teach it, you know it." Great session, everyone!`,
      messageType: 'system',
      isSandy: true,
    },
  })

  // Cleanup
  sessionState.delete(roomId)
}

export async function endTeachBack(roomId: string, userId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({ where: { id: roomId } })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })
  if (room.hostId !== userId) throw Object.assign(new Error('Only the host can end'), { status: 403 })
  await completeTeachBack(roomId)
}

// ── Concept Generation ────────────────────────────────────────────────────────

async function generateConcepts(topic: string, count: number): Promise<string[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Array.from({ length: count }, (_, i) => `${topic} — Concept ${i + 1}`)
  }

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `Generate exactly ${count} distinct, teachable sub-concepts for a topic. Each should be explainable in 1-2 minutes. Return ONLY a JSON array of strings. No markdown.`,
      messages: [{ role: 'user', content: `Topic: "${topic}". Generate ${count} distinct teachable concepts.` }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const parsed = JSON.parse(text) as string[]
    if (Array.isArray(parsed) && parsed.length >= count) return parsed.slice(0, count)
    return Array.from({ length: count }, (_, i) => `${topic} — Concept ${i + 1}`)
  } catch {
    return Array.from({ length: count }, (_, i) => `${topic} — Concept ${i + 1}`)
  }
}
