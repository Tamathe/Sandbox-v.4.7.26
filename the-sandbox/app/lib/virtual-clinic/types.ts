// ─── Virtual Clinic — TypeScript Types ──────────────────────────────────────

export type EncounterPhase =
  | 'OPENING'
  | 'HISTORY_TAKING'
  | 'PROBLEM_REPRESENTATION'
  | 'DIFFERENTIAL_DIAGNOSIS'
  | 'PHYSICAL_EXAM'
  | 'DIAGNOSTIC_PLAN'
  | 'FEEDBACK'
  | 'COMPLETED'

export type CaseDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'

export type ClinicalProgram = 'DNP_PSYCHIATRY' | 'COLLEGE_OF_MEDICINE'

export type CompetencyLevel = 'NOVICE' | 'DEVELOPING' | 'COMPETENT' | 'PROFICIENT'

export interface ScoringRubric {
  historyWeight: number
  examWeight: number
  differentialWeight: number
  planWeight: number
  communicationWeight: number
}

export interface DifferentialEntry {
  rank: number
  diagnosis: string
  supportingFindings: string[]
  opposingFindings: string[]
}

export interface DiagnosticPlanInput {
  labs: string[]
  imaging: string[]
  referrals: string[]
  followUp: string
}

export interface TranscriptMessage {
  role: 'user' | 'assistant'
  content: string
  phase: EncounterPhase
  timestamp: string
}

export interface TeachingPoint {
  missed: string
  reason: string
}

export interface DomainScore {
  score: number
  level: CompetencyLevel
  feedback: string
  keyFindings: string[]
  teachingPoints?: TeachingPoint[]
}

export interface EncounterScores {
  history: DomainScore
  exam: DomainScore
  differential: DomainScore
  plan: DomainScore
  communication: DomainScore
}

export interface CognitiveBias {
  type: 'ANCHORING' | 'PREMATURE_CLOSURE' | 'AVAILABILITY' | 'CONFIRMATION'
  evidence: string
  suggestion: string
}

export interface ClinicalCaseInput {
  title: string
  chiefComplaint: string
  program?: ClinicalProgram
  difficulty: CaseDifficulty
  targetYear?: number | null
  organSystems: string[]
  learningObjectives: string[]
  tags: string[]

  patientName: string
  patientAge: number
  patientSex: string
  patientPronouns?: string | null
  personalityNotes?: string | null

  historyOfPresentIllness: unknown
  pastMedicalHistory: unknown
  medications: unknown
  allergies: unknown
  socialHistory: unknown
  familyHistory: unknown
  reviewOfSystems: unknown

  physicalExamFindings: unknown
  vitalSigns: unknown
  defaultNormalFindings?: unknown | null

  availableLabs: unknown
  availableImaging: unknown

  correctDifferentials: unknown
  keyHistoryQuestions: unknown
  keyExamManeuvers: unknown
  criticalActions: unknown
  scoringRubric: ScoringRubric

  scaffoldingLevel?: ScaffoldingLevel

  published?: boolean
  courseId?: string | null
}

// ─── Illness Script Comparison ─────────────────────────────────────────────

export interface IllnessScriptRow {
  element: string
  studentModel: string
  expertModel: string
  alignment: 'match' | 'partial' | 'gap'
}

export interface IllnessScriptComparison {
  rows: IllnessScriptRow[]
  overallAlignment: number // 0-100
}

// ─── Near-Miss Differential Analysis ───────────────────────────────────────

export interface NearMissEntry {
  diagnosis: string
  status: 'correct' | 'present-but-misranked' | 'missing' | 'extraneous'
  explanation: string
  teachingPoint: string
}

export interface NearMissAnalysis {
  entries: NearMissEntry[]
  primaryDiagnosisCorrect: boolean
}

// ─── Scaffolding ───────────────────────────────────────────────────────────

export type ScaffoldingLevel = 'none' | 'light' | 'full'

export interface ScaffoldingPrompt {
  message: string
  type: 'metacognitive' | 'domain-hint'
}

// ─── Patient Affect ────────────────────────────────────────────────────────

export interface AffectState {
  engagementLevel: number // 0-100
  lastDelta: number       // positive = warming, negative = closing
  reason: string          // brief explanation
}

// ─── Semantic Domain Classification ────────────────────────────────────────

export interface DomainClassification {
  question: string
  domains: string[]
  confidence: number // 0-1
}

// ─── Communication Sub-Scores ─────────────────────────────────────────────

export interface CommunicationSubScores {
  empathy: number         // 0-100
  questionQuality: number // 0-100
  activeListening: number // 0-100
  patientEducation: number // 0-100
}

// ─── Phase Timing ────────────────────────────────────────────────────────

export interface PhaseTimingData {
  /** ISO timestamp of when each phase was entered */
  phaseEnteredAt: Partial<Record<EncounterPhase, string>>
}

// ─── Self-Assessment Calibration ─────────────────────────────────────────

export interface SelfAssessment {
  history: number
  exam: number
  differential: number
  plan: number
  communication: number
  submittedAt: string
}

// ─── Key Moment Highlights ──────────────────────────────────────────────────

export type KeyMomentType =
  | 'breakthrough_question'
  | 'missed_red_flag'
  | 'rapport_building'
  | 'premature_closure'
  | 'systematic_approach'
  | 'critical_finding'

export interface KeyMoment {
  type: KeyMomentType
  transcriptIndex: number
  quote: string
  explanation: string
  impact: 'positive' | 'negative' | 'neutral'
}

// ─── Learning Objective Alignment ─────────────────────────────────────────

export interface LearningObjectiveResult {
  objective: string
  status: 'met' | 'partially_met' | 'not_demonstrated'
  evidence: string
}

export interface LearningObjectiveAlignment {
  results: LearningObjectiveResult[]
  metCount: number
  totalCount: number
}

// ─── Question Strategy Analysis ──────────────────────────────────────────

export interface QuestionStrategyAnalysis {
  totalQuestions: number
  openEndedCount: number
  closedCount: number
  leadingCount: number
  followUpCount: number
  openEndedRatio: number
  strengths: string[]
  improvements: string[]
  exampleQuestions: { question: string; type: string; suggestion?: string }[]
}

// ─── Clinical Reasoning Process Map ─────────────────────────────────────────

export type ReasoningTrajectory = 'convergent' | 'divergent' | 'scattered' | 'linear'

export interface ReasoningPivot {
  phase: EncounterPhase
  transcriptIndex: number
  hypothesis: string
  trigger: string
  outcome: 'refined' | 'abandoned' | 'confirmed'
}

export interface ClinicalReasoningProcess {
  trajectory: ReasoningTrajectory
  trajectoryDescription: string
  pivots: ReasoningPivot[]
  hypothesisEvolution: string[]
  efficiencyScore: number // 0-100
  efficiencyExplanation: string
}

// ─── Case List ─────────────────────────────────────────────────────────────

export interface ClinicalCaseListItem {
  id: string
  title: string
  chiefComplaint: string
  program: ClinicalProgram
  difficulty: CaseDifficulty
  organSystems: string[]
  tags: string[]
  patientName: string
  patientAge: number
  patientSex: string
  published: boolean
  creatorId: string
  createdAt: Date
}
