/**
 * scoring-service.ts
 *
 * Parses SCORE markers from Sandy's debrief output and persists drill results.
 */

import { prisma } from '../../prisma'
import type { DrillScores, Difficulty } from './types'

const TOOL_ID = 'tool-crisis-spokesperson-trainer'

/**
 * Extract <!--SCORE:key:N--> markers from text.
 * Returns null if fewer than 4 dimensions found.
 */
export function extractScores(text: string): DrillScores | null {
  const scoreMap: Record<string, number> = {}
  const regex = /<!--SCORE:(\w+):(\d+)-->/g
  let match
  while ((match = regex.exec(text)) !== null) {
    scoreMap[match[1]] = parseInt(match[2], 10)
  }

  const clarity = scoreMap['clarity']
  const empathy = scoreMap['empathy']
  const speculationControl = scoreMap['speculationControl']
  const messageDiscipline = scoreMap['messageDiscipline']

  if (
    clarity === undefined ||
    empathy === undefined ||
    speculationControl === undefined ||
    messageDiscipline === undefined
  ) {
    return null
  }

  return { clarity, empathy, speculationControl, messageDiscipline }
}

/**
 * Save a completed drill to ToolSession + MetricEvent records.
 */
export async function saveDrillResult(params: {
  userId: string
  scenarioTitle: string
  difficulty: Difficulty
  scores: DrillScores
  questionsAnswered: number
  keyMessages?: string[]
}): Promise<string> {
  const { userId, scenarioTitle, difficulty, scores, questionsAnswered, keyMessages } = params
  // Clamp all scores to [1, 10]
  const clamp = (n: number) => Math.max(1, Math.min(10, n))
  const clamped = {
    clarity: clamp(scores.clarity),
    empathy: clamp(scores.empathy),
    speculationControl: clamp(scores.speculationControl),
    messageDiscipline: clamp(scores.messageDiscipline),
  }
  const avg = (clamped.clarity + clamped.empathy + clamped.speculationControl + clamped.messageDiscipline) / 4
  const normalizedScore = avg / 10

  const qualitySignal =
    normalizedScore >= 0.75 ? 'strong' :
    normalizedScore >= 0.5 ? 'partial' :
    normalizedScore >= 0.25 ? 'minimal' : 'incomplete'

  const session = await prisma.toolSession.create({
    data: {
      toolId: TOOL_ID,
      userId,
      endedAt: new Date(),
      score: normalizedScore,
      qualitySignal,
      scoredAt: new Date(),
      exitReason: 'completed',
      status: 'completed',
      notes: JSON.stringify({
        scenarioTitle,
        difficulty,
        scores: clamped,
        questionsAnswered,
        ...(keyMessages && keyMessages.length > 0 ? { keyMessages } : {}),
      }),
      conceptsTouched: ['crisis-comms', 'media-training', scenarioTitle.toLowerCase().replace(/\s+/g, '-')],
    },
  })

  // Batch-create metric events
  await prisma.metricEvent.createMany({
    data: [
      { toolId: TOOL_ID, sessionId: session.id, metricName: 'questions_answered', metricValue: String(questionsAnswered) },
      { toolId: TOOL_ID, sessionId: session.id, metricName: 'debrief_requested', metricValue: 'true' },
      { toolId: TOOL_ID, sessionId: session.id, metricName: 'session_completed', metricValue: 'true' },
    ],
  })

  return session.id
}
