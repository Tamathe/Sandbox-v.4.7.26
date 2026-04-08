import { callHaikuJSON } from './ai-config'
import type { NearMissAnalysis, DifferentialEntry } from './types'

// ─── Near-Miss Differential Analysis ────────────────────────────────────────

export async function analyzeNearMisses(
  studentDifferentials: DifferentialEntry[] | null,
  correctDifferentials: unknown,
  historyOfPresentIllness: unknown,
): Promise<NearMissAnalysis> {
  if (!studentDifferentials || studentDifferentials.length === 0) {
    return { entries: [], primaryDiagnosisCorrect: false }
  }

  return callHaikuJSON<NearMissAnalysis>(
    `You are a clinical education expert specializing in differential diagnosis feedback. \
Your task is to compare a student's differential diagnosis list against the correct answer key and \
provide specific, case-grounded teaching points. Return JSON only — no markdown prose outside the JSON block.`,
    `## History of Present Illness
${JSON.stringify(historyOfPresentIllness, null, 2)}

## Correct Differentials (answer key)
${JSON.stringify(correctDifferentials, null, 2)}

## Student's Differential List
${JSON.stringify(studentDifferentials, null, 2)}

Analyze the student's differential against the answer key. For each diagnosis in the answer key, \
determine how the student handled it. Also note any extraneous diagnoses the student included \
that are not in the answer key.

Classify each entry with one of these statuses:
- "correct" — diagnosis is present AND appropriately ranked (within 1-2 positions of expected rank)
- "present-but-misranked" — diagnosis is present but ranked significantly higher or lower than appropriate
- "missing" — diagnosis from the answer key was not included by the student
- "extraneous" — student included a diagnosis not in the answer key (only flag if clearly inappropriate given the HPI)

Return a JSON object:
\`\`\`json
{
  "entries": [
    {
      "diagnosis": "exact diagnosis name",
      "status": "correct|present-but-misranked|missing|extraneous",
      "explanation": "1-2 sentences explaining WHY this status was assigned, referencing specific case details from the HPI",
      "teachingPoint": "1-2 sentences of case-specific teaching (not generic advice), e.g. what clinical feature distinguishes this diagnosis or why ranking matters here"
    }
  ],
  "primaryDiagnosisCorrect": true
}
\`\`\`

Rules:
- Cover every diagnosis in the answer key (missing or otherwise)
- Include any clearly extraneous student entries
- Keep explanations tied to THIS case's clinical details — never give generic advice
- "primaryDiagnosisCorrect" is true only if the top-ranked correct diagnosis from the answer key appears as rank #1 in the student's list`,
  )
}
