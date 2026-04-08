// Shared TypeScript types for the Course Hub

export type TabId =
  // Primary tabs (7 visible in educator tab bar)
  | 'overview' | 'assignments' | 'grades' | 'content' | 'course-map' | 'discussion' | 'settings'
  // Hidden tabs (render when active but don't show in tab bar)
  | 'weekly-plan' | 'policies' | 'tools'
  // Legacy IDs (kept for deep-link compat)
  | 'dashboard' | 'analytics' | 'materials' | 'study' | 'path' | 'submissions' | 'pulse' | 'map' | 'gradebook' | 'mygrades'

export type Course = {
  id: string
  courseCode: string
  title: string
  description: string | null
  isPublic: boolean
  canvasCourseId: string | null
  instructor: { name: string; email: string }
  _count: { materials: number }
}

export type CourseMaterial = {
  id: string
  title: string
  content: string
  materialType: string
  moduleNumber: number | null
  isVisible: boolean
  createdAt: string
  isRead?: boolean
  accessibilityGrade?: string | null
  accessibilityScore?: number | null
}

export type LinkedTool = {
  id: string
  name: string
  shortDescription: string
  category: string
  toolType: string
  thumbnailUrl: string | null
  estimatedMinutes: number | null
  syllabusContext: string | null
  weekLabel: string | null
  displayOrder: number
  adaptiveDifficultyOverride: string | null
  topScore?: number | null
  _count: { sessions: number }
}

export type CatalogTool = {
  id: string
  name: string
  shortDescription: string
  category: string
  toolType: string
}

export type ToolSuggestion = {
  title: string
  description: string
  toolType: string
  rationale: string
  citations: Array<{
    materialId: string
    note: string
  }>
}

export type DiscussionSuggestion = {
  title: string
  content: string
  targetModule: number | null
}

export type DiscussionThreadSummary = {
  id: string
  title: string
  content: string
  isPinned: boolean
  isLocked: boolean
  createdAt: string
  updatedAt: string
  author: { id: string; name: string; role: string }
  _count: { posts: number }
}

export type DiscussionReply = {
  id: string
  content: string
  createdAt: string
  author: { id: string; name: string; role: string }
}

export type DiscussionPost = {
  id: string
  content: string
  createdAt: string
  author: { id: string; name: string; role: string }
  replies: DiscussionReply[]
}

export type DiscussionThreadDetail = {
  id: string
  title: string
  content: string
  isPinned: boolean
  isLocked: boolean
  createdAt: string
  updatedAt: string
  author: { id: string; name: string; role: string }
  posts: DiscussionPost[]
}

export type PulseModule = {
  label: string
  pct: number
  students: number
  warn: boolean
}

export type PulseQuestion = {
  question: string
  count: number
}

export type SubmissionMetric = {
  label: string
  value: string
  tone: 'neutral' | 'good' | 'warn'
}

export type AssignmentSubmissionSnapshot = {
  assignment: string
  submitted: string
  average: string
  flagged: string
}

export type SubmissionSample = {
  studentName: string
  assignment: string
  status: 'Strong' | 'On Track' | 'Needs Review' | 'Missing'
  score: string
  submittedAt: string | null
  feedback: string
}

export type CourseSubmissionSnapshot = {
  summary: SubmissionMetric[]
  assignments: AssignmentSubmissionSnapshot[]
  recentSubmissions: SubmissionSample[]
}

export interface RubricBand {
  id: string
  label: string
  minPoints: number
  maxPoints: number
  description: string
}

export interface RubricCriterion {
  id: string
  title: string
  description: string | null
  maxPoints: number
  order?: number
  bands: RubricBand[]
}

export interface BaseAssignment {
  id: string
  title: string
  description: string | null
  type: string
  dueAt: string | null
  pointsPossible: number
  isPublished: boolean
}

export type LearningObjective = {
  id: string
  title: string
  description: string | null
  bloomLevel: string | null
  source: string | null
  moduleNumber: number | null
  materialId: string | null
  material?: { id: string; title: string } | null
}

export type ObjectiveProgress = {
  objectiveId: string
  attempts: number
  correct: number
  lastSeen: string
  masteryLevel?: string
}
