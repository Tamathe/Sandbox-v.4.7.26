// Barrel file — re-exports public API from registrar services

export { getAcademicStanding } from './academic-standing'
export type { StandingStudent, StandingSummary, AcademicStandingData } from './academic-standing'

export { generateAuditSummary } from './audit-summary'

export { getComplianceCalendar } from './compliance-calendar'
export type { ComplianceDeadline, ComplianceCalendarData } from './compliance-calendar'

export { runDegreeAudit } from './degree-audit'

export { getEnrollmentPulse } from './enrollment-pulse'
export type { SectionDetail, DepartmentEnrollment, EnrollmentPulseData } from './enrollment-pulse'

export { getGraduationPipeline } from './graduation-pipeline'
export type { PipelineStudent, PipelineStage, PipelineAlert, GraduationPipelineData } from './graduation-pipeline'

export { getHoldsManagement } from './holds-management'
export type { HoldType, StudentHold, HoldTypeSummary, HoldsManagementData } from './holds-management'

export { checkEligibility } from './petition-eligibility'
export type { EligibilityResult } from './petition-eligibility'

export { PETITION_ROUTES, routePetition } from './petition-routing'

export {
  getEnrollmentStats,
  getPetitionStats,
  getArticulationStats,
  getDegreeAuditStats,
} from './reporting'

export { getStudent360 } from './student-360'
export type { SimulatedHold, Student360Petition, Student360Audit, Student360Data } from './student-360'

export { generateTriageInsights } from './triage-intelligence'
export type { TriageInsight } from './triage-intelligence'

export type {
  RequirementAuditResult,
  AuditStep,
  AuditSource,
  DegreeAuditResultPayload,
} from './types'
export { PETITION_TYPE_LABELS, PETITION_STATUS_LABELS } from './types'

export {
  buildTransferMap,
  estimateTimeline,
  compareTimelines,
  generateWhatIfRecommendation,
} from './what-if-service'
export type {
  TransferMapEntry,
  TransferMapSummary,
  PrereqChain,
  TimelineEstimate,
  TimelineComparison,
} from './what-if-service'
