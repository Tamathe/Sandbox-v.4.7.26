export type GovernanceOfficiality =
  | 'official'
  | 'user-uploaded'
  | 'simulated'
  | 'inferred'

export type GovernanceAccessScope =
  | 'public_course'
  | 'course_members'
  | 'instructor_only'

export type GovernanceOptInStatus =
  | 'approved'
  | 'not_required'
  | 'consent_required'
  | 'blocked'

export type GovernanceBasisStatus =
  | 'allowed'
  | 'blocked'
  | 'not_required'
  | 'warning'

export type CourseGovernanceFlags = {
  facultyAiRetrievalApproved: boolean
  studentUploadsAllowed: boolean
  transcriptGenerationAllowed: boolean
  classroomRecordingAllowed: boolean
}

export type ConsentSnapshot = {
  latestConsentVersion: string | null
  latestConsentEffectiveAt: string | null
  acceptedConsentVersion: string | null
  dataConsentAt: string | null
  aiPersonalizationGranted: boolean | null
}

export type PermissionBasisEntry = {
  code: string
  label: string
  detail: string
  status: GovernanceBasisStatus
}

export type ProvenanceSourceKind =
  | 'course-material'
  | 'course-policy'
  | 'grading-weight'
  | 'tool'

export type TrustPanelSource = {
  id: string
  kind: ProvenanceSourceKind
  title: string
  sourceSystem: string
  sourceSystemLabel: string
  approvalBasis: string
  approvalBasisLabel: string
  accessScope: GovernanceAccessScope
  accessScopeLabel: string
  optInStatus: GovernanceOptInStatus
  optInStatusLabel: string
  provenanceType: GovernanceOfficiality
  uploaderName: string | null
  uploaderRole: string | null
  courseId: string | null
  courseCode: string | null
  courseTitle: string | null
  isVisibleToStudents: boolean | null
  allowed: boolean
  permissionBasis: PermissionBasisEntry[]
  lastUpdatedAt: string | null
}

export type SandyTrustPanelData = {
  status: 'allowed' | 'blocked' | 'none'
  summary: string
  generatedAt: string
  courseId: string | null
  courseCode: string | null
  courseTitle: string | null
  sources: TrustPanelSource[]
}

export type CourseGovernanceApiResponse = {
  course: {
    id: string
    courseCode: string
    title: string
    isPublic: boolean
    instructorName: string | null
    flags: CourseGovernanceFlags
  }
  consent: ConsentSnapshot | null
  policySummary: {
    totalPolicies: number
    totalWeights: number
    ackCount: number
    latestChangeAt: string | null
  }
  sourceSummary: {
    totalSources: number
    officialSources: number
    userUploadedSources: number
    simulatedSources: number
    inferredSources: number
    allowedSources: number
    blockedSources: number
  }
  recentSources: TrustPanelSource[]
}
