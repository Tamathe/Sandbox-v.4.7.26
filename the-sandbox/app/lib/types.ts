export type UserRole = 'EDUCATOR' | 'STUDENT' | 'ADMIN'
export type ToolType = 'EXTERNAL' | 'CHATBOT' | 'SIMULATION' | 'QUIZ' | 'AI_INTERVIEW' | 'DEBATE' | 'STUDY_BUDDY'

export interface BuilderSpec {
  name: string
  shortDescription: string
  fullDescription: string
  category: string
  toolType: ToolType
  systemPrompt: string
  welcomeMessage: string
  starterQuestions: string[]
  learningObjectives: string[]
  difficultyLevel: string
  intendedAudience: string
  persona?: { name: string; role: string }
  personaName?: string
  personaAvatar?: string
  forkedFromId?: string
  forkedFromName?: string
  ready: boolean
}

export interface BuilderDocument {
  id: string
  filename: string
  wordCount: number
  sessionId: string | null
  createdAt: string
}
export type MetricType = 'COUNTER' | 'DURATION' | 'RATING' | 'BOOLEAN' | 'TEXT'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  department: string | null
  college: string | null
  avatarUrl: string | null
  sandCredits?: number
  bio?: string | null
  personalContext?: string | null
  createdAt: string
}

export interface CustomMetricDefinition {
  id: string
  toolId: string
  name: string
  type: MetricType
  description: string | null
}

export interface ToolWithDetails {
  id: string
  name: string
  shortDescription: string
  fullDescription: string
  category: string
  difficultyLevel: string
  estimatedMinutes: number | null
  thumbnailUrl: string | null
  toolType: ToolType
  externalUrl: string | null
  systemPrompt: string | null
  personaName: string | null
  personaAvatar: string | null
  welcomeMessage: string | null
  starterQuestions: string[]
  referenceDocUrls: string[]
  learningObjectives: string[]
  intendedAudience: string | null
  published: boolean
  featured: boolean
  approvalStatus: string
  avgRating?: number | null
  isOfficialService?: boolean
  serviceProtocol?: string | null
  escalationEmail?: string | null
  totalSteps?: number | null
  stepLabel?: string | null
  courseContext?: {
    courseId: string
    syllabusContext: string | null
    weekLabel: string | null
  } | null
  webhookSecret: string | null
  creatorId: string
  creator: User
  createdAt: string
  updatedAt: string
  _count: {
    upvotes: number
    favorites: number
    comments: number
    sessions: number
    ratings?: number
  }
  hasUpvoted?: boolean
  hasFavorited?: boolean
  customMetrics?: CustomMetricDefinition[]
}

export interface LibraryEntryWithTool {
  id: string
  toolId: string
  addedAt: string
  sessionCount: number
  lastSessionAt: string | null
  activeSessionId?: string | null
  tool: ToolWithDetails
}

export interface LibraryHistoryEntry {
  toolId: string
  sessionCount: number
  lastSessionAt: string | null
  activeSessionId?: string | null
  latestNote?: string | null
  tool: ToolWithDetails
}

export interface CommentWithUser {
  id: string
  content: string
  pinned: boolean
  userId: string
  toolId: string
  parentId: string | null
  user: User
  replies: CommentWithUser[]
  createdAt: string
}

export interface UserProfile {
  id: string
  name: string
  email: string
  role: UserRole
  department: string | null
  college: string | null
  avatarUrl: string | null
  sandCredits: number
  bio: string | null
  personalContext?: string | null
  createdAt: string
  tools: ToolWithDetails[]
  favorites: { tool: ToolWithDetails }[]
  _count: {
    tools: number
    favorites: number
    upvotes: number
    comments: number
  }
}

export interface CollabRequest {
  id: string
  toolId: string
  tool: { id: string; name: string; shortDescription: string; category: string; toolType: string }
  requesterId: string
  requester: { name: string; department: string | null }
  message: string
  status: 'OPEN' | 'CLOSED'
  createdAt: string
  _count: { reviews: number }
}

export interface CollabReview {
  id: string
  requestId: string
  reviewerId: string
  reviewer: { name: string }
  summary: string | null
  rating: number | null
  aiGuidedAnswers: { clarity: string; effectiveness: string; suggestions: string } | null
  createdAt: string
}

export interface SandTransaction {
  id: string
  amount: number
  reason: string
  toolId: string | null
  createdAt: string
}

export interface AnalyticsData {
  totalSessions: number
  totalMessages: number
  uniqueUsers: number
  upvotesCount: number
  favoritesCount: number
  sessionsOverTime: { date: string; count: number }[]
  upvotesOverTime: { date: string; count: number }[]
  customMetricsSummary: {
    name: string
    type: string
    count: number
    avg: number | null
    values: string[]
  }[]
}

export interface AdminStats {
  totalTools: number
  totalSessions: number
  totalUsers: number
  totalUpvotes: number
  recentTools: ToolWithDetails[]
  topCreators: { id: string; name: string; email: string; role: UserRole; _count: { tools: number } }[]
  allTools: ToolWithDetails[]
}
