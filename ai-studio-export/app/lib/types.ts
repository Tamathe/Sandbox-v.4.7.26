export type UserRole = 'EDUCATOR' | 'STUDENT' | 'ADMIN'
export type ToolType = 'EXTERNAL' | 'CHATBOT' | 'SIMULATION' | 'QUIZ' | 'AI_INTERVIEW' | 'DEBATE' | 'STUDY_BUDDY'
export type AudioEngine = 'openai' | 'azure' | 'webspeech'

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
  suspended?: boolean
  suspendedReason?: string | null
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
  fastTrackApprovedAt?: string | null
  suspendedAt?: string | null
  suspendedReason?: string | null
  avgRating?: number | null
  isOfficialService?: boolean
  serviceProtocol?: string | null
  escalationEmail?: string | null
  collabEnabled?: boolean
  collabModes?: string[]
  collabMaxUsers?: number
  audioEnabled?: boolean
  audioPersonaName?: string | null
  audioEngine?: AudioEngine | string
  audioVoiceName?: string | null
  audioSpeakingStyle?: string | null
  audioSpeed?: number
  audioSystemSuffix?: string | null
  audioBackgroundTrack?: string | null
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

export interface InAppNotification {
  id: string
  userId: string
  type: 'COMMENT_ON_TOOL' | 'COMMENT_REPLY'
  title: string
  body: string
  href: string | null
  readAt: string | null
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
  serviceBots: ToolWithDetails[]
  pendingTools: ToolWithDetails[]
  flaggedSessions: Array<{
    id: string
    startedAt: string
    user: { id: string; name: string; email: string } | null
    tool: { id: string; name: string; category: string; isOfficialService: boolean }
    chatMessages: Array<{
      id: string
      role: string
      content: string
      flagCategory: string | null
      flagReason: string | null
      createdAt: string
    }>
  }>
  recentAnnouncements: Array<{
    id: string
    title: string
    message: string
    tone: string
    isActive: boolean
    dismissible: boolean
    createdAt: string
    createdBy: { id: string; name: string; email: string }
  }>
  sandcastleQueue: Array<{
    id: string
    title: string
    category: string
    approvalStatus: string
    aiVerdict: string | null
    aiRejectReason: string | null
    aiFlags: string[]
    createdAt: string
    creator: { id: string; name: string; email: string }
  }>
  auditLog: Array<{
    id: string
    action: string
    targetType: string
    targetId: string | null
    targetLabel: string | null
    metadata?: Record<string, unknown> | null
    createdAt: string
    admin: { id: string; name: string; email: string }
  }>
  serviceBotSamples: Array<{
    id: string
    startedAt: string
    user: { id: string; name: string; email: string } | null
    tool: { id: string; name: string; serviceProtocol: string | null }
    chatMessages: Array<{ id: string; role: string; content: string; createdAt: string }>
  }>
  economics: {
    monthStart: string
    totalInputTokens: number
    totalOutputTokens: number
    totalTokens: number
    totalEstimatedCostUsd: number
    topTools: Array<{
      toolId: string
      toolName: string
      inputTokens: number
      outputTokens: number
      tokensUsed: number
      estimatedCostUsd: number
    }>
    topUsers: Array<{
      userId: string
      userName: string
      userEmail: string
      inputTokens: number
      outputTokens: number
      tokensUsed: number
      estimatedCostUsd: number
    }>
  }
}
