import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'
import type { PromptLabAttempt, PromptLabSandboxEntry, Prisma, DisciplineFamily } from '../generated/prisma'
import { PROMPT_LAB_CHALLENGES, type PromptLabChallenge } from './prompt-lab-constants'

const anthropic = new Anthropic()
const HAIKU = 'claude-haiku-4-5-20251001'
const SONNET = 'claude-sonnet-4-6'

// ── Challenge Retrieval ──────────────────────────────────────────────────────

export function getChallenges(level: number): PromptLabChallenge[] {
  return PROMPT_LAB_CHALLENGES.filter((c) => c.level === level)
}

export function getChallenge(challengeId: string): PromptLabChallenge | undefined {
  return PROMPT_LAB_CHALLENGES.find((c) => c.id === challengeId)
}

// ── AI Calls ─────────────────────────────────────────────────────────────────

export async function executePrompt(prompt: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 1024,
    system: 'You are a helpful AI assistant. Respond to the user\'s prompt naturally and thoroughly.',
    messages: [{ role: 'user', content: prompt }],
  })
  return response.content[0].type === 'text' ? response.content[0].text : ''
}

export interface PromptEvalScores {
  clarity: number
  specificity: number
  constraints: number
  effectiveness: number
}

export interface PromptEvalResult {
  scores: PromptEvalScores
  overallScore: number
  feedback: string
}

export async function evaluatePromptRewrite(
  original: string,
  rewritten: string,
  originalOutput: string,
  rewrittenOutput: string,
  challengeContext: string,
): Promise<PromptEvalResult> {
  const response = await anthropic.messages.create({
    model: SONNET,
    max_tokens: 1024,
    system: `You are an expert prompt engineering evaluator. Compare the original prompt with the student's rewritten prompt and their respective AI outputs. Score the rewrite on 4 dimensions (each 1-10):

- clarity: How clear and unambiguous is the rewritten prompt?
- specificity: How specific and detailed is it compared to the original?
- constraints: How well does it use format, length, tone, or structural constraints?
- effectiveness: How much better is the rewritten output compared to the original?

Return ONLY valid JSON (no markdown fences):
{"scores":{"clarity":N,"specificity":N,"constraints":N,"effectiveness":N},"overallScore":N,"feedback":"2-3 sentences"}

overallScore should be the rounded average of the 4 dimension scores.`,
    messages: [{
      role: 'user',
      content: `Challenge context: ${challengeContext}

Original prompt: ${original}
Original output: ${originalOutput}

Rewritten prompt: ${rewritten}
Rewritten output: ${rewrittenOutput}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  return JSON.parse(text) as PromptEvalResult
}

export async function generateVariation(challengeId: string): Promise<{
  scenario: string
  originalPrompt: string
  hints: string[]
}> {
  const challenge = getChallenge(challengeId)
  if (!challenge) throw new Error(`Challenge not found: ${challengeId}`)

  const response = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 512,
    system: `You generate variations of prompt engineering challenges for university students. Given an existing challenge, create a thematically similar but different scenario in a different academic discipline. Return ONLY valid JSON (no markdown fences):
{"scenario":"...","originalPrompt":"...","hints":["...","...","..."]}`,
    messages: [{
      role: 'user',
      content: `Create a variation of this Level ${challenge.level} challenge:
Scenario: ${challenge.scenario}
Original prompt: ${challenge.originalPrompt}
Hints: ${challenge.hints.join('; ')}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  return JSON.parse(text)
}

export async function getSandboxTip(prompt: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 256,
    system: 'You are Sandy, a friendly AI prompt coaching assistant. Give a brief, actionable tip (2-3 sentences) on how the student could improve their prompt. Be encouraging but specific.',
    messages: [{ role: 'user', content: `Here's my prompt — any tips?\n\n${prompt}` }],
  })
  return response.content[0].type === 'text' ? response.content[0].text : ''
}

// ── Persistence ──────────────────────────────────────────────────────────────

export async function saveAttempt(
  userId: string,
  data: {
    challengeId: string
    level: number
    originalPrompt: string
    userPrompt: string
    originalOutput: string
    userOutput: string
    scores: object
    overallScore: number
    feedback: string
    context?: string
    disciplineFamily?: string
  },
): Promise<PromptLabAttempt> {
  const { context, disciplineFamily, ...rest } = data
  return prisma.promptLabAttempt.create({
    data: {
      userId,
      ...rest,
      scores: rest.scores as unknown as Prisma.InputJsonValue,
      ...(context ? { context } : {}),
      ...(disciplineFamily ? { disciplineFamily: disciplineFamily as DisciplineFamily } : {}),
    },
  })
}

export async function saveSandboxEntry(
  userId: string,
  data: { prompt: string; output: string; sandyTip?: string },
): Promise<PromptLabSandboxEntry> {
  return prisma.promptLabSandboxEntry.create({
    data: { userId, ...data },
  })
}

// ── Progress ─────────────────────────────────────────────────────────────────

export interface LevelProgress {
  level: number
  attempts: number
  bestScore: number
  avgScore: number
}

export interface UserPromptLabProgress {
  totalAttempts: number
  avgScore: number
  levelProgress: LevelProgress[]
}

export async function getUserProgress(userId: string): Promise<UserPromptLabProgress> {
  const [attempts, groupedByLevel] = await Promise.all([
    prisma.promptLabAttempt.aggregate({
      where: { userId },
      _count: true,
      _avg: { overallScore: true },
    }),
    prisma.promptLabAttempt.groupBy({
      by: ['level'],
      where: { userId },
      _count: true,
      _avg: { overallScore: true },
      _max: { overallScore: true },
    }),
  ])

  return {
    totalAttempts: attempts._count,
    avgScore: Math.round(attempts._avg.overallScore ?? 0),
    levelProgress: groupedByLevel
      .map((g) => ({
        level: g.level,
        attempts: g._count,
        bestScore: g._max.overallScore ?? 0,
        avgScore: Math.round(g._avg.overallScore ?? 0),
      }))
      .sort((a, b) => a.level - b.level),
  }
}
