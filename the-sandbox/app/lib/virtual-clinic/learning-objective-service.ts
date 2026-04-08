import { callHaikuJSON } from './ai-config'
import { stripMarkers } from './marker-utils'
import type {
  LearningObjectiveAlignment,
  LearningObjectiveResult,
  TranscriptMessage,
  DifferentialEntry,
  DiagnosticPlanInput,
} from './types'

/**
 * Maps student performance against the case's learning objectives.
 * Uses the full encounter context (transcript, problem rep, differential,
 * plan) to determine which objectives were demonstrated.
 */
export async function evaluateLearningObjectives(
  learningObjectives: string[],
  transcript: TranscriptMessage[],
  problemRepresentation: string | null,
  differentials: DifferentialEntry[] | null,
  diagnosticPlan: DiagnosticPlanInput | null,
): Promise<LearningObjectiveAlignment> {
  if (learningObjectives.length === 0) {
    return { results: [], metCount: 0, totalCount: 0 }
  }

  const condensedTranscript = transcript
    .filter((m) => m.role === 'user')
    .map((m) => stripMarkers(m.content))
    .join('\n')

  const parsed = await callHaikuJSON<{ results: LearningObjectiveResult[] }>(
    'You are a clinical education assessment engine. Evaluate whether a student demonstrated each learning objective during a clinical encounter. Return JSON only.',
    `## Learning Objectives
${learningObjectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}

## Student's Work
Problem Representation: ${problemRepresentation ?? '(not submitted)'}
Differential Diagnosis: ${JSON.stringify(differentials ?? [])}
Diagnostic Plan: ${JSON.stringify(diagnosticPlan ?? {})}

## Student Questions (condensed)
${condensedTranscript || '(no questions asked)'}

For each learning objective, determine whether the student demonstrated it.

Return JSON:
{
  "results": [
    {
      "objective": "the learning objective text",
      "status": "met|partially_met|not_demonstrated",
      "evidence": "1 sentence citing specific student behavior or artifact that supports this judgment"
    }
  ]
}

Rules:
- "met" = clear evidence the student achieved this objective
- "partially_met" = some relevant behavior but incomplete or superficial
- "not_demonstrated" = no evidence in the student's work
- Evidence must reference specific questions, differential entries, or plan items
- Keep evidence under 2 sentences`,
  )

  const validStatuses = new Set(['met', 'partially_met', 'not_demonstrated'])
  const results = parsed.results
    .filter((r) => validStatuses.has(r.status))
    .slice(0, learningObjectives.length)

  const metCount = results.filter((r) => r.status === 'met').length

  return {
    results,
    metCount,
    totalCount: learningObjectives.length,
  }
}
