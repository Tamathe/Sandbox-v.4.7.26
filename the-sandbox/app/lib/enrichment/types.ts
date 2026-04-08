// ─── Shared types for the enrichment pipeline ─────────────────────────────────

import type { UserRole } from '../types'
export type EnrichmentUserRole = UserRole | 'UNKNOWN'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export type EnrichedField<T = string> = {
  value: T
  confidence: number   // 0.0 – 1.0
  source: FieldSource
}

export type FieldSource =
  | 'email-parse'
  | 'uk-directory'
  | 'college-faculty-page'
  | 'orcid'
  | 'title-inference'
  | 'bio-extraction'
  | 'ai-inferred'
  | 'manual'

export type EnrichedCourse = {
  code: string
  name: string
  source: FieldSource
  confidence: number
}

export type EnrichedInterest = {
  tag: string
  source: FieldSource
}

export type EnrichmentProfile = {
  name:       EnrichedField<string>
  title:      EnrichedField<string | null>
  department: EnrichedField<string | null>
  college:    EnrichedField<string | null>
  role:       EnrichedField<EnrichmentUserRole>
  email:      EnrichedField<string | null>
  orcidId:    EnrichedField<string | null>
}

export type EnrichmentResult = {
  confidence:          ConfidenceLevel
  confidenceScore:     number
  profile:             EnrichmentProfile
  courses:             EnrichedCourse[]
  interests:           EnrichedInterest[]
  sources:             FieldSource[]
  enrichmentDurationMs: number
}

// Intermediate directory result from college page scraping
export type DirectoryProfile = {
  name:              string
  title:             string | null
  department:        string | null
  college:           string | null
  email:             string | null
  bioText:           string | null
  researchInterests: string[]
  profileUrl:        string
  source:            'college-faculty-page'
}

// Intermediate ORCID result
export type OrcidProfile = {
  orcidId:   string
  firstName: string | null
  lastName:  string | null
  keywords:  string[]
  biography: string | null
}
