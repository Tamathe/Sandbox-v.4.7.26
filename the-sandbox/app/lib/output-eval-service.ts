import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'
import type { OutputEvalAttempt, Prisma } from '../generated/prisma'
import { SEEDED_SCENARIOS, type PlantedError, type SeededScenario } from './output-eval-constants'

const anthropic = new Anthropic()
const HAIKU = 'claude-haiku-4-5-20251001'
const SONNET = 'claude-sonnet-4-6'

// ── Scenario Selection ───────────────────────────────────────────────────────

export function getScenario(tier: number, excludeIds?: string[]): SeededScenario | null {
  const candidates = SEEDED_SCENARIOS.filter(
    (s) => s.tier === tier && !(excludeIds ?? []).includes(s.id),
  )
  if (candidates.length === 0) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

// ── AI Generation ────────────────────────────────────────────────────────────

const TOPICS = ['general-knowledge', 'academic-writing', 'code', 'data-interpretation'] as const

export async function generateScenario(
  tier: number,
  topic?: SeededScenario['topic'],
): Promise<SeededScenario> {
  const chosenTopic = topic ?? TOPICS[Math.floor(Math.random() * TOPICS.length)]

  const errorGuidance =
    tier === 1
      ? '3-4 obvious errors (blatant factual mistakes, clear bias, easily spotted)'
      : tier === 2
        ? '2-3 subtle errors (plausible-sounding hallucinations, soft bias, requires careful reading)'
        : '1-2 very subtle errors (requires domain expertise to spot, nearly correct but with a key flaw)'

  const response = await anthropic.messages.create({
    model: SONNET,
    max_tokens: 2048,
    system: `You generate AI output evaluation scenarios for university students. Create a scenario where a student asks an AI a question and receives a response that contains planted errors.

Tier ${tier} difficulty: ${errorGuidance}

Topic: ${chosenTopic}

The AI response should be 200-400 words, read naturally, and contain the planted errors woven seamlessly into otherwise accurate content.

Return ONLY valid JSON (no markdown fences):
{
  "question": "The student's question",
  "aiResponse": "The multi-paragraph AI response with planted errors",
  "plantedErrors": [
    {
      "span": "Exact text from the response containing the error",
      "type": "hallucination|bias|unsupported|missing_context",
      "explanation": "Why this is wrong and what the truth is"
    }
  ]
}`,
    messages: [{
      role: 'user',
      content: `Generate a Tier ${tier} scenario about ${chosenTopic} for a university student.`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  const parsed = JSON.parse(text)

  return {
    id: crypto.randomUUID(),
    tier,
    topic: chosenTopic,
    question: parsed.question,
    aiResponse: parsed.aiResponse,
    plantedErrors: parsed.plantedErrors,
  }
}

// ── Evaluation ───────────────────────────────────────────────────────────────

function wordSet(text: string): Set<string> {
  return new Set(text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean))
}

function wordOverlap(a: string, b: string): number {
  const setA = wordSet(a)
  const setB = wordSet(b)
  if (setA.size === 0 || setB.size === 0) return 0
  let overlap = 0
  for (const w of setA) {
    if (setB.has(w)) overlap++
  }
  const union = new Set([...setA, ...setB]).size
  return overlap / union // Jaccard similarity
}

function isSpanMatch(userSpan: string, plantedSpan: string): boolean {
  const uNorm = userSpan.toLowerCase().trim()
  const pNorm = plantedSpan.toLowerCase().trim()
  // Substring match
  if (pNorm.includes(uNorm) || uNorm.includes(pNorm)) return true
  // Word overlap > 50%
  return wordOverlap(userSpan, plantedSpan) > 0.5
}

export interface UserHighlight {
  span: string
  type: string
  explanation: string
}

export interface EvalResult {
  detectionScore: number
  justificationScore: number
  overallScore: number
  feedback: string
}

export async function evaluateUserHighlights(
  scenarioId: string,
  plantedErrors: PlantedError[],
  userHighlights: UserHighlight[],
  userRating: number,
): Promise<EvalResult> {
  // Phase 1: Detection scoring (pure logic)
  let detected = 0
  for (const error of plantedErrors) {
    const matched = userHighlights.some((h) => isSpanMatch(h.span, error.span))
    if (matched) detected++
  }
  const detectionScore = plantedErrors.length > 0
    ? Math.round((detected / plantedErrors.length) * 100)
    : 0

  // Phase 2: Justification scoring (Haiku)
  const justificationPrompt = plantedErrors
    .map((e, i) => {
      const userMatch = userHighlights.find((h) => isSpanMatch(h.span, e.span))
      return `Error ${i + 1}:
Ground truth: ${e.explanation}
Student's explanation: ${userMatch?.explanation ?? '(not identified)'}
Student's error type: ${userMatch?.type ?? '(not identified)'}`
    })
    .join('\n\n')

  const response = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 512,
    system: `You evaluate how well a student justified their identification of errors in an AI-generated response. For each error, score the student's explanation quality from 1-10 (10 = perfectly identified the issue with correct reasoning, 1 = completely missed or wrong). If the student didn't identify the error, score 0.

Return ONLY valid JSON (no markdown fences):
{"scores":[N,N,...],"feedback":"2-3 sentences of constructive feedback"}`,
    messages: [{
      role: 'user',
      content: `The student rated the AI response ${userRating}/5 for overall quality.\n\n${justificationPrompt}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{"scores":[],"feedback":""}'
  const parsed = JSON.parse(text)
  const justScores: number[] = parsed.scores ?? []
  const justificationScore = justScores.length > 0
    ? Math.round(justScores.reduce((a: number, b: number) => a + b, 0) / justScores.length * 10)
    : 0

  const overallScore = Math.round(detectionScore * 0.6 + justificationScore * 0.4)

  return {
    detectionScore,
    justificationScore,
    overallScore,
    feedback: parsed.feedback || 'Keep practicing your critical evaluation skills!',
  }
}

// ── Persistence ──────────────────────────────────────────────────────────────

export async function saveAttempt(
  userId: string,
  data: {
    scenarioId: string
    tier: number
    question: string
    aiResponse: string
    plantedErrors: object
    userHighlights: object
    userRating: number
    detectionScore: number
    justificationScore: number
    overallScore: number
    feedback: string
    isSeeded: boolean
  },
): Promise<OutputEvalAttempt> {
  return prisma.outputEvalAttempt.create({
    data: {
      userId,
      ...data,
      plantedErrors: data.plantedErrors as unknown as Prisma.InputJsonValue,
      userHighlights: data.userHighlights as unknown as Prisma.InputJsonValue,
    },
  })
}

// ── Progress ─────────────────────────────────────────────────────────────────

export interface TierProgress {
  tier: number
  attempts: number
  bestScore: number
  avgScore: number
}

export interface UserOutputEvalProgress {
  totalAttempts: number
  avgScore: number
  tierProgress: TierProgress[]
}

export async function getUserProgress(userId: string): Promise<UserOutputEvalProgress> {
  const [attempts, groupedByTier] = await Promise.all([
    prisma.outputEvalAttempt.aggregate({
      where: { userId },
      _count: true,
      _avg: { overallScore: true },
    }),
    prisma.outputEvalAttempt.groupBy({
      by: ['tier'],
      where: { userId },
      _count: true,
      _avg: { overallScore: true },
      _max: { overallScore: true },
    }),
  ])

  return {
    totalAttempts: attempts._count,
    avgScore: Math.round(attempts._avg.overallScore ?? 0),
    tierProgress: groupedByTier
      .map((g) => ({
        tier: g.tier,
        attempts: g._count,
        bestScore: g._max.overallScore ?? 0,
        avgScore: Math.round(g._avg.overallScore ?? 0),
      }))
      .sort((a, b) => a.tier - b.tier),
  }
}

// ── Class Progress ───────────────────────────────────────────────────────────

export interface ClassOutputEvalProgress {
  studentCount: number
  avgScore: number
  tierBreakdown: { tier: number; avgScore: number; attempts: number }[]
}

export async function getClassProgress(courseId: string): Promise<ClassOutputEvalProgress> {
  // Get enrolled student IDs
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseId },
    select: { studentId: true },
  })
  const studentIds = enrollments.map((e) => e.studentId)

  if (studentIds.length === 0) {
    return { studentCount: 0, avgScore: 0, tierBreakdown: [] }
  }

  const [aggregate, groupedByTier] = await Promise.all([
    prisma.outputEvalAttempt.aggregate({
      where: { userId: { in: studentIds } },
      _avg: { overallScore: true },
    }),
    prisma.outputEvalAttempt.groupBy({
      by: ['tier'],
      where: { userId: { in: studentIds } },
      _count: true,
      _avg: { overallScore: true },
    }),
  ])

  // Count students who have at least one attempt
  const studentsWithAttempts = await prisma.outputEvalAttempt.groupBy({
    by: ['userId'],
    where: { userId: { in: studentIds } },
  })

  return {
    studentCount: studentsWithAttempts.length,
    avgScore: Math.round(aggregate._avg.overallScore ?? 0),
    tierBreakdown: groupedByTier
      .map((g) => ({
        tier: g.tier,
        avgScore: Math.round(g._avg.overallScore ?? 0),
        attempts: g._count,
      }))
      .sort((a, b) => a.tier - b.tier),
  }
}
