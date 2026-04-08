import { callHaikuJSON } from './ai-config'
import { stripMarkers } from './marker-utils'
import type { TranscriptMessage, KeyMoment, KeyMomentType } from './types'

const VALID_TYPES = new Set<KeyMomentType>([
  'breakthrough_question',
  'missed_red_flag',
  'rapport_building',
  'premature_closure',
  'systematic_approach',
  'critical_finding',
])

const VALID_IMPACTS = new Set(['positive', 'negative', 'neutral'])

export async function extractKeyMoments(
  transcript: TranscriptMessage[],
  correctDifferentials: unknown,
  keyHistoryQuestions: unknown,
): Promise<KeyMoment[]> {
  if (transcript.length < 4) return []

  const indexedTranscript = transcript
    .map((m, i) => `[${i}] [${m.role}] ${stripMarkers(m.content)}`)
    .join('\n')

  const parsed = await callHaikuJSON<{ moments: KeyMoment[] }>(
    `You are a clinical education analyst. Identify 3-5 pivotal moments in a student-patient encounter transcript. Each moment should be anchored to a specific transcript message index. Return JSON only.`,
    `## Transcript (indexed)
${indexedTranscript}

## Case Answer Key
Correct differentials: ${JSON.stringify(correctDifferentials)}
Key history questions: ${JSON.stringify(keyHistoryQuestions)}

Identify 3-5 KEY MOMENTS from the transcript. Types:
- breakthrough_question: Student asked a particularly insightful or pivotal question
- missed_red_flag: Patient mentioned something important that student didn't follow up on
- rapport_building: Student showed empathy, validation, or built trust effectively
- premature_closure: Student jumped to conclusions or stopped exploring too early
- systematic_approach: Student demonstrated organized, methodical clinical reasoning
- critical_finding: Student uncovered a key piece of diagnostic information

Return JSON:
{
  "moments": [
    {
      "type": "breakthrough_question|missed_red_flag|rapport_building|premature_closure|systematic_approach|critical_finding",
      "transcriptIndex": 0,
      "quote": "brief excerpt from the message",
      "explanation": "1-2 sentences explaining why this moment matters clinically",
      "impact": "positive|negative|neutral"
    }
  ]
}

Only include moments with clear evidence. Quality over quantity.`,
  )

  // Validate and sanitize
  return parsed.moments
    .filter((m) =>
      VALID_TYPES.has(m.type) &&
      VALID_IMPACTS.has(m.impact) &&
      typeof m.transcriptIndex === 'number' &&
      m.transcriptIndex >= 0 &&
      m.transcriptIndex < transcript.length &&
      typeof m.quote === 'string' &&
      typeof m.explanation === 'string',
    )
    .slice(0, 5)
}
