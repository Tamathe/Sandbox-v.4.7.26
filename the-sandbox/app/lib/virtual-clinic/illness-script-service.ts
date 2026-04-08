import { callHaikuJSON } from './ai-config'
import type { IllnessScriptComparison, DifferentialEntry } from './types'

// ─── Illness Script Elements (Bowen, 2006) ──────────────────────────────────

const ILLNESS_SCRIPT_ELEMENTS = [
  'Epidemiology',
  'Pathophysiology',
  'Enabling Conditions',
  'Clinical Features',
  'Distinguishing Features',
  'Course/Prognosis',
] as const

// ─── Build expert model string from case answer key ─────────────────────────

function buildExpertContext(caseAnswerKey: {
  correctDifferentials: unknown
  keyHistoryQuestions: unknown
  criticalActions: unknown
  learningObjectives: string[]
  historyOfPresentIllness: unknown
  patientAge: number
  patientSex: string
  socialHistory: unknown
  familyHistory: unknown
}): string {
  return `
Patient: ${caseAnswerKey.patientAge}-year-old ${caseAnswerKey.patientSex}
HPI: ${JSON.stringify(caseAnswerKey.historyOfPresentIllness)}
Social History: ${JSON.stringify(caseAnswerKey.socialHistory)}
Family History: ${JSON.stringify(caseAnswerKey.familyHistory)}
Correct Differentials: ${JSON.stringify(caseAnswerKey.correctDifferentials)}
Key History Questions: ${JSON.stringify(caseAnswerKey.keyHistoryQuestions)}
Critical Actions: ${JSON.stringify(caseAnswerKey.criticalActions)}
Learning Objectives: ${caseAnswerKey.learningObjectives.join('; ')}
`.trim()
}

// ─── Build student model string from encounter artifacts ─────────────────────

function buildStudentContext(
  studentProblemRep: string | null,
  studentDifferentials: DifferentialEntry[] | null,
  studentPlan: unknown,
): string {
  const parts: string[] = []

  if (studentProblemRep) {
    parts.push(`Problem Representation: ${studentProblemRep}`)
  }

  if (studentDifferentials && studentDifferentials.length > 0) {
    const diffText = studentDifferentials
      .map(
        (d) =>
          `  #${d.rank} ${d.diagnosis} (supports: ${d.supportingFindings.join(', ')}; opposes: ${d.opposingFindings.join(', ')})`,
      )
      .join('\n')
    parts.push(`Differential Diagnosis:\n${diffText}`)
  }

  if (studentPlan) {
    parts.push(`Diagnostic Plan: ${JSON.stringify(studentPlan)}`)
  }

  return parts.length > 0 ? parts.join('\n\n') : 'No clinical reasoning artifacts recorded.'
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function buildIllnessScriptComparison(
  studentProblemRep: string | null,
  studentDifferentials: DifferentialEntry[] | null,
  studentPlan: unknown,
  caseAnswerKey: {
    correctDifferentials: unknown
    keyHistoryQuestions: unknown
    criticalActions: unknown
    learningObjectives: string[]
    historyOfPresentIllness: unknown
    patientAge: number
    patientSex: string
    socialHistory: unknown
    familyHistory: unknown
  },
): Promise<IllnessScriptComparison> {
  const expertContext = buildExpertContext(caseAnswerKey)
  const studentContext = buildStudentContext(studentProblemRep, studentDifferentials, studentPlan)

  const result = await callHaikuJSON<{
    rows: {
      element: string
      studentModel: string
      expertModel: string
      alignment: 'match' | 'partial' | 'gap'
    }[]
    overallAlignment: number
  }>(
    `You are a clinical education expert specializing in illness script theory (Bowen, 2006).
Compare a student's clinical reasoning against an expert model across 6 illness script elements.
Be specific, educational, and concise in each row. Return JSON only.`,
    `## Expert Model (Case Answer Key)
${expertContext}

## Student's Clinical Reasoning
${studentContext}

Analyze each of the 6 illness script elements and return a comparison table as JSON:

{
  "rows": [
    ${ILLNESS_SCRIPT_ELEMENTS.map(
      (el) => `{
      "element": "${el}",
      "studentModel": "what the student demonstrated about this element (or 'Not addressed' if absent)",
      "expertModel": "what the expert/case model shows for this element",
      "alignment": "match|partial|gap"
    }`,
    ).join(',\n    ')}
  ],
  "overallAlignment": <integer 0-100 representing overall illness script alignment>
}

Alignment scoring: "match" = student matches expert; "partial" = student partially addresses the element; "gap" = student did not address or significantly missed the element.`,
  )

  // Validate and sanitize rows
  const validAlignments = new Set<string>(['match', 'partial', 'gap'])
  const rows = ILLNESS_SCRIPT_ELEMENTS.map((element, i) => {
    const raw = result.rows[i] ?? {
      element,
      studentModel: 'Not addressed',
      expertModel: 'See case answer key',
      alignment: 'gap',
    }
    return {
      element,
      studentModel: String(raw.studentModel ?? 'Not addressed'),
      expertModel: String(raw.expertModel ?? 'See case answer key'),
      alignment: (validAlignments.has(raw.alignment) ? raw.alignment : 'gap') as
        | 'match'
        | 'partial'
        | 'gap',
    }
  })

  const overallAlignment = Math.min(100, Math.max(0, Math.round(Number(result.overallAlignment) || 0)))

  return { rows, overallAlignment }
}
