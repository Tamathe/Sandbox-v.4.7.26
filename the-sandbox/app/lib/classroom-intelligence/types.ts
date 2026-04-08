// ─── Shared types for Classroom Intelligence Loop ─────────────────────────

export type DifficultyLevel = 'EASY' | 'MODERATE' | 'DIFFICULT' | 'VERY_DIFFICULT' | 'CRITICAL'
export type InsightType = 'CONCEPT_STRUGGLE' | 'MISCONCEPTION' | 'ENGAGEMENT_DROP' | 'INTERVENTION_RESULT' | 'CROSS_SECTION' | 'STUDENT_FEEDBACK' | 'WEEKLY_PULSE'
export type Approach = 'RE_EXPLAIN' | 'VISUAL_AID' | 'PRACTICE_EXERCISE' | 'STUDY_GROUP' | 'PEER_TEACHING' | 'OFFICE_HOURS' | 'FLASHCARD_SET' | 'SCAFFOLD_TASK' | 'REAL_WORLD_EXAMPLE' | 'ASSESSMENT_ADJUST' | 'SANDY_REVIEW' | 'CUSTOM'

export interface ConceptDifficulty {
  concept: string
  conceptLabel: string
  difficulty: DifficultyLevel
  masteryRate: number
  avgMastery: number
  encounterCount: number
  successRate: number
  misconceptions: MisconceptionPattern[]
  sandyQuestionCount: number
  sandyConfusionScore: number
  flashcardFailRate: number | null
  delta7d: number
}

export interface MisconceptionPattern {
  type: string
  count: number
  description: string
  exampleErrors: string[]
}

export interface InsightCardData {
  type: InsightType
  title: string
  body: string
  evidence: { source: string; data: Record<string, unknown> }[]
  suggestedActions: { approach: Approach; reason: string; detail: string }[]
  urgency: 'immediate' | 'this_week' | 'informational'
  concepts: string[]
}

export interface WeeklyPulseData {
  courseId: string
  weekNumber: number
  conceptHeatmap: ConceptDifficulty[]
  avgEngagement: number | null
  avgScore: number | null
  submissionRate: number | null
  topStruggle: string | null
  topImprovement: string | null
  insightCount: number
  interventionCount: number
  narrative: string
}

export interface InterventionEffectiveness {
  approach: Approach
  totalUsed: number
  effective: number
  ineffective: number
  inconclusive: number
  avgEffectSize: number | null
  bestConcept: string | null
  worstConcept: string | null
}

export interface CrossSectionInsight {
  courseCode: string
  concept: string
  sections: {
    label: string
    masteryRate: number
    avgMastery: number
    approach: string | null
    studentCount: number
  }[]
  spread: number
  bestApproach: string | null
  isSignificant: boolean
}

// Difficulty thresholds (masteryRate cutoffs)
export const DIFFICULTY_THRESHOLDS = {
  EASY: 0.8,
  MODERATE: 0.6,
  DIFFICULT: 0.4,
  VERY_DIFFICULT: 0.2,
  CRITICAL: 0,
} as const

// Minimum sample sizes for statistical claims
export const MIN_SAMPLE_SIZE = 10
export const MIN_CROSS_SECTION_SIZE = 15
export const SIGNIFICANT_SPREAD = 0.15
