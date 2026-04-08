// ─── Clinical Trial Matcher Types ─────────────────────────────────────────────

export interface PatientProfile {
  condition: string
  age?: number
  sex?: 'MALE' | 'FEMALE' | 'ALL'
  biomarkers?: string[]
  priorTreatments?: string[]
  stage?: string
  ecogStatus?: number
  notes?: string
}

export interface TrialSearchParams {
  condition: string
  intervention?: string
  status?: string[]
  ageRange?: { min?: number; max?: number }
  sex?: string
  pageSize?: number
  geoFilter?: string
}

export interface ClinicalTrial {
  nctId: string
  briefTitle: string
  officialTitle?: string
  overallStatus: string
  phases: string[]
  conditions: string[]
  interventions: { type: string; name: string; description?: string }[]
  eligibilityCriteria: string
  minimumAge?: string
  maximumAge?: string
  sex: string
  healthyVolunteers: boolean
  enrollmentCount?: number
  enrollmentType?: string
  briefSummary?: string
  leadSponsor?: string
  startDate?: string
  locations?: { facility: string; city: string; state: string; country: string }[]
}

export interface TrialMatch {
  trial: ClinicalTrial
  overallScore: number // 0-100
  matchDetails: CriterionMatch[]
  recommendation: 'STRONG' | 'POSSIBLE' | 'UNLIKELY'
  reasoning: string
}

export interface CriterionMatch {
  criterion: string
  met: 'YES' | 'NO' | 'UNKNOWN' | 'NEEDS_REVIEW'
  explanation: string
}

export type MatcherPhase =
  | 'intake'
  | 'extracting'
  | 'searching'
  | 'matching'
  | 'results'
  | 'deep-dive'

export interface MatcherInterviewState {
  phase: MatcherPhase
  patient: Partial<PatientProfile>
  searchResults?: ClinicalTrial[]
  matches?: TrialMatch[]
  selectedTrialId?: string
}

export interface MatcherPreflight {
  user: { name: string; email: string; role: string }
}

export type { ChatMessage } from '../types'
