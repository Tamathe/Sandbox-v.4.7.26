import Anthropic from '@anthropic-ai/sdk'
import {
  getRoomAssessmentAccessContext,
  persistRoomEvidenceSeeds,
} from './commons-assessment-service'
import type { TeachbackAssessmentResult } from './types'

const anthropic = new Anthropic()
const TEACHBACK_MODEL = 'claude-haiku-4-5-20251001'

export function buildConfusedLearnerPrompt(
  concept: string,
  courseTitle: string,
  commonMisconceptions: string[]
): string {
  const misconceptions =
    commonMisconceptions.length > 0
      ? commonMisconceptions.map((item) => `"${item}"`).join(', ')
      : 'no major misconceptions provided'

  return `You are Sandy, playing the role of a curious but confused learner in "${courseTitle}".
The student is being assessed on their ability to teach "${concept}" clearly and accurately.

Your job:
1. Start with a sincere "I don't get it" question.
2. Ask pointed follow-up questions when the explanation is shallow or unclear.
3. Surface common misconceptions naturally: ${misconceptions}.
4. Stay warm, encouraging, and curious while still probing for real understanding.
5. Wrap up once the student has either demonstrated mastery or clearly hit their limit.

After each student message, internally evaluate clarity, depth, engagement, and accuracy on a 1-5 scale.
Use those dimensions to guide your follow-up pressure, but do not reveal the scores to the student.`
}

function roundTenths(value: number): number {
  return Math.round(Math.max(0, value) * 10) / 10
}

function roundUnit(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000
}

function fallbackTeachbackScore(input: {
  concept: string
  explanation: string
}): TeachbackAssessmentResult {
  const wordCount = input.explanation.split(/\s+/).filter(Boolean).length
  const connectiveSignals =
    (input.explanation.match(/\b(because|for example|which means|so that|therefore|however)\b/gi) ?? [])
      .length
  const engagementSignals =
    (input.explanation.match(/\b(imagine|think of|let's say|you can see|picture this)\b/gi) ?? [])
      .length
  const accuracySignals =
    (input.explanation.match(/\b(step|process|cause|effect|system|evidence)\b/gi) ?? [])
      .length

  const clarity = roundTenths(2.4 + Math.min(2.2, wordCount / 60))
  const depth = roundTenths(2.0 + Math.min(2.6, connectiveSignals * 0.6))
  const engagement = roundTenths(2.1 + Math.min(2.4, engagementSignals * 0.8))
  const accuracy = roundTenths(2.2 + Math.min(2.3, accuracySignals * 0.45))
  const composite = roundTenths((clarity + depth + engagement + accuracy) / 4)

  return {
    userId: '',
    name: '',
    concept: input.concept,
    explanation: input.explanation,
    clarity,
    depth,
    engagement,
    accuracy,
    composite,
    feedback:
      composite >= 4
        ? 'The explanation was clear and well-structured, with strong conceptual support. Keep pushing toward even more concrete examples when the learner gets stuck.'
        : 'The explanation showed a useful foundation, but it would be stronger with clearer examples, more explicit causal steps, and tighter checks for misunderstanding.',
  }
}

export async function scoreTeachbackExplanation(input: {
  userId: string
  name: string
  concept: string
  explanation: string
  courseTitle: string
  commonMisconceptions: string[]
}): Promise<TeachbackAssessmentResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ...fallbackTeachbackScore({
        concept: input.concept,
        explanation: input.explanation,
      }),
      userId: input.userId,
      name: input.name,
    }
  }

  try {
    const response = await anthropic.messages.create({
      model: TEACHBACK_MODEL,
      max_tokens: 700,
      messages: [
        {
          role: 'user',
          content: `A student in "${input.courseTitle}" just tried to teach the concept "${input.concept}".

Common misconceptions to watch for:
${input.commonMisconceptions.length > 0 ? input.commonMisconceptions.map((item) => `- ${item}`).join('\n') : '- None provided'}

Student explanation:
${input.explanation}

Score four dimensions on a 1.0-5.0 scale:
- clarity
- depth
- engagement
- accuracy

Then compute the composite as the average of those four dimensions.

Return JSON only:
{"clarity":4.2,"depth":3.8,"engagement":4.0,"accuracy":4.1,"composite":4.0,"feedback":"2-3 specific, constructive sentences"}`,
        },
      ],
    })

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim()

    const jsonText = text.match(/\{[\s\S]*\}/)?.[0]
    if (!jsonText) {
      throw new Error('No JSON object found in teach-back scoring response')
    }

    const parsed = JSON.parse(jsonText) as {
      clarity?: number
      depth?: number
      engagement?: number
      accuracy?: number
      composite?: number
      feedback?: unknown
    }

    return {
      userId: input.userId,
      name: input.name,
      concept: input.concept,
      explanation: input.explanation,
      clarity: roundTenths(parsed.clarity ?? 0),
      depth: roundTenths(parsed.depth ?? 0),
      engagement: roundTenths(parsed.engagement ?? 0),
      accuracy: roundTenths(parsed.accuracy ?? 0),
      composite: roundTenths(
        parsed.composite ??
          ((parsed.clarity ?? 0) +
            (parsed.depth ?? 0) +
            (parsed.engagement ?? 0) +
            (parsed.accuracy ?? 0)) /
            4
      ),
      feedback:
        typeof parsed.feedback === 'string' && parsed.feedback.trim().length > 0
          ? parsed.feedback.trim()
          : 'Teach-back assessment completed.',
    }
  } catch (error) {
    console.error('[teachback-assessment] AI scoring failed:', error)
    return {
      ...fallbackTeachbackScore({
        concept: input.concept,
        explanation: input.explanation,
      }),
      userId: input.userId,
      name: input.name,
    }
  }
}

export async function getStoredTeachbackAssessmentResults(
  roomId: string
): Promise<TeachbackAssessmentResult[]> {
  const room = await getRoomAssessmentAccessContext(roomId)
  if (!room) {
    throw new Error('Room not found')
  }

  const raw = room.config.assessmentResults as { participants?: TeachbackAssessmentResult[] } | undefined
  return Array.isArray(raw?.participants) ? raw.participants : []
}

export async function scoreTeachback(
  roomId: string,
  participantId: string
): Promise<TeachbackAssessmentResult | null> {
  const results = await getStoredTeachbackAssessmentResults(roomId)
  return results.find((result) => result.userId === participantId) ?? null
}

export async function persistTeachbackAssessment(roomId: string): Promise<void> {
  const room = await getRoomAssessmentAccessContext(roomId)
  if (!room?.assessmentMode || !room.assignment) return

  const results = await getStoredTeachbackAssessmentResults(roomId)
  if (results.length === 0) return

  await persistRoomEvidenceSeeds(
    roomId,
    results.map((result) => ({
      userId: result.userId,
      evidenceType: 'TEACHBACK_SESSION' as const,
      sourceId: roomId,
      sourceLabel: `Teach-Back Assessment: ${room.title}`,
      summaryText: [
        `[Commons assessment] ${room.title}`,
        `Mode: Teach-back assessment`,
        `Concept: ${result.concept}`,
        `Student explanation: ${result.explanation}`,
        `Composite: ${result.composite}/5`,
      ].join('\n'),
      aiProcessScore: roundUnit(result.composite / 5),
      aiCoherenceScore: roundUnit(result.clarity / 5),
      aiDepthScore: roundUnit(result.depth / 5),
      aiScoringRationale: `${result.feedback}\n\nClarity ${result.clarity}/5 · Depth ${result.depth}/5 · Engagement ${result.engagement}/5 · Accuracy ${result.accuracy}/5`,
    }))
  )
}
