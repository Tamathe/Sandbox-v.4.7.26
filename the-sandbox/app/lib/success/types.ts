// ─── Shared types for Student Success Early Warning ─────────────────────────

export type Trajectory = 'improving' | 'stable' | 'declining' | 'critical_decline'

export type PatternType =
  | 'academic_decline'
  | 'broad_disengagement'
  | 'sudden_absence'
  | 'gradual_fade'
  | 'social_withdrawal'
  | 'study_abandonment'

export interface SignalScore {
  signal: string
  score: number
  delta7d: number
  detail: string
  rawMetrics: Record<string, number>
}

export interface SuccessScoreResult {
  composite: number
  trajectory: Trajectory
  signals: SignalScore[]
  inflection: InflectionResult | null
  pattern: PatternClassification | null
}

export interface InflectionResult {
  type: 'sudden_drop' | 'gradual_decline' | 'plateau_after_decline' | 'recovery'
  magnitude: number
  primaryDrivers: string[]
  detectedAt: Date
}

export interface PatternClassification {
  type: PatternType
  confidence: number
  evidence: string[]
  suggestedTarget: 'INSTRUCTOR' | 'ADVISOR' | 'BOTH' | 'SELF_SERVE'
}

export interface InterventionSuggestion {
  action: string
  reason: string
  urgency: 'immediate' | 'this_week' | 'when_convenient'
  type: string
}

export interface StudentRiskSummary {
  userId: string
  userName: string
  score: number
  trajectory: Trajectory
  severity: string
  topSignals: { signal: string; score: number; delta: number }[]
  daysSinceActive: number
  openAlerts: number
  lastIntervention: Date | null
}

export interface CourseRiskHeatmap {
  courseId: string
  courseName: string
  totalStudents: number
  distribution: {
    healthy: number
    watch: number
    concern: number
    urgent: number
    critical: number
  }
  avgScore: number
  avgDelta7d: number
  topRiskStudents: StudentRiskSummary[]
}

export const DEFAULT_SIGNAL_WEIGHTS: Record<string, number> = {
  loginFrequency: 0.10,
  assignmentSubmission: 0.20,
  sandyUsageDecay: 0.10,
  studySessionCadence: 0.10,
  conceptMasterySlope: 0.15,
  commonsParticipation: 0.05,
  flashcardConsistency: 0.10,
  gradeTrend: 0.15,
  toolEngagement: 0.03,
  contentAccess: 0.02,
}

export const TRAJECTORY_THRESHOLDS = {
  improving: 5,
  stable_upper: 5,
  stable_lower: -5,
  declining: -15,
  critical_decline: -15,
} as const

export const SEVERITY_THRESHOLDS = {
  WATCH: 70,
  CONCERN: 50,
  URGENT: 30,
  CRITICAL: 15,
} as const
