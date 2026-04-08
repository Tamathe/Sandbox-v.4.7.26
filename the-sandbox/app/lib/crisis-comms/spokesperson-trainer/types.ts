/**
 * Crisis Spokesperson Trainer — shared types.
 */

export type SpokespersonPhase = 'setup' | 'interview' | 'debrief' | 'model-response' | 'replay'

export type Difficulty = 'warmup' | 'standard' | 'hostile' | 'press-conference'

export interface ScenarioPreset {
  id: string
  title: string
  icon: string
  summary: string
  factSheet: {
    confirmedFacts: string[]
    unknownFacts: string[]
    stakeholderPositions: string[]
    mediaLandscape: string
  }
  suggestedRole: string
  incidentStage: string
  /** Mid-interview breaking news inject (delivered after N questions) */
  inject?: {
    afterQuestion: number
    headline: string
    newFacts: string[]
  }
}

export interface DrillScores {
  clarity: number
  empathy: number
  speculationControl: number
  messageDiscipline: number
}

/** Coaching nudge emitted during the interview phase */
export interface CoachingNudge {
  technique: 'bridge' | 'block' | 'empathy-lead' | 'fact-forward' | 'pivot' | 'acknowledge-unknown'
  label: string
  suggestion: string
}

/** Per-answer annotation generated during replay/debrief */
export interface AnswerAnnotation {
  questionIndex: number
  reporterQuestion: string
  userAnswer: string
  rating: 'strong' | 'adequate' | 'weak'
  techniques: string[]
  note: string
  keyMessagesLanded: string[]
  keyMessagesMissed: string[]
}

export interface SpokespersonInterviewState {
  phase: SpokespersonPhase
  scenarioId: string | null
  scenarioTitle: string | null
  difficulty: Difficulty
  userRole: string | null
  confirmedFacts: string[]
  unknownFacts: string[]
  questionsAnswered: number
  scores: DrillScores | null
  modelResponseRequested: boolean
  /** User-defined key messages to land during the interview */
  keyMessages: string[]
  /** Whether a mid-interview inject has been delivered */
  injectDelivered: boolean
}

export interface PastDrill {
  id: string
  scenarioTitle: string
  difficulty: string
  scores: DrillScores
  completedAt: string
}

export interface SpokespersonPreflight {
  user: {
    name: string
    email: string
    role: string
    department: string | null
  }
  pastDrills: PastDrill[]
  totalDrillCount: number
}

export interface SpokespersonInterviewRequest {
  messages: { role: 'user' | 'assistant'; content: string }[]
  preflight: SpokespersonPreflight
  interviewState: SpokespersonInterviewState
}

export interface DrillHistoryEntry {
  sessionId: string
  scenarioTitle: string
  difficulty: string
  scores: DrillScores
  completedAt: string
}

export interface SaveDrillRequest {
  scenarioTitle: string
  difficulty: Difficulty
  scores: DrillScores
  questionsAnswered: number
  keyMessages?: string[]
  annotations?: AnswerAnnotation[]
}

/** Request body for the /annotate API route */
export interface AnnotateRequest {
  messages: { role: 'user' | 'assistant'; content: string }[]
  keyMessages: string[]
  scenarioTitle: string
  difficulty: Difficulty
}
