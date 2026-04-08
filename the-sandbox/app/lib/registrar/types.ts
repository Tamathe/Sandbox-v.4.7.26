// Shared types for the Registrar Intelligence System

export interface RequirementAuditResult {
  requirementId: string
  requirementName: string
  category: string
  status: 'SATISFIED' | 'IN_PROGRESS' | 'NOT_STARTED' | 'DEFICIENT'
  creditsRequired: number
  creditsCompleted: number
  creditsInProgress: number
  satisfyingCourses: string[]
  missingSuggestions: string[]
  notes?: string
}

export interface AuditStep {
  step: number
  description: string
  outcome: 'PASS' | 'WARN' | 'FAIL' | 'INFO'
  detail?: string
}

export interface AuditSource {
  type: 'CATALOG' | 'TRANSCRIPT' | 'TRANSFER' | 'ENROLLMENT' | 'STAFF_OVERRIDE'
  description: string
  term?: string
  courseCode?: string
}

export interface DegreeAuditResultPayload {
  overallStatus: 'ON_TRACK' | 'ACTION_NEEDED' | 'REVIEW_REQUIRED'
  percentComplete: number
  totalCreditsCompleted: number
  totalCreditsRequired: number
  requirementResults: RequirementAuditResult[]
  recommendedActions: string[]
  citedSources: AuditSource[]
  chainOfThought: AuditStep[]
  confidenceScore: number
  complexCaseFlag: boolean
  humanReviewRequired: boolean
}

export const PETITION_TYPE_LABELS: Record<string, string> = {
  LATE_WITHDRAWAL: 'Late Course Withdrawal',
  GRADE_CHANGE: 'Grade Change Request',
  NAME_UPDATE: 'Legal Name Update',
  ENROLLMENT_CERTIFICATION: 'Enrollment Certification',
  ACADEMIC_RENEWAL: 'Academic Renewal',
  COURSE_OVERLOAD: 'Course Overload',
  GRADUATION_APPLICATION: 'Graduation Application',
  MAJOR_CHANGE: 'Major Change',
  LEAVE_OF_ABSENCE: 'Leave of Absence',
}

export const PETITION_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  ELIGIBILITY_CHECKING: 'Checking Eligibility',
  PENDING_STUDENT_INFO: 'Awaiting Information',
  IN_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  DENIED: 'Denied',
  WITHDRAWN: 'Withdrawn',
}
