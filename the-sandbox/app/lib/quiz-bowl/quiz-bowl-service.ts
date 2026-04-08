import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import type { QuizBowl, QuizBowlPlayer, QuizBowlQuestion } from '../../generated/prisma'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuizSummary {
  id: string
  title: string
  topic: string
  accessCode: string
  status: string
  currentQ: number
  createdAt: Date
  questionCount: number
  playerCount: number
  isHost: boolean
  asPlayer: boolean
}

export interface QuizDetail {
  id: string
  title: string
  topic: string
  accessCode: string
  status: string
  currentQ: number
  createdAt: Date
  isHost: boolean
  myPlayer: QuizBowlPlayer | null
  questions: QuizDetailQuestion[]
  players: PlayerSummary[]
}

export interface QuizDetailQuestion {
  id: string
  orderIndex: number
  questionText: string
  options: string[]
  // correctIndex only included if question has been revealed or game is COMPLETE
  correctIndex?: number
  explanation?: string
  myAnswer?: { selectedIndex: number; isCorrect: boolean } | null
}

export interface PlayerSummary {
  id: string
  displayName: string
  score: number
  userId: string
  joinedAt: Date
}

// ─── Access code ──────────────────────────────────────────────────────────────

const BLITZ_WORDS = [
  'BLITZ', 'SPARK', 'SURGE', 'FLASH', 'PULSE', 'RAPID', 'SWIFT', 'SMART',
  'CRISP', 'SHARP', 'PRIME', 'QUICK', 'BURST', 'LASER', 'SONIC', 'TURBO',
]

export function generateAccessCode(): string {
  const word = BLITZ_WORDS[Math.floor(Math.random() * BLITZ_WORDS.length)]
  const num = String(Math.floor(Math.random() * 900) + 100)
  return `${word}-${num}`
}

async function uniqueAccessCode(): Promise<string> {
  let code = generateAccessCode()
  let exists = await prisma.quizBowl.findUnique({ where: { accessCode: code } })
  while (exists) {
    code = generateAccessCode()
    exists = await prisma.quizBowl.findUnique({ where: { accessCode: code } })
  }
  return code
}

// ─── Question generation ──────────────────────────────────────────────────────

interface GeneratedQuestion {
  questionText: string
  options: string[]
  correctIndex: number
  explanation: string
}

async function generateQuestions(quizId: string): Promise<void> {
  const quiz = await prisma.quizBowl.findUnique({ where: { id: quizId } })
  if (!quiz) return

  const n = quiz.currentQ === 0 ? 5 : quiz.currentQ // reuse currentQ as count during GENERATING
  // Re-fetch question count from a metadata store: we store count as currentQ during creation
  const questionCount = quiz.currentQ

  const prompt = `Generate ${questionCount} multiple-choice quiz questions about "${quiz.topic}".

For each question return a JSON object with these exact fields:
- questionText: string (the question)
- options: array of exactly 4 strings (answer choices)
- correctIndex: number 0-3 (index into options array)
- explanation: string (one sentence explaining why the correct answer is right)

Return ONLY a valid JSON array of ${questionCount} objects. No markdown, no extra text.`

  let parsed: GeneratedQuestion[] = []
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    // Strip markdown code fences if present
    const clean = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
    parsed = JSON.parse(clean) as GeneratedQuestion[]
  } catch {
    // Fallback: generate simple placeholder questions
    parsed = Array.from({ length: questionCount }, (_, i) => ({
      questionText: `Question ${i + 1} about ${quiz.topic}`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctIndex: 0,
      explanation: 'This is the correct answer.',
    }))
  }

  // Persist questions
  await prisma.$transaction(
    parsed.slice(0, questionCount).map((q, i) =>
      prisma.quizBowlQuestion.create({
        data: {
          quizId,
          orderIndex: i,
          questionText: q.questionText,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
        },
      })
    )
  )

  // Reset currentQ to 0 and mark READY
  await prisma.quizBowl.update({
    where: { id: quizId },
    data: { status: 'READY', currentQ: 0 },
  })
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createQuiz(
  hostId: string,
  title: string,
  topic: string,
  questionCount: number
): Promise<QuizBowl> {
  const accessCode = await uniqueAccessCode()
  const count = Math.max(1, Math.min(10, questionCount))

  // Store questionCount in currentQ temporarily during GENERATING phase
  const quiz = await prisma.quizBowl.create({
    data: {
      title,
      topic,
      accessCode,
      hostId,
      status: 'GENERATING',
      currentQ: count, // temporarily holds count during generation
    },
  })

  // Fire-and-forget question generation
  generateQuestions(quiz.id).catch(console.error)

  return quiz
}

export async function getQuiz(quizId: string, userId: string): Promise<QuizDetail | null> {
  const quiz = await prisma.quizBowl.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        orderBy: { orderIndex: 'asc' },
        include: {
          answers: { where: { player: { userId } } },
        },
      },
      players: {
        orderBy: { score: 'desc' },
        include: { user: { select: { id: true } } },
      },
    },
  })

  if (!quiz) return null

  const isHost = quiz.hostId === userId
  const myPlayer = quiz.players.find(p => p.userId === userId) ?? null
  const isComplete = quiz.status === 'COMPLETE'
  const currentQ = isComplete ? Infinity : (quiz.status === 'IN_PROGRESS' ? quiz.currentQ : -1)

  const questions: QuizDetailQuestion[] = quiz.questions.map(q => {
    const myAnswer = q.answers[0] ?? null
    const revealed = isComplete || (quiz.status === 'IN_PROGRESS' && q.orderIndex < quiz.currentQ)

    return {
      id: q.id,
      orderIndex: q.orderIndex,
      questionText: q.questionText,
      options: q.options,
      ...(revealed ? { correctIndex: q.correctIndex, explanation: q.explanation } : {}),
      myAnswer: myAnswer ? { selectedIndex: myAnswer.selectedIndex, isCorrect: myAnswer.isCorrect } : null,
    }
  })

  const players: PlayerSummary[] = quiz.players.map(p => ({
    id: p.id,
    displayName: p.displayName,
    score: p.score,
    userId: p.userId,
    joinedAt: p.joinedAt,
  }))

  return {
    id: quiz.id,
    title: quiz.title,
    topic: quiz.topic,
    accessCode: quiz.accessCode,
    status: quiz.status,
    currentQ: quiz.currentQ,
    createdAt: quiz.createdAt,
    isHost,
    myPlayer,
    questions,
    players,
  }
}

export async function listQuizzesForUser(userId: string): Promise<QuizSummary[]> {
  const quizzes = await prisma.quizBowl.findMany({
    where: {
      OR: [
        { hostId: userId },
        { players: { some: { userId } } },
      ],
    },
    include: {
      _count: { select: { questions: true, players: true } },
      players: { where: { userId }, select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return quizzes.map(q => ({
    id: q.id,
    title: q.title,
    topic: q.topic,
    accessCode: q.accessCode,
    status: q.status,
    currentQ: q.currentQ,
    createdAt: q.createdAt,
    questionCount: q._count.questions,
    playerCount: q._count.players,
    isHost: q.hostId === userId,
    asPlayer: q.players.length > 0,
  }))
}

export async function joinQuiz(
  quizId: string,
  userId: string,
  displayName: string
): Promise<QuizBowlPlayer> {
  const quiz = await prisma.quizBowl.findUnique({ where: { id: quizId } })
  if (!quiz) throw new Error('Quiz not found')
  if (quiz.status !== 'LOBBY' && quiz.status !== 'READY') {
    throw new Error('Quiz has already started')
  }

  return prisma.quizBowlPlayer.upsert({
    where: { quizId_userId: { quizId, userId } },
    create: { quizId, userId, displayName },
    update: { displayName },
  })
}

export async function startQuiz(quizId: string, hostId: string): Promise<QuizBowl> {
  const quiz = await prisma.quizBowl.findUnique({ where: { id: quizId } })
  if (!quiz) throw new Error('Quiz not found')
  if (quiz.hostId !== hostId) throw new Error('Only the host can start the quiz')
  if (quiz.status !== 'READY') throw new Error('Quiz is not ready to start')

  return prisma.quizBowl.update({
    where: { id: quizId },
    data: { status: 'IN_PROGRESS', currentQ: 0 },
  })
}

export async function advanceQuestion(quizId: string, hostId: string): Promise<{ currentQ: number; status: string }> {
  const quiz = await prisma.quizBowl.findUnique({
    where: { id: quizId },
    include: { _count: { select: { questions: true } } },
  })
  if (!quiz) throw new Error('Quiz not found')
  if (quiz.hostId !== hostId) throw new Error('Only the host can advance questions')
  if (quiz.status !== 'IN_PROGRESS') throw new Error('Quiz is not in progress')

  const nextQ = quiz.currentQ + 1
  const isComplete = nextQ >= quiz._count.questions

  const updated = await prisma.quizBowl.update({
    where: { id: quizId },
    data: {
      currentQ: nextQ,
      status: isComplete ? 'COMPLETE' : 'IN_PROGRESS',
    },
  })

  return { currentQ: updated.currentQ, status: updated.status }
}

export async function submitAnswer(
  quizId: string,
  questionId: string,
  userId: string,
  selectedIndex: number
): Promise<{ isCorrect: boolean; correctIndex: number; explanation: string }> {
  const quiz = await prisma.quizBowl.findUnique({ where: { id: quizId } })
  if (!quiz) throw new Error('Quiz not found')
  if (quiz.status !== 'IN_PROGRESS') throw new Error('Quiz is not in progress')

  const question = await prisma.quizBowlQuestion.findUnique({ where: { id: questionId } })
  if (!question || question.quizId !== quizId) throw new Error('Question not found')

  const player = await prisma.quizBowlPlayer.findUnique({
    where: { quizId_userId: { quizId, userId } },
  })
  if (!player) throw new Error('You are not a player in this quiz')

  const isCorrect = selectedIndex === question.correctIndex

  await prisma.quizBowlAnswer.upsert({
    where: { questionId_playerId: { questionId, playerId: player.id } },
    create: { questionId, playerId: player.id, selectedIndex, isCorrect },
    update: { selectedIndex, isCorrect },
  })

  if (isCorrect) {
    await prisma.quizBowlPlayer.update({
      where: { id: player.id },
      data: { score: { increment: 100 } },
    })
  }

  return { isCorrect, correctIndex: question.correctIndex, explanation: question.explanation }
}
