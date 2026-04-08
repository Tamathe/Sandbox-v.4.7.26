import { prisma } from '../prisma'
import { Prisma } from '../../generated/prisma'
import { getEncounter } from './encounter-service'
import { classifyTranscriptDomains } from './semantic-classifier'
import { buildIllnessScriptComparison } from './illness-script-service'
import { analyzeNearMisses } from './near-miss-service'
import { extractKeyMoments } from './key-moments-service'
import { evaluateLearningObjectives } from './learning-objective-service'
import { analyzeQuestionStrategy } from './question-strategy-service'
import { analyzeClinicalReasoning } from './clinical-reasoning-service'
import { callHaikuJSON, AIParseError } from './ai-config'
import { stripMarkers } from './marker-utils'
import type {
  CompetencyLevel,
  DomainScore,
  EncounterScores,
  CognitiveBias,
  CommunicationSubScores,
  DifferentialEntry,
  DiagnosticPlanInput,
  ScoringRubric,
  TranscriptMessage,
  TeachingPoint,
  IllnessScriptComparison,
  NearMissAnalysis,
  KeyMoment,
  LearningObjectiveAlignment,
  QuestionStrategyAnalysis,
  ClinicalReasoningProcess,
} from './types'

// ─── Thresholds ─────────────────────────────────────────────────────────────

function scoreToLevel(score: number): CompetencyLevel {
  if (score < 0.4) return 'NOVICE'
  if (score < 0.6) return 'DEVELOPING'
  if (score < 0.7) return 'COMPETENT'
  return 'PROFICIENT'
}

function overallToLevel(score: number): CompetencyLevel {
  if (score < 50) return 'NOVICE'
  if (score < 65) return 'DEVELOPING'
  if (score < 80) return 'COMPETENT'
  return 'PROFICIENT'
}

// callHaikuJSON and AIParseError imported from ./ai-config

// ─── Teaching Point Extractors ──────────────────────────────────────────────

interface HistoryKeyItem { question?: string; domain?: string; criticalInfo?: string }
interface ExamKeyItem { maneuver?: string; expectedFinding?: string; significance?: string }

async function extractHistoryTeachingPoints(
  raw: unknown[],
  missedLabels: string[],
): Promise<TeachingPoint[]> {
  if (missedLabels.length === 0) return []

  // Try structured extraction first — keyHistoryQuestions objects have { domain, criticalInfo }
  const structured = raw.filter((e): e is HistoryKeyItem => typeof e === 'object' && e !== null && 'criticalInfo' in e)

  if (structured.length > 0) {
    const points: TeachingPoint[] = []
    for (const label of missedLabels) {
      const match = structured.find((s) => {
        const key = s.domain ?? s.question ?? ''
        return key.toLowerCase().includes(label.toLowerCase()) || label.toLowerCase().includes(key.toLowerCase())
      })
      if (match?.criticalInfo) {
        points.push({ missed: match.question ?? match.domain ?? label, reason: match.criticalInfo })
      }
    }
    if (points.length > 0) return points
  }

  // Fallback: batch Haiku call for cases without per-item explanations
  return callHaikuJSON<TeachingPoint[]>(
    'You are a clinical education assistant. For each missed history domain, explain why it matters in 1 sentence. Return a JSON array of { "missed": "domain name", "reason": "why it matters" }.',
    `Missed history domains: ${missedLabels.join(', ')}`,
  )
}

async function extractExamTeachingPoints(
  raw: unknown[],
  missedLabels: string[],
): Promise<TeachingPoint[]> {
  if (missedLabels.length === 0) return []

  // Try structured extraction — keyExamManeuvers objects have { maneuver, significance }
  const structured = raw.filter((e): e is ExamKeyItem => typeof e === 'object' && e !== null && 'significance' in e)

  if (structured.length > 0) {
    const points: TeachingPoint[] = []
    for (const label of missedLabels) {
      const match = structured.find((s) => {
        const key = s.maneuver ?? ''
        return key.toLowerCase().includes(label.toLowerCase()) || label.toLowerCase().includes(key.toLowerCase())
      })
      if (match?.significance) {
        points.push({ missed: match.maneuver ?? label, reason: match.significance })
      }
    }
    if (points.length > 0) return points
  }

  // Fallback: batch Haiku call
  return callHaikuJSON<TeachingPoint[]>(
    'You are a clinical education assistant. For each missed physical exam maneuver, explain why it matters in 1 sentence. Return a JSON array of { "missed": "maneuver name", "reason": "why it matters" }.',
    `Missed exam maneuvers: ${missedLabels.join(', ')}`,
  )
}

// ─── Domain Scorers ─────────────────────────────────────────────────────────

async function scoreHistory(
  domainsHit: Record<string, boolean>,
  keyHistoryQuestions: unknown,
): Promise<DomainScore> {
  // keyHistoryQuestions may be an array of strings OR an array of { question, domain, criticalInfo } objects
  const raw = Array.isArray(keyHistoryQuestions) ? keyHistoryQuestions : Object.entries((keyHistoryQuestions as Record<string, unknown>) ?? {}).map(([k]) => k)
  const expected = raw.map((e) => (typeof e === 'string' ? e : (e as Record<string, string>).domain ?? (e as Record<string, string>).question ?? String(e)))

  if (expected.length === 0) {
    return { score: 100, level: 'PROFICIENT', feedback: 'No history domains specified in answer key.', keyFindings: [] }
  }

  const hitKeys = Object.keys(domainsHit).filter((k) => domainsHit[k])
  const isHit = (e: string) => hitKeys.some((h) => h.toLowerCase().includes(e.toLowerCase()) || e.toLowerCase().includes(h.toLowerCase()))

  const matched = expected.filter(isHit)
  const missedLabels = expected.filter((e) => !isHit(e))

  const ratio = matched.length / expected.length
  const score = Math.round(ratio * 100)

  const keyFindings: string[] = []
  if (matched.length > 0) keyFindings.push(`Explored: ${matched.join(', ')}`)
  if (missedLabels.length > 0) keyFindings.push(`Missed: ${missedLabels.join(', ')}`)

  // Build teaching points for missed items
  const teachingPoints = await extractHistoryTeachingPoints(raw, missedLabels)

  return {
    score,
    level: scoreToLevel(ratio),
    feedback: `Covered ${matched.length} of ${expected.length} expected history domains.`,
    keyFindings,
    teachingPoints,
  }
}

async function scoreExam(
  maneuversRequested: string[],
  keyExamManeuvers: unknown,
): Promise<DomainScore> {
  const raw = Array.isArray(keyExamManeuvers) ? keyExamManeuvers : Object.entries((keyExamManeuvers as Record<string, unknown>) ?? {}).map(([k]) => k)
  const expected = raw.map((e) => (typeof e === 'string' ? e : (e as Record<string, string>).maneuver ?? String(e)))

  if (expected.length === 0) {
    return { score: 100, level: 'PROFICIENT', feedback: 'No exam maneuvers specified in answer key.', keyFindings: [] }
  }

  const isHit = (e: string) => maneuversRequested.some((m) => m.toLowerCase().includes(e.toLowerCase()) || e.toLowerCase().includes(m.toLowerCase()))

  const matched = expected.filter(isHit)
  const missedLabels = expected.filter((e) => !isHit(e))

  const ratio = matched.length / expected.length
  const score = Math.round(ratio * 100)

  const keyFindings: string[] = []
  if (matched.length > 0) keyFindings.push(`Performed: ${matched.join(', ')}`)
  if (missedLabels.length > 0) keyFindings.push(`Missed: ${missedLabels.join(', ')}`)

  // Build teaching points for missed items
  const teachingPoints = await extractExamTeachingPoints(raw, missedLabels)

  return {
    score,
    level: scoreToLevel(ratio),
    feedback: `Performed ${matched.length} of ${expected.length} expected exam maneuvers.`,
    keyFindings,
    teachingPoints,
  }
}

async function scoreDifferential(
  studentDifferentials: DifferentialEntry[] | null,
  correctDifferentials: unknown,
): Promise<DomainScore> {
  if (!studentDifferentials || studentDifferentials.length === 0) {
    return { score: 0, level: 'NOVICE', feedback: 'No differential diagnosis submitted.', keyFindings: ['No differential list provided'] }
  }

  const result = await callHaikuJSON<{
    correctDiagnosisPresent: boolean
    correctRanking: boolean
    findingsQuality: number
    feedback: string
    keyFindings: string[]
  }>(
    `You are a clinical education scoring engine. Compare the student's differential diagnosis against the correct answer key. Return JSON only.`,
    `## Correct Differentials (answer key)
${JSON.stringify(correctDifferentials, null, 2)}

## Student's Differential List
${JSON.stringify(studentDifferentials, null, 2)}

Score the following and return JSON:
{
  "correctDiagnosisPresent": true/false (is the correct primary diagnosis in the student's list?),
  "correctRanking": true/false (is it ranked #1 or appropriately high?),
  "findingsQuality": 0.0-1.0 (quality of supporting/opposing findings across all entries),
  "feedback": "1-2 sentence summary",
  "keyFindings": ["finding1", "finding2"]
}`,
  )

  const score = Math.round(
    ((result.correctDiagnosisPresent ? 0.4 : 0) +
      (result.correctRanking ? 0.2 : 0) +
      result.findingsQuality * 0.4) *
      100,
  )

  return {
    score,
    level: scoreToLevel(score / 100),
    feedback: result.feedback,
    keyFindings: result.keyFindings,
  }
}

async function scoreDiagnosticPlan(
  studentPlan: DiagnosticPlanInput | null,
  criticalActions: unknown,
): Promise<DomainScore> {
  if (!studentPlan) {
    return { score: 0, level: 'NOVICE', feedback: 'No diagnostic plan submitted.', keyFindings: ['No plan provided'] }
  }

  const result = await callHaikuJSON<{
    labScore: number
    imagingScore: number
    referralScore: number
    feedback: string
    keyFindings: string[]
  }>(
    `You are a clinical education scoring engine. Compare the student's diagnostic plan against the critical actions answer key. Return JSON only.`,
    `## Critical Actions (answer key)
${JSON.stringify(criticalActions, null, 2)}

## Student's Diagnostic Plan
Labs: ${JSON.stringify(studentPlan.labs)}
Imaging: ${JSON.stringify(studentPlan.imaging)}
Referrals: ${JSON.stringify(studentPlan.referrals)}
Follow-up: ${studentPlan.followUp}

Score each category 0.0-1.0 for relevance and completeness:
{
  "labScore": 0.0-1.0,
  "imagingScore": 0.0-1.0,
  "referralScore": 0.0-1.0,
  "feedback": "1-2 sentence summary",
  "keyFindings": ["finding1", "finding2"]
}`,
  )

  const raw = (result.labScore + result.imagingScore + result.referralScore) / 3
  const score = Math.round(raw * 100)

  return {
    score,
    level: scoreToLevel(raw),
    feedback: result.feedback,
    keyFindings: result.keyFindings,
  }
}

async function scoreCommunication(
  transcript: TranscriptMessage[],
): Promise<DomainScore & { subScores: CommunicationSubScores }> {
  const userMessages = transcript.filter((m) => m.role === 'user')
  if (userMessages.length === 0) {
    return {
      score: 0, level: 'NOVICE', feedback: 'No student messages in transcript.', keyFindings: ['Empty transcript'],
      subScores: { empathy: 0, questionQuality: 0, activeListening: 0, patientEducation: 0 },
    }
  }

  const condensed = transcript
    .map((m) => `[${m.role}] ${stripMarkers(m.content)}`)
    .join('\n')

  const result = await callHaikuJSON<{
    empathy: number
    questionQuality: number
    activeListening: number
    patientEducation: number
    feedback: string
    keyFindings: string[]
  }>(
    `You are a clinical communication skills evaluator. Analyze a medical student's communication during a patient encounter. Return JSON only.`,
    `## Transcript (markers stripped)
${condensed}

Score each dimension 0.0-1.0:
{
  "empathy": 0.0-1.0 (warmth, acknowledgment of concerns, emotional validation),
  "questionQuality": 0.0-1.0 (open-ended questions, appropriate follow-ups, logical flow),
  "activeListening": 0.0-1.0 (reflects back, summarizes, clarifies),
  "patientEducation": 0.0-1.0 (explains next steps, uses lay terms, checks understanding),
  "feedback": "1-2 sentence summary of communication strengths and areas for improvement",
  "keyFindings": ["finding1", "finding2"]
}`,
  )

  const avg = (result.empathy + result.questionQuality + result.activeListening + result.patientEducation) / 4
  const score = Math.round(avg * 100)

  return {
    score,
    level: scoreToLevel(avg),
    feedback: result.feedback,
    keyFindings: result.keyFindings,
    subScores: {
      empathy: Math.round(result.empathy * 100),
      questionQuality: Math.round(result.questionQuality * 100),
      activeListening: Math.round(result.activeListening * 100),
      patientEducation: Math.round(result.patientEducation * 100),
    },
  }
}

// ─── Cognitive Bias Detection ───────────────────────────────────────────────

async function detectCognitiveBiases(
  transcript: TranscriptMessage[],
): Promise<CognitiveBias[]> {
  const condensed = transcript
    .map((m) => `[${m.role}] ${stripMarkers(m.content)}`)
    .join('\n')

  const result = await callHaikuJSON<{
    biases: { type: string; evidence: string; suggestion: string }[]
  }>(
    `You are a clinical reasoning bias detector. Analyze the transcript for cognitive biases. Return JSON only. Only flag biases with clear evidence — do not speculate.`,
    `## Transcript
${condensed}

Identify any cognitive biases from this list: ANCHORING, PREMATURE_CLOSURE, AVAILABILITY, CONFIRMATION.

Return:
{
  "biases": [
    {
      "type": "ANCHORING|PREMATURE_CLOSURE|AVAILABILITY|CONFIRMATION",
      "evidence": "quote or description from transcript showing the bias",
      "suggestion": "specific suggestion to overcome this bias"
    }
  ]
}

If no biases are detected, return { "biases": [] }.`,
  )

  const validTypes = new Set(['ANCHORING', 'PREMATURE_CLOSURE', 'AVAILABILITY', 'CONFIRMATION'])
  return result.biases
    .filter((b) => validTypes.has(b.type))
    .map((b) => ({
      type: b.type as CognitiveBias['type'],
      evidence: b.evidence,
      suggestion: b.suggestion,
    }))
}

// ─── Feedback Narrative ─────────────────────────────────────────────────────

async function generateFeedbackNarrative(
  scores: EncounterScores,
  overallScore: number,
  overallLevel: CompetencyLevel,
  biases: CognitiveBias[],
): Promise<string> {
  const result = await callHaikuJSON<{ narrative: string }>(
    `You are a supportive clinical education mentor. Write a 2-3 paragraph performance summary for a medical student. Be encouraging but honest. Return JSON only.`,
    `## Scores
- History: ${scores.history.score}/100 (${scores.history.level}) — ${scores.history.feedback}
- Exam: ${scores.exam.score}/100 (${scores.exam.level}) — ${scores.exam.feedback}
- Differential: ${scores.differential.score}/100 (${scores.differential.level}) — ${scores.differential.feedback}
- Plan: ${scores.plan.score}/100 (${scores.plan.level}) — ${scores.plan.feedback}
- Communication: ${scores.communication.score}/100 (${scores.communication.level}) — ${scores.communication.feedback}
- Overall: ${overallScore}/100 (${overallLevel})
- Cognitive Biases: ${biases.length > 0 ? biases.map((b) => `${b.type}: ${b.evidence}`).join('; ') : 'None detected'}

Return: { "narrative": "2-3 paragraph summary" }`,
  )

  return result.narrative
}

// ─── Main Scoring Function ──────────────────────────────────────────────────

export async function scoreEncounter(encounterId: string) {
  const encounter = await getEncounter(encounterId)
  const clinicalCase = encounter.clinicalCase

  // Validate phase — must be at DIAGNOSTIC_PLAN or later
  const scorablePhases = ['DIAGNOSTIC_PLAN', 'FEEDBACK', 'COMPLETED']
  if (!scorablePhases.includes(encounter.phase)) {
    throw Object.assign(
      new Error('Encounter must reach DIAGNOSTIC_PLAN phase before scoring'),
      { status: 400 },
    )
  }

  // Already scored?
  if (encounter.overallScore !== null) {
    throw Object.assign(new Error('Encounter has already been scored'), { status: 400 })
  }

  const transcript = (encounter.transcript ?? []) as unknown as TranscriptMessage[]
  const domainsHit = (encounter.historyDomainsHit ?? {}) as unknown as Record<string, boolean>
  const rubric = clinicalCase.scoringRubric as unknown as ScoringRubric

  // 1. Semantic domain classification (replaces marker-based tracking)
  const { domainsHit: semanticDomains } = await classifyTranscriptDomains(transcript)
  // Merge: semantic classification takes precedence, marker-based as fallback
  const mergedDomains = { ...domainsHit, ...semanticDomains }

  // 2-11. All scoring in parallel (history + exam now async for teaching point extraction)
  const [historyScore, examScore, differentialScore, planScore, communicationScore, biases, illnessScript, nearMisses, keyMoments, learningObjectives, questionStrategy, clinicalReasoning] = await Promise.all([
    scoreHistory(mergedDomains, clinicalCase.keyHistoryQuestions),
    scoreExam(encounter.examManeuversRequested, clinicalCase.keyExamManeuvers),
    scoreDifferential(
      encounter.differentialDiagnosis as DifferentialEntry[] | null,
      clinicalCase.correctDifferentials,
    ),
    scoreDiagnosticPlan(
      encounter.diagnosticPlan as DiagnosticPlanInput | null,
      clinicalCase.criticalActions,
    ),
    scoreCommunication(transcript),
    detectCognitiveBiases(transcript),
    buildIllnessScriptComparison(
      encounter.problemRepresentation,
      encounter.differentialDiagnosis as DifferentialEntry[] | null,
      encounter.diagnosticPlan,
      {
        correctDifferentials: clinicalCase.correctDifferentials,
        keyHistoryQuestions: clinicalCase.keyHistoryQuestions,
        criticalActions: clinicalCase.criticalActions,
        learningObjectives: clinicalCase.learningObjectives,
        historyOfPresentIllness: clinicalCase.historyOfPresentIllness,
        patientAge: clinicalCase.patientAge,
        patientSex: clinicalCase.patientSex,
        socialHistory: clinicalCase.socialHistory,
        familyHistory: clinicalCase.familyHistory,
      },
    ),
    analyzeNearMisses(
      encounter.differentialDiagnosis as DifferentialEntry[] | null,
      clinicalCase.correctDifferentials,
      clinicalCase.historyOfPresentIllness,
    ),
    extractKeyMoments(transcript, clinicalCase.correctDifferentials, clinicalCase.keyHistoryQuestions),
    evaluateLearningObjectives(
      clinicalCase.learningObjectives,
      transcript,
      encounter.problemRepresentation,
      encounter.differentialDiagnosis as DifferentialEntry[] | null,
      encounter.diagnosticPlan as DiagnosticPlanInput | null,
    ),
    analyzeQuestionStrategy(transcript),
    analyzeClinicalReasoning(
      transcript,
      encounter.problemRepresentation,
      encounter.differentialDiagnosis as DifferentialEntry[] | null,
      encounter.diagnosticPlan as DiagnosticPlanInput | null,
      clinicalCase.correctDifferentials,
    ),
  ])

  // 7. Combine scores
  const scores: EncounterScores = {
    history: historyScore,
    exam: examScore,
    differential: differentialScore,
    plan: planScore,
    communication: communicationScore,
  }

  // 8. Weighted overall score
  const overallScore = Math.round(
    scores.history.score * rubric.historyWeight +
    scores.exam.score * rubric.examWeight +
    scores.differential.score * rubric.differentialWeight +
    scores.plan.score * rubric.planWeight +
    scores.communication.score * rubric.communicationWeight,
  )

  const overallLevel = overallToLevel(overallScore)

  // 9. Feedback narrative
  const feedbackNarrative = await generateFeedbackNarrative(scores, overallScore, overallLevel, biases)

  // 10. Persist (include illness script + near-miss + self-assessment + phase timing in scores JSON)
  // Preserve metadata from historyDomainsHit that should survive scoring
  const existingMeta = (encounter.historyDomainsHit ?? {}) as Record<string, unknown>
  const selfAssessment = existingMeta.__selfAssessment ?? null
  const phaseTimestamps = existingMeta.__phaseTimestamps ?? null

  const updated = await prisma.clinicalEncounter.update({
    where: { id: encounterId },
    data: {
      scores: {
        ...scores,
        illnessScript,
        nearMisses,
        keyMoments,
        learningObjectives,
        questionStrategy,
        clinicalReasoning,
        ...(selfAssessment ? { selfAssessment } : {}),
        ...(phaseTimestamps ? { phaseTimestamps } : {}),
      } as unknown as Prisma.InputJsonValue,
      overallScore,
      overallLevel,
      cognitiveBiases: biases as unknown as Prisma.InputJsonValue,
      feedbackNarrative,
      // Update domain tracking with semantic classification results (preserve metadata)
      historyDomainsHit: {
        ...mergedDomains,
        ...(selfAssessment ? { __selfAssessment: selfAssessment } : {}),
        ...(phaseTimestamps ? { __phaseTimestamps: phaseTimestamps } : {}),
      } as Prisma.InputJsonValue,
    },
    include: { clinicalCase: true },
  })

  return updated
}
