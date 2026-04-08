/**
 * Office Hours Engine — Drop-in Q&A with an educator and Sandy.
 *
 * Open-format session where students queue questions. Sandy provides
 * initial answers from course context via Haiku. Questions Sandy can't
 * answer confidently are flagged as "needs human." The educator can
 * mark questions as resolved.
 *
 * Lifecycle: LOBBY -> ACTIVE (QUESTION phase) -> COMPLETE
 * Reuses LiveRoom phases: LOBBY, QUESTION=ACTIVE, COMPLETE
 */

import { prisma } from '../prisma'
import { publishToRoom } from '../sandcastle/room-bus'
import Anthropic from '@anthropic-ai/sdk'

// ── Config ───────────────────────────────────────────────────────────────────

export type { OfficeHoursConfig } from './types'
import type { OfficeHoursConfig } from './types'

// ── In-Memory Session State ──────────────────────────────────────────────────

interface OfficeHoursQuestion {
  id: string
  authorId: string
  authorName: string
  text: string
  sandyAnswer: string | null
  isResolved: boolean
  needsHuman: boolean
  timestamp: number
}

interface OfficeHoursSessionState {
  questions: OfficeHoursQuestion[]
  educatorPresent: boolean
}

const sessionState = new Map<string, OfficeHoursSessionState>()

// ── Helpers ──────────────────────────────────────────────────────────────────

let questionCounter = 0
function nextQuestionId(): string {
  questionCounter++
  return `oq_${Date.now()}_${questionCounter}`
}

// ── Start Office Hours ───────────────────────────────────────────────────────

export async function startOfficeHours(roomId: string, hostId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: { include: { user: { select: { id: true, name: true } } } },
      course: { select: { id: true, title: true } },
    },
  })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })
  if (room.hostId !== hostId) throw Object.assign(new Error('Only the host can start'), { status: 403 })
  if (room.type !== 'OFFICE_HOURS') throw Object.assign(new Error('Not an office hours room'), { status: 400 })
  if (room.phase !== 'LOBBY') throw Object.assign(new Error('Room already started'), { status: 400 })

  // Update room: phase -> QUESTION (ACTIVE), startedAt -> now
  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'QUESTION', startedAt: new Date() },
  })

  // Initialize session state
  sessionState.set(roomId, {
    questions: [],
    educatorPresent: true,
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'ACTIVE' } })
  publishToRoom(roomId, {
    type: 'sandy_says',
    data: {
      message: 'Office Hours are open! Submit your questions below. I\'ll provide an initial answer while your educator reviews the queue.',
    },
  })
}

// ── Submit Question ──────────────────────────────────────────────────────────

export async function submitQuestion(roomId: string, userId: string, text: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) throw Object.assign(new Error('Session not found'), { status: 404 })

  const participant = await prisma.liveRoomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
    include: { user: { select: { name: true } } },
  })
  if (!participant) throw Object.assign(new Error('Not a participant'), { status: 403 })

  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: { course: { select: { title: true } } },
  })
  const config = room?.config as unknown as OfficeHoursConfig | undefined

  const questionId = nextQuestionId()

  const question: OfficeHoursQuestion = {
    id: questionId,
    authorId: userId,
    authorName: participant.user.name,
    text,
    sandyAnswer: null,
    isResolved: false,
    needsHuman: false,
    timestamp: Date.now(),
  }
  state.questions.push(question)

  // Broadcast the new question immediately (without Sandy's answer yet)
  publishToRoom(roomId, {
    type: 'question_added',
    data: { question },
  })

  // Generate Sandy's answer asynchronously
  const courseContext = config?.courseContext ?? config?.topic ?? room?.course?.title ?? 'General'
  void generateSandyAnswer(roomId, questionId, text, courseContext)
}

// ── Resolve Question ─────────────────────────────────────────────────────────

export async function resolveQuestion(roomId: string, userId: string, questionId: string): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) throw Object.assign(new Error('Session not found'), { status: 404 })

  const room = await prisma.liveRoom.findUnique({ where: { id: roomId } })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })
  if (room.hostId !== userId) throw Object.assign(new Error('Only the host can resolve questions'), { status: 403 })

  const question = state.questions.find((q) => q.id === questionId)
  if (!question) throw Object.assign(new Error('Question not found'), { status: 404 })

  question.isResolved = true

  publishToRoom(roomId, {
    type: 'question_resolved',
    data: { questionId },
  })

  publishToRoom(roomId, {
    type: 'sandy_says',
    data: { message: `"${question.text.substring(0, 60)}${question.text.length > 60 ? '...' : ''}" has been resolved.` },
  })
}

// ── End Office Hours ─────────────────────────────────────────────────────────

export async function endOfficeHours(roomId: string, userId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({ where: { id: roomId } })
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 })
  if (room.hostId !== userId) throw Object.assign(new Error('Only the host can end'), { status: 403 })
  if (room.phase === 'COMPLETE') return

  await completeOfficeHours(roomId)
}

// ── Complete Office Hours ────────────────────────────────────────────────────

async function completeOfficeHours(roomId: string): Promise<void> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: { include: { user: { select: { name: true } } } },
      channel: true,
    },
  })
  if (!room || room.phase === 'COMPLETE') return

  const config = room.config as unknown as OfficeHoursConfig
  const state = sessionState.get(roomId)

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: { phase: 'COMPLETE', endedAt: new Date() },
  })

  const totalQuestions = state?.questions.length ?? 0
  const resolvedCount = state?.questions.filter((q) => q.isResolved).length ?? 0
  const participantNames = room.participants.map((p) => p.user.name)

  // Post summary to chat
  await prisma.channelMessage.create({
    data: {
      channelId: room.channelId,
      authorId: room.hostId,
      content: `Office Hours Complete -- "${config.topic}"\n\n${totalQuestions} questions asked, ${resolvedCount} resolved.\nParticipants: ${participantNames.join(', ')}\n\nGreat session! Remember, there are no bad questions.`,
      messageType: 'system',
      isSandy: true,
    },
  })

  publishToRoom(roomId, { type: 'phase_changed', data: { phase: 'COMPLETE' } })
  publishToRoom(roomId, {
    type: 'complete',
    data: { participants: participantNames, totalQuestions, resolvedCount },
  })

  // Clean up
  sessionState.delete(roomId)
}

// ── AI: Sandy Answer Generation ──────────────────────────────────────────────

async function generateSandyAnswer(
  roomId: string,
  questionId: string,
  questionText: string,
  courseContext: string,
): Promise<void> {
  const state = sessionState.get(roomId)
  if (!state) return

  const question = state.questions.find((q) => q.id === questionId)
  if (!question) return

  if (!process.env.ANTHROPIC_API_KEY) {
    question.sandyAnswer = 'That\'s a great question! Let me flag this for your educator to address directly.'
    question.needsHuman = true
    publishToRoom(roomId, {
      type: 'question_answered',
      data: { questionId, sandyAnswer: question.sandyAnswer, needsHuman: true },
    })
    return
  }

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: `You are Sandy, an AI teaching assistant at the University of Kentucky. A student has asked a question during Office Hours.

Course context: ${courseContext}

Provide a helpful, clear answer. If you are not confident you can answer accurately (e.g., the question is about grading policy, personal situations, or content you don't have enough context for), respond with ONLY the JSON: {"needsHuman": true, "answer": "brief explanation of why you're flagging this for the educator"}.

Otherwise, respond with ONLY the JSON: {"needsHuman": false, "answer": "your helpful answer here"}.

Keep answers concise (2-3 sentences for simple questions, up to a paragraph for complex ones).`,
      messages: [{ role: 'user', content: questionText }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    try {
      const parsed = JSON.parse(text) as { needsHuman: boolean; answer: string }
      question.sandyAnswer = parsed.answer
      question.needsHuman = parsed.needsHuman
    } catch {
      // If parsing fails, treat the raw text as the answer
      question.sandyAnswer = text.trim()
      question.needsHuman = false
    }
  } catch (err) {
    console.error('[OfficeHoursEngine] Sandy answer generation failed:', err)
    question.sandyAnswer = 'I\'m having trouble answering this one. Let me flag it for your educator.'
    question.needsHuman = true
  }

  publishToRoom(roomId, {
    type: 'question_answered',
    data: {
      questionId,
      sandyAnswer: question.sandyAnswer,
      needsHuman: question.needsHuman,
    },
  })
}
