/**
 * Policy Blast Radius — Shared Types
 *
 * Impact analysis types for institutional policy change tracing.
 */

// ── Impact Data (pre-persist) ────────────────────────────────────────────────

export interface ImpactData {
  impactType: 'course-policy' | 'ai-policy' | 'syllabus' | 'compliance' | 'petition' | 'training'
  targetId: string
  targetLabel: string
  description: string
  severity: 'info' | 'action-required' | 'conflict'
  actionNeeded?: string
  metadata?: Record<string, unknown>
}

// ── Report Data (pre-persist) ────────────────────────────────────────────────

export interface PolicyImpactReportData {
  policyId: string
  changeDescription: string
  severity: 'informational' | 'moderate' | 'significant' | 'critical'
  affectedCourses: number
  affectedFaculty: number
  affectedStudents: number
  conflictingAIPolicies: number
  triggeredCompliance: number
  activePetitions: number
  impacts: ImpactData[]
  suggestedActions: string[]
}

// ── Persisted Report (from DB) ───────────────────────────────────────────────

export interface PolicyImpactReportFull {
  id: string
  policyId: string
  policy: { id: string; title: string; policyNumber: string; category: string }
  generatedAt: string
  generatedBy: string
  changeDescription: string
  severity: string
  affectedCourses: number
  affectedFaculty: number
  affectedStudents: number
  conflictingAIPolicies: number
  triggeredCompliance: number
  activePetitions: number
  impacts: {
    id: string
    impactType: string
    targetId: string
    targetLabel: string
    description: string
    severity: string
    actionNeeded: string | null
  }[]
  suggestedActions: string[]
  status: string
  resolvedAt: string | null
}

export interface PolicyImpactReportSummary {
  id: string
  policyId: string
  policyTitle: string
  policyNumber: string
  generatedAt: string
  severity: string
  affectedCourses: number
  affectedFaculty: number
  affectedStudents: number
  conflictingAIPolicies: number
  triggeredCompliance: number
  activePetitions: number
  status: string
  resolvedAt: string | null
}
