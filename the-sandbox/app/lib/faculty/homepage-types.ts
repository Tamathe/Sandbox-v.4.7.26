// ── Inline Analytics & Student Intelligence types ──

export interface EngagementDiagnostic {
  courseId: string
  courseCode: string
  currentEngagement: number
  previousEngagement: number
  weekOverWeekDelta: number
  sparkline: number[] // Last 6 weeks of engagement %
  likelyCauses: Array<{
    type: 'low_submission' | 'student_dropout' | 'low_scores' | 'no_sessions'
    description: string
    severity: 'high' | 'medium' | 'low'
  }>
  suggestedActions: Array<{
    label: string
    actionType: 'post' | 'nudge' | 'navigate'
    payload: Record<string, unknown>
  }>
}

export interface StudentBriefing {
  studentName: string
  studentId: string
  courses: Array<{
    courseId: string
    courseCode: string
    currentGrade: string
    gradePercentage: number
    gradeTrend: 'improving' | 'stable' | 'declining'
    recentAssignments: Array<{ name: string; score: number; maxScore: number }>
    lastActiveAt: string | null
    attendancePresent: number
    attendanceTotal: number
  }>
  toolEngagement: Array<{
    toolName: string
    sessionCount: number
    averageScore: number
  }>
  previousVisitNotes: Array<{
    id: string
    date: string
    content: string
    courseCode: string | null
  }>
  highlights: Array<{
    label: string
    type: 'percentile' | 'sessions' | 'consistency' | 'note'
  }>
}

export interface VisitNoteInput {
  studentId: string
  courseId?: string
  content: string
  followUpDate?: string
}

export interface VisitNoteRecord {
  id: string
  facultyId: string
  studentId: string
  studentName: string
  courseId: string | null
  courseCode: string | null
  content: string
  followUpDate: string | null
  createdAt: string
}

export type FacultyFlaggedStudentFlag =
  | 'grade_drop'
  | 'inactive'
  | 'accommodation'
  | 'attendance'

export type FacultyRecommendationStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'DECLINED'

export type FacultyAssessmentScope =
  | 'COURSE'
  | 'DEPARTMENT'
  | 'INSTITUTION'

export type TaskSource = 'auto' | 'self' | 'assigned'

export interface EngagementBreakdown {
  assignmentCompletion: number
  toolActivity: number
  loginFrequency: number
}

export interface AtRiskStudent {
  name: string
  flag: string
  detail: string
}

export interface FacultyHomepageV2Data {
  advisees: {
    total: number
    withHolds: number
    needsDegreeAudit: number
    registrationWindow: { start: string; end: string } | null
  }
  officeHours: {
    todaySlot: { start: string; end: string } | null
    queueCount: number
    topTheme: string | null
    /** Clarified semantics: students checked into the live queue */
    queueLabel: string
    /** AI-flagged students who need attention during office hours */
    flaggedForOfficeHours: Array<{ name: string; reason: string; course: string }>
  }
  flaggedStudents: Array<{
    id: string
    name: string
    flag: FacultyFlaggedStudentFlag
    course: string
    detail: string
  }>
  recommendations: Array<{
    id: string
    studentName: string
    purpose: string
    targetOrg: string
    dueDate: string
    status: FacultyRecommendationStatus
    daysUntilDue: number
    draft?: {
      version: number
      wordCount: number
      lastEditedAt: string
      oneDriveUrl: string | null
    } | null
  }>
  committees: Array<{
    id: string
    name: string
    nextMeeting: string | null
    actionItemsDue: number
    unreadMinutes: boolean
    nextActionTitle: string | null
    unreadMinutesDate: string | null
  }>
  departmentFeed: Array<{
    id: string
    title: string
    sender: string
    createdAt: string
  }>
  assessmentDeadlines: Array<{
    id: string
    title: string
    dueDate: string
    scope: FacultyAssessmentScope
    courseCode: string | null
    progress: string | null
  }>
  quickActions: {
    pendingGradeCount: number
    firstCourseId: string | null
    /** Effort hint for the grading queue */
    gradingEffortHint: string | null
  }
  /** Per-course health with engagement breakdown + at-risk students + last-term comparison */
  courseIntelligence: Array<{
    code: string
    engagementBreakdown: EngagementBreakdown | null
    atRiskStudents: AtRiskStudent[]
    lastTermEngagement: number | null
  }>
}
