import { prisma } from './prisma'
import { toJsonValue } from './prisma-utils'
import { invalidateUserCache } from './server-auth'

// ── Types ────────────────────────────────────────────────────────────────────

export type FerpaQuestion = {
  question: string
  choices: string[]
  correctIndex: number
}

type AnswerRecord = {
  question: string
  selectedAnswer: string
  correctAnswer: string
  correct: boolean
}

// ── Quiz Generation ──────────────────────────────────────────────────────────

export async function generateFerpaQuiz(): Promise<FerpaQuestion[]> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic()

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `You are a FERPA compliance training expert for the University of Kentucky.

Generate exactly 5 multiple-choice questions about FERPA (Family Educational Rights and Privacy Act) basics that every university educator should know. Topics should cover:
1. What FERPA protects (education records)
2. Directory information vs. protected records
3. When educators can share student information
4. Student rights under FERPA (inspect, amend, consent)
5. Penalties or consequences for FERPA violations

Each question must have exactly 4 choices (A, B, C, D) with exactly one correct answer.

Return ONLY valid JSON in this exact format (no markdown, no extra text):
[
  {
    "question": "...",
    "choices": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correctIndex": 0
  }
]

correctIndex is 0-based (0=A, 1=B, 2=C, 3=D).`,
      },
    ],
  })

  const textBlock = message.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from AI')
  }

  const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    throw new Error('Could not parse quiz from AI response')
  }

  const questions = JSON.parse(jsonMatch[0]) as FerpaQuestion[]
  if (!Array.isArray(questions) || questions.length !== 5) {
    throw new Error('Expected exactly 5 questions')
  }

  return questions
}

// ── Quiz Evaluation ──────────────────────────────────────────────────────────

export async function evaluateQuiz(
  userId: string,
  userEmail: string,
  questions: FerpaQuestion[],
  selectedIndices: number[],
): Promise<{ score: number; passed: boolean; answers: AnswerRecord[] }> {
  const answers: AnswerRecord[] = questions.map((q, i) => ({
    question: q.question,
    selectedAnswer: q.choices[selectedIndices[i]] ?? '(no answer)',
    correctAnswer: q.choices[q.correctIndex],
    correct: selectedIndices[i] === q.correctIndex,
  }))

  const score = answers.filter((a) => a.correct).length
  const passed = score >= 4

  // Record the attempt
  await prisma.ferpaTrainingAttempt.create({
    data: {
      userId,
      score,
      passed,
      answers: toJsonValue(answers),
    },
  })

  // If passed, auto-set ferpaAckAt
  if (passed) {
    await prisma.user.update({
      where: { id: userId },
      data: { ferpaAckAt: new Date() },
    })
    invalidateUserCache(userEmail)
  }

  return { score, passed, answers }
}

// ── Attempt History ──────────────────────────────────────────────────────────

export async function getAttemptHistory(userId: string) {
  return prisma.ferpaTrainingAttempt.findMany({
    where: { userId },
    select: {
      id: true,
      score: true,
      passed: true,
      answers: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
}
