/**
 * Fishbowl Engine — Inner-circle / outer-circle discussion format.
 *
 * Sandy assigns an inner circle (first 3-4) and outer circle (rest).
 * Inner circle discusses Sandy's prompt. Outer circle submits annotations.
 * "Tag in" lets an outer member swap into the inner circle.
 * Sandy manages 2-3 rotation rounds and provides a final synthesis.
 *
 * Lifecycle: LOBBY -> ASSIGN (COUNTDOWN) -> DISCUSS (QUESTION) ->
 *   ANNOTATE/TAG_IN -> ROTATE -> ... -> SYNTHESIS (SCOREBOARD) -> COMPLETE
 * Reuses LiveRoom phases: LOBBY, COUNTDOWN=ASSIGN, QUESTION=DISCUSS,
 *   REVEAL=ROTATE, SCOREBOARD=SYNTHESIS, COMPLETE
 */

import { prisma } from '../prisma'
import { publishToRoom } from '../sandcastle/room-bus'
import Anthropic from '@anthropic-ai/sdk'
import { setRoomAssessmentResults } from '../assessment/commons-assessment-service'
import {
  buildFishbowlParticipantResult,
  persistCrossExamAssessment,
} from '../assessment/cross-exam-scoring-service'

// -- Config -------------------------------------------------------------------

export type { FishbowlConfig } from './types'
import type { FishbowlConfig } from './types'

// -- In-Memory Session State --------------------------------------------------

interface FishbowlSessionState {
  topic: string
  innerCircle: string[] // userIds
  outerCircle: string[] // userIds
  annotations: Array<{ authorId: string; authorName: string; text: string; timestamp: number }>
  annotationsByUser: Map<string, string[]>
  tagInQueue: string[] // userIds requesting to tag in
  discussionRound: number
  totalRounds: number
  prompts: string[] // one prompt per round
  participantNames: Map<string, string> // userId -> name
  roundsInInnerCircle: Map<string, number>
  timerHandle: ReturnType<typeof setTimeout> | null
}

const sessionState = new Map<string, FishbowlSessionState>()

// -- Fallback Templates -------------------------------------------------------

function fallbackPrompts(topic: string, count: number): string[] {
  const prompts = [
    `What are the most important aspects of "${topic}" that people often overlook? Discuss your perspectives and challenge each other's assumptions.`,
    `How does "${topic}" affect different groups differently? Consider multiple stakeholder perspectives and debate the tradeoffs.`,
    `Looking ahead 5-10 years, how will "${topic}" evolve? What should we be preparing for now? Push each other to think beyond the obvious.`,
  ]
  return prompts.slice(0, count)
}

function fallbackSynthesis(topic: string, annotationCount: number, rounds: number): string {
  return `Fishbowl Synthesis -- "${topic}"\n\nOver ${rounds} rounds of discussion, the inner circle explored multiple dimensions of the topic while the outer circle contributed ${annotationCount} annotations adding context and alternative viewpoints. The rotation between inner and outer circles ensured diverse voices were heard. Key themes included the complexity of the issue, the importance of multiple perspectives, and the value of structured dialogue.`
}

// -- Start Fishbowl -----------------------------------------------------------

export async function startFishbowl(roomId: string, hostId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: { include: { user: { select: { id: true, name: true } } } },
      course: { select: { id: true, title: true } },
    },
  })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })
  if (room.hostId !== hostId) throw Object.assign(new Error('Only the host can start'), { status: 403 })
  if (room.type !== 'FISHBOWL') throw Object.assign(new Error('Not a fishbowl room'), { status: 400 })
  if (room.phase !== 'LOBBY') throw Object.assign(new Error('Room already started'), { status: 400 })
  if (room.participants.length < 3) throw Object.assign(new Error('Need at least 3 participants'), { status: 400 })

  const config = room.config as unknown as FishbowlConfig
  const innerSize = Math.min(config.innerCircleSize ?? 3, Math.floor(room.participants.length / 2) + 1)
  const totalRounds = Math.min(3, Math.ceil(room.participants.length / innerSize))

  // Build name map
  const participantNames = new Map<string, string>()
  for (const p of room.participants) {
    participantNames.set(p.userId, p.user.name)
  }

  // Shuffle and assign circles
  const shuffled = [...room.participants].sort(() => Math.random() - 0.5)
  const innerCircle = shuffled.slice(0, innerSize).map((p) => p.userId)
  const outerCircle = shuffled.slice(innerSize).map((p) => p.userId)

  // Generate discussion prompts
  const prompts = await generateDiscussionPrompts(config.topic, totalRounds, room.course?.title ?? 'General')

  // Initialize state
  sessionState.set(roomId, {
    topic: config.topic,
    innerCircle,
    outerCircle,
    annotations: [],
    annotationsByUser: new Map(),
    tagInQueue: [],
    discussionRound: 0,
    totalRounds,
    prompts,
    participantNames,
    roundsInInnerCircle: new Map(),
    timerHandle: null,
  })

  // Phase -> COUNTDOWN (ASSIGN)
  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'COUNTDOWN', startedAt: new Date() },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'ASSIGN' } })
  publishToRoom(roomId, {
    type: 'fishbowl_assigned',
    data: {
      innerCircle: innerCircle.map((id) => ({ userId: id, name: participantNames.get(id) ?? 'Unknown' })),
      outerCircle: outerCircle.map((id) => ({ userId: id, name: participantNames.get(id) ?? 'Unknown' })),
      totalRounds,
    },
  })

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: {
      message: `Welcome to the Fishbowl! ${innerCircle.map((id) => participantNames.get(id)).join(', ')} -- you're in the inner circle. Everyone else observes and annotates. Outer circle members can request to "tag in" and swap with an inner circle member. ${totalRounds} rounds, let's go!`,
    },
  })

  // After 5s, start first discussion round
  setTimeout(() => {
    void advanceDiscussionRound(roomId)
  }, 5000)
}

// -- Advance Discussion Round -------------------------------------------------

async function advanceDiscussionRound(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  state.discussionRound++

  if (state.discussionRound > state.totalRounds) {
    await synthesisPhase(roomId)
    return
  }

  const prompt = state.prompts[state.discussionRound - 1] ?? `Continue discussing "${state.topic}" from a new angle.`

  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    select: { config: true },
  })
  const config = room?.config as unknown as FishbowlConfig
  const discussTimeMs = config?.discussTimeMs ?? 300000

  for (const userId of state.innerCircle) {
    state.roundsInInnerCircle.set(
      userId,
      (state.roundsInInnerCircle.get(userId) ?? 0) + 1
    )
  }

  // Phase -> QUESTION (DISCUSS)
  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'QUESTION', currentRound: state.discussionRound },
  })

  // Clear tag-in queue for new round
  state.tagInQueue = []

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'DISCUSS' } })
  publishToRoom(roomId, {
    type: 'discussion_round',
    data: {
      round: state.discussionRound,
      totalRounds: state.totalRounds,
      prompt,
      discussTimeMs,
      innerCircle: state.innerCircle.map((id) => ({ userId: id, name: state.participantNames.get(id) ?? 'Unknown' })),
      outerCircle: state.outerCircle.map((id) => ({ userId: id, name: state.participantNames.get(id) ?? 'Unknown' })),
    },
  })

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: {
      message: `Round ${state.discussionRound} of ${state.totalRounds} -- Inner circle, discuss: "${prompt}" -- Outer circle, submit your annotations and observations!`,
    },
  })

  // Timer for round end
  if (state.timerHandle) clearTimeout(state.timerHandle)
  state.timerHandle = setTimeout(() => {
    void endDiscussionRound(roomId)
  }, discussTimeMs)
}

// -- Submit Annotation --------------------------------------------------------

export async function submitAnnotation(roomId: string, userId: string, text: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) throw Object.assign(new Error('Session not found'), { status: 404 })

  // Only outer circle can annotate
  if (!state.outerCircle.includes(userId)) {
    throw Object.assign(new Error('Only outer circle members can annotate'), { status: 403 })
  }

  const annotation = {
    authorId: userId,
    authorName: state.participantNames.get(userId) ?? 'Unknown',
    text,
    timestamp: Date.now(),
  }
  state.annotations.push(annotation)
  if (!state.annotationsByUser.has(userId)) {
    state.annotationsByUser.set(userId, [])
  }
  state.annotationsByUser.get(userId)!.push(text)

  publishToRoom(roomId, {
    type: 'annotation_added',
    data: annotation,
  })
}

// -- Request Tag In -----------------------------------------------------------

export async function requestTagIn(roomId: string, userId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) throw Object.assign(new Error('Session not found'), { status: 404 })

  if (!state.outerCircle.includes(userId)) {
    throw Object.assign(new Error('Only outer circle members can tag in'), { status: 403 })
  }

  if (state.tagInQueue.includes(userId)) {
    throw Object.assign(new Error('Already in the tag-in queue'), { status: 400 })
  }

  state.tagInQueue.push(userId)

  publishToRoom(roomId, {
    type: 'tag_in_requested',
    data: {
      userId,
      name: state.participantNames.get(userId) ?? 'Unknown',
      queueLength: state.tagInQueue.length,
    },
  })

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: {
      message: `${state.participantNames.get(userId) ?? 'Someone'} wants to tag in! They'll swap in at the next rotation.`,
    },
  })
}

// -- End Discussion Round / Rotate --------------------------------------------

async function endDiscussionRound(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  if (state.discussionRound >= state.totalRounds) {
    await synthesisPhase(roomId)
    return
  }

  // Phase -> REVEAL (ROTATE)
  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'REVEAL' },
  })

  // Process tag-in swaps
  const swaps: Array<{ taggedIn: string; taggedOut: string }> = []
  while (state.tagInQueue.length > 0 && state.innerCircle.length > 0) {
    const incoming = state.tagInQueue.shift()!
    // Swap out the person who has been in the inner circle the longest
    const outgoing = state.innerCircle.shift()!
    state.innerCircle.push(incoming)
    state.outerCircle = state.outerCircle.filter((id) => id !== incoming)
    state.outerCircle.push(outgoing)
    swaps.push({
      taggedIn: incoming,
      taggedOut: outgoing,
    })
  }

  // If no tag-ins, do automatic rotation: move first inner to outer, first outer to inner
  if (swaps.length === 0 && state.outerCircle.length > 0) {
    const outgoing = state.innerCircle.shift()!
    const incoming = state.outerCircle.shift()!
    state.innerCircle.push(incoming)
    state.outerCircle.push(outgoing)
    swaps.push({ taggedIn: incoming, taggedOut: outgoing })
  }

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'ROTATE' } })
  publishToRoom(roomId, {
    type: 'rotation',
    data: {
      swaps: swaps.map((s) => ({
        taggedIn: s.taggedIn,
        taggedInName: state.participantNames.get(s.taggedIn) ?? 'Unknown',
        taggedOut: s.taggedOut,
        taggedOutName: state.participantNames.get(s.taggedOut) ?? 'Unknown',
      })),
      innerCircle: state.innerCircle.map((id) => ({ userId: id, name: state.participantNames.get(id) ?? 'Unknown' })),
      outerCircle: state.outerCircle.map((id) => ({ userId: id, name: state.participantNames.get(id) ?? 'Unknown' })),
    },
  })

  const swapMsg = swaps.map((s) =>
    `${state.participantNames.get(s.taggedIn)} swaps in for ${state.participantNames.get(s.taggedOut)}`
  ).join(', ')

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: { message: `Rotating! ${swapMsg}. Next round starting shortly...` },
  })

  // Brief pause then advance
  setTimeout(() => {
    void advanceDiscussionRound(roomId)
  }, 4000)
}

// -- Synthesis Phase ----------------------------------------------------------

async function synthesisPhase(roomId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    select: {
      assessmentMode: true,
      config: true,
    },
  })

  const synthesis = await generateSynthesis(
    state.topic,
    state.annotations,
    state.prompts,
    state.totalRounds,
  )

  if (room?.assessmentMode) {
    const config = (room.config as (FishbowlConfig & {
      aiWeight?: number
      peerWeight?: number
      selfWeight?: number
    }) | null) ?? null
    const weights = {
      ai: typeof config?.aiWeight === 'number' ? config.aiWeight : 0.4,
      peer: typeof config?.peerWeight === 'number' ? config.peerWeight : 0.4,
      self: typeof config?.selfWeight === 'number' ? config.selfWeight : 0.2,
    }

    const assessmentResults = [...state.participantNames.entries()].map(([userId, name]) =>
      buildFishbowlParticipantResult({
        userId,
        name,
        totalRounds: state.totalRounds,
        innerRounds: state.roundsInInnerCircle.get(userId) ?? 0,
        annotationCount: state.annotationsByUser.get(userId)?.length ?? 0,
        sampleAnnotations: state.annotationsByUser.get(userId) ?? [],
      })
    )

    await setRoomAssessmentResults(roomId, {
      roomType: 'FISHBOWL',
      weights,
      participants: assessmentResults,
    })
    await persistCrossExamAssessment(roomId)

    await Promise.all(
      assessmentResults.map((result) =>
        prisma.liveRoomParticipant.updateMany({
          where: { roomId, userId: result.userId },
          data: {
            score: Math.round(
              (result.ai.overall * weights.ai + result.peer.average * weights.peer) * 100
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

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'SYNTHESIS' } })
  publishToRoom(roomId, {
    type: 'synthesis',
    data: {
      synthesis,
      totalAnnotations: state.annotations.length,
      totalRounds: state.totalRounds,
    },
  })

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: { message: 'All rounds complete! Here\'s my synthesis of the discussion and annotations.' },
  })

  // Auto-complete after 20s
  setTimeout(() => {
    void completeFishbowl(roomId)
  }, 20000)
}

// -- Complete -----------------------------------------------------------------

async function completeFishbowl(roomId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: { include: { user: { select: { name: true } } } },
      channel: true,
    },
  })
  if (!room || room.phase === 'COMPLETE') return

  const config = room.config as unknown as FishbowlConfig
  const state = sessionState.get(roomId)

  if (room.assessmentMode) {
    await persistCrossExamAssessment(roomId)
  }

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'COMPLETE', endedAt: new Date() },
  })

  const names = room.participants.map((p) => p.user.name)
  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'COMPLETE' } })
  publishToRoom(roomId, { type: 'complete', data: { participants: names } })

  const annotationCount = state?.annotations.length ?? 0
  await prisma.channelMessage.create({
    data: {
      channelId: room.channelId,
      authorId: room.hostId,
      content: `Fishbowl Complete -- "${config.topic}"\n\n${names.length} participants across ${state?.totalRounds ?? 3} discussion rounds with ${annotationCount} annotations from observers.\n\nParticipants: ${names.join(', ')}\n\nThe fishbowl format ensures every voice is heard -- both from inside and outside the circle.`,
      messageType: 'system',
      isSandy: true,
    },
  })

  if (state?.timerHandle) clearTimeout(state.timerHandle)
  sessionState.delete(roomId)
}

// -- End (host early termination) ---------------------------------------------

export async function endFishbowl(roomId: string, userId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({ where: { id: roomId } })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })
  if (room.hostId !== userId) throw Object.assign(new Error('Only the host can end'), { status: 403 })
  if (room.phase === 'COMPLETE') return

  const state = sessionState.get(roomId)
  if (state?.timerHandle) clearTimeout(state.timerHandle)

  await completeFishbowl(roomId)
}

// -- AI: Generate Discussion Prompts ------------------------------------------

async function generateDiscussionPrompts(topic: string, count: number, courseName: string): Promise<string[]> {
  if (!process.env.ANTHROPIC_API_KEY) return fallbackPrompts(topic, count)

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: `Generate exactly ${count} discussion prompts for a fishbowl discussion. Each prompt should be thought-provoking and debatable, progressively going deeper. Topic: "${topic}", Course: "${courseName}". Return ONLY a JSON array of strings. No markdown.`,
      messages: [{ role: 'user', content: `Generate ${count} fishbowl discussion prompts about: ${topic}` }],
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

// -- AI: Generate Synthesis ---------------------------------------------------

async function generateSynthesis(
  topic: string,
  annotations: FishbowlSessionState['annotations'],
  prompts: string[],
  rounds: number,
): Promise<string> {
  const fallback = fallbackSynthesis(topic, annotations.length, rounds)
  if (!process.env.ANTHROPIC_API_KEY) return fallback

  try {
    const annotationText = annotations.length > 0
      ? annotations.slice(-20).map((a) => `${a.authorName}: "${a.text}"`).join('\n')
      : '(No annotations submitted)'

    const promptText = prompts.map((p, i) => `Round ${i + 1}: ${p}`).join('\n')

    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: `You are Sandy. Synthesize a fishbowl discussion. Topic: "${topic}". ${rounds} rounds with these prompts:\n${promptText}\n\nObserver annotations:\n${annotationText}\n\nWrite a 2-3 paragraph synthesis that:\n1. Identifies the key themes and insights from the discussion\n2. Highlights valuable observations from the outer circle annotations\n3. Notes how perspectives evolved across rounds\n4. Encourages continued exploration\n\nReturn ONLY the synthesis text.`,
      messages: [{ role: 'user', content: `Generate a synthesis of the fishbowl discussion.` }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    if (text.trim().length < 30) return fallback
    return text.trim()
  } catch (err) {
    console.error('[FishbowlEngine] Synthesis generation failed:', err)
    return fallback
  }
}
