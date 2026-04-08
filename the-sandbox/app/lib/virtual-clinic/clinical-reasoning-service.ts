import { callHaikuJSON } from './ai-config'
import { stripMarkers } from './marker-utils'
import type {
  ClinicalReasoningProcess,
  TranscriptMessage,
  DifferentialEntry,
  DiagnosticPlanInput,
  ReasoningPivot,
  ReasoningTrajectory,
} from './types'

/**
 * Analyzes how the student's diagnostic reasoning evolved across the encounter.
 * Traces hypothesis formation, refinement, and abandonment through transcript phases.
 * Classifies the overall reasoning trajectory and identifies key diagnostic pivots.
 */
export async function analyzeClinicalReasoning(
  transcript: TranscriptMessage[],
  problemRepresentation: string | null,
  studentDifferentials: DifferentialEntry[] | null,
  studentPlan: DiagnosticPlanInput | null,
  correctDifferentials: unknown,
): Promise<ClinicalReasoningProcess> {
  const studentMessages = transcript.filter((m) => m.role === 'user')
  if (studentMessages.length < 3) {
    return {
      trajectory: 'linear',
      trajectoryDescription: 'Too few student messages to analyze reasoning trajectory.',
      pivots: [],
      hypothesisEvolution: [],
      efficiencyScore: 50,
      efficiencyExplanation: 'Insufficient data for efficiency analysis.',
    }
  }

  const condensed = transcript
    .map((m, i) => `[${i}][${m.role}][${m.phase}] ${stripMarkers(m.content)}`)
    .join('\n')

  const parsed = await callHaikuJSON<{
    trajectory: string
    trajectoryDescription: string
    pivots: { phase: string; transcriptIndex: number; hypothesis: string; trigger: string; outcome: string }[]
    hypothesisEvolution: string[]
    efficiencyScore: number
    efficiencyExplanation: string
  }>(
    `You are a clinical reasoning analyst for medical education. Analyze how a student's diagnostic thinking evolved during a patient encounter. Focus on hypothesis-driven reasoning patterns. Return JSON only.`,
    `## Transcript (indexed, with phases)
${condensed}

## Student Artifacts
Problem Representation: ${problemRepresentation ?? '(not submitted)'}
Differential: ${JSON.stringify(studentDifferentials ?? [])}
Diagnostic Plan: ${JSON.stringify(studentPlan ?? {})}

## Correct Differentials (answer key)
${JSON.stringify(correctDifferentials, null, 2)}

Analyze the student's clinical reasoning PROCESS (not just outcomes). Return JSON:
{
  "trajectory": "convergent|divergent|scattered|linear",
  "trajectoryDescription": "1-2 sentence description of how their reasoning evolved. convergent = systematically narrowed from broad to specific, divergent = appropriately expanded when initial hypothesis was wrong, scattered = jumped between unrelated hypotheses without systematic narrowing, linear = followed a single hypothesis without considering alternatives",
  "pivots": [
    {
      "phase": "HISTORY_TAKING|PROBLEM_REPRESENTATION|DIFFERENTIAL_DIAGNOSIS|PHYSICAL_EXAM|DIAGNOSTIC_PLAN",
      "transcriptIndex": 0,
      "hypothesis": "what they seemed to be thinking at this point",
      "trigger": "what caused the shift (a patient answer, an exam finding, etc.)",
      "outcome": "refined|abandoned|confirmed"
    }
  ],
  "hypothesisEvolution": [
    "Step 1: Brief description of initial thinking",
    "Step 2: How it shifted",
    "Step 3: Final diagnostic direction"
  ],
  "efficiencyScore": 0-100,
  "efficiencyExplanation": "1-2 sentences on how efficiently they reached the correct diagnosis. Did they ask targeted questions or scatter-shot? Did they narrow systematically or get stuck?"
}

Rules:
- pivots: 2-5 most significant reasoning shifts. Use actual transcriptIndex values from the transcript.
- hypothesisEvolution: 3-5 steps showing the arc of reasoning.
- efficiencyScore: 80-100 = direct path with minimal wasted questions; 60-79 = reasonable but some tangents; 40-59 = significant inefficiency; 0-39 = no clear reasoning strategy.`,
  )

  const validTrajectories = new Set<ReasoningTrajectory>(['convergent', 'divergent', 'scattered', 'linear'])
  const validOutcomes = new Set(['refined', 'abandoned', 'confirmed'])

  return {
    trajectory: validTrajectories.has(parsed.trajectory as ReasoningTrajectory)
      ? parsed.trajectory as ReasoningTrajectory
      : 'linear',
    trajectoryDescription: parsed.trajectoryDescription,
    pivots: parsed.pivots
      .filter((p) => validOutcomes.has(p.outcome))
      .map((p): ReasoningPivot => ({
        phase: p.phase as ReasoningPivot['phase'],
        transcriptIndex: p.transcriptIndex,
        hypothesis: p.hypothesis,
        trigger: p.trigger,
        outcome: p.outcome as ReasoningPivot['outcome'],
      })),
    hypothesisEvolution: parsed.hypothesisEvolution,
    efficiencyScore: Math.max(0, Math.min(100, Math.round(parsed.efficiencyScore))),
    efficiencyExplanation: parsed.efficiencyExplanation,
  }
}
