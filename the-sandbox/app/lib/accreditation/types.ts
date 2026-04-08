// ─── Shared types for Accreditation Autopilot ─────────────────────────

export type EvidenceQualityLevel = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'WEAK' | 'MISSING'
export type GapSeverity = 'critical' | 'major' | 'minor' | 'informational'
export type NarrativeStatusType = 'NOT_STARTED' | 'AI_DRAFT' | 'IN_REVIEW' | 'REVISION_NEEDED' | 'APPROVED' | 'FINAL'

export interface StandardCompliance {
  standardId: string
  standardNumber: string
  standardTitle: string
  evidenceCount: number
  evidenceQuality: EvidenceQualityLevel
  qualityScore: number
  gapCount: number
  criticalGaps: number
  narrativeStatus: NarrativeStatusType
  isAutoHarvestable: boolean
  lastHarvestedAt: Date | null
  programs: ProgramCompliance[]
}

export interface ProgramCompliance {
  programCode: string
  programName: string
  evidenceCount: number
  qualityScore: number
  gaps: string[]
}

export interface ComplianceDashboard {
  cycleId: string
  cycleName: string
  phase: string
  overallReadiness: number
  siteVisitDate: Date | null
  daysUntilSiteVisit: number | null
  standardsSummary: {
    total: number
    met: number
    partial: number
    gapped: number
  }
  gapSummary: {
    critical: number
    major: number
    minor: number
    informational: number
  }
  narrativeSummary: {
    notStarted: number
    aiDraft: number
    inReview: number
    approved: number
    final: number
  }
  recentActivity: { date: Date; action: string; standard: string }[]
  trendData: { date: Date; readiness: number }[]
}

export interface EvidenceHarvestResult {
  standardId: string
  harvested: number
  skipped: number
  errors: string[]
}

export interface GapAnalysisResult {
  standardId: string
  standardNumber: string
  gaps: {
    title: string
    severity: GapSeverity
    missingTypes: string[]
    affectedPrograms: string[]
    suggestedActions: string[]
    estimatedEffort: string
  }[]
}

export interface NarrativeGenerationInput {
  standardId: string
  cycleId: string
  evidence: {
    title: string
    description: string
    dataSnapshot: Record<string, unknown>
    quality: string
    semesterCode: string | null
  }[]
  gaps: { title: string; severity: string }[]
  previousNarrative: string | null
}

export interface StandardSeedData {
  sectionNumber: string
  sectionTitle: string
  standardNumber: string
  standardTitle: string
  description: string
  evidenceTypes: string[]
  collectionFrequency: string
  autoHarvestable: boolean
  harvestSources: { model: string; description: string }[] | null
}

export interface PeerReviewQuestion {
  standard: string
  question: string
  difficulty: 'routine' | 'probing' | 'critical'
  context: string
  suggestedResponse: string
}
