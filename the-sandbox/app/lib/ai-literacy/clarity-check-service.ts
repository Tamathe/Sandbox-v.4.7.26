/**
 * Student Clarity Check — quick quiz after viewing course AI expectations.
 * Generates T/F/Depends questions from course policy text via Haiku.
 * Faculty can see aggregate clarity scores to improve policy communication.
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'

const anthropic = new Anthropic()
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

export interface ClarityQuestion {
  question: string
  correctAnswer: 'yes' | 'no' | 'depends'
  explanation: string
}

export interface ClarityResult {
  score: number // 0-100
  total: number
  correct: number
  feedback: { question: string; yourAnswer: string; correct: boolean; explanation: string }[]
}

export async function generateClarityQuestions(policyId: string): Promise<ClarityQuestion[]> {
  const policy = await prisma.courseAIPolicy.findUnique({
    where: { id: policyId },
    include: { course: { select: { courseCode: true, title: true } } },
  })

  if (!policy) throw new Error('Policy not found')

  try {
    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 1500,
      system: `You generate quiz questions to test whether a student understands a course's AI policy. Generate exactly 5 questions with "yes", "no", or "depends" answers. Return ONLY valid JSON array.

Format: [{"question": "...", "correctAnswer": "yes|no|depends", "explanation": "..."}]

Make questions specific to THIS policy — reference actual assignment types, AI levels, and disclosure requirements mentioned in the text. Include at least one "depends" answer (where the answer varies by assignment).`,
      messages: [{
        role: 'user',
        content: `Course: ${policy.course.courseCode} — ${policy.course.title}\n\nAI Policy:\n${policy.policyText}`,
      }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')

    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('No JSON array in response')

    const parsed = JSON.parse(jsonMatch[0]) as ClarityQuestion[]
    return parsed.slice(0, 5)
  } catch {
    // Fallback generic questions
    return [
      { question: 'Can you use ChatGPT on all assignments in this course?', correctAnswer: 'depends', explanation: 'AI use levels vary by assignment — check the per-assignment breakdown in the policy.' },
      { question: 'Do you need to disclose when you use AI tools?', correctAnswer: 'yes', explanation: 'The policy requires disclosure of AI use on all assignments where it\'s permitted.' },
      { question: 'Is it okay to submit AI-generated text as entirely your own?', correctAnswer: 'no', explanation: 'Submitting AI work without disclosure is an academic integrity violation.' },
      { question: 'Can you use AI for grammar checking on any assignment?', correctAnswer: 'depends', explanation: 'Grammar checking may be allowed even on restricted assignments, but check the specific assignment level.' },
      { question: 'Will there be consequences for undisclosed AI use?', correctAnswer: 'yes', explanation: 'The policy outlines consequences ranging from assignment penalties to integrity referral.' },
    ]
  }
}

export async function scoreClarityCheck(
  userId: string,
  courseId: string,
  policyId: string,
  responses: { question: string; answer: string; correctAnswer: string; explanation: string }[],
): Promise<ClarityResult> {
  let correct = 0
  const feedback = responses.map(r => {
    const isCorrect = r.answer === r.correctAnswer
    if (isCorrect) correct++
    return {
      question: r.question,
      yourAnswer: r.answer,
      correct: isCorrect,
      explanation: r.explanation,
    }
  })

  const score = responses.length > 0 ? Math.round((correct / responses.length) * 100) : 0

  // Save to DB
  await prisma.clarityCheckResponse.create({
    data: {
      userId,
      courseId,
      policyId,
      score,
      responses: feedback,
    },
  })

  return { score, total: responses.length, correct, feedback }
}

export async function getClarityStats(courseId: string) {
  const responses = await prisma.clarityCheckResponse.findMany({
    where: { courseId },
    select: { score: true, responses: true },
  })

  if (responses.length === 0) {
    return { avgScore: 0, totalResponses: 0, commonMisses: [] }
  }

  const avgScore = Math.round(responses.reduce((s, r) => s + r.score, 0) / responses.length)

  // Find commonly missed questions
  const missMap = new Map<string, number>()
  for (const r of responses) {
    const items = r.responses as { question: string; correct: boolean }[]
    for (const item of items) {
      if (!item.correct) {
        missMap.set(item.question, (missMap.get(item.question) ?? 0) + 1)
      }
    }
  }

  const commonMisses = Array.from(missMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([question, count]) => ({ question, missCount: count, missRate: Math.round((count / responses.length) * 100) }))

  return { avgScore, totalResponses: responses.length, commonMisses }
}
