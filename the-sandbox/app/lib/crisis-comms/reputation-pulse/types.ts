/**
 * Reputation Pulse v2 — shared types
 *
 * Designed around a Sprout Social-style 7-day monitoring pipeline:
 * Posts → Sentiment → Themes → AI Detection (negatives only) → Brief
 */

// ── Social Post (Sprout Social shape) ────────────────────────────────────

export interface SocialPost {
  id: string
  sproutId: string // Sprout Social message ID (e.g. "spr_928374")

  // Author metadata
  authorHandle: string
  authorDisplayName: string
  accountAgeDays: number
  followerCount: number
  followingCount: number
  totalPostCount: number
  hasProfilePhoto: boolean
  bioKeywords: string[]
  platformVerified: boolean
  locationHint: string | null

  // Post content
  platform: Platform
  text: string
  mediaType: 'none' | 'image' | 'video' | 'link'
  mediaDescription: string | null
  timestamp: string // ISO 8601
  isReply: boolean
  replyToId: string | null
  hashtags: string[]

  // Engagement
  likes: number
  shares: number
  replies: number
  quoteShares: number
}

export type Platform = 'twitter' | 'reddit' | 'facebook' | 'instagram' | 'news-comment' | 'tiktok'

// ── Sentiment ────────────────────────────────────────────────────────────

export type SentimentLabel = 'positive' | 'negative' | 'neutral'

export interface SentimentResult {
  postId: string
  sentiment: SentimentLabel
  confidence: number // 0–1
  reason: string // 1-sentence explanation
}

// ── Theme Clustering ─────────────────────────────────────────────────────

export interface ThemeCluster {
  themeId: string
  label: string // AI-generated theme name
  postIds: string[]
  sentimentBreakdown: { positive: number; negative: number; neutral: number }
  sampleQuotes: string[] // 2-3 representative quotes
}

// ── AI Detection ─────────────────────────────────────────────────────────

export interface AIDetectionResult {
  postId: string
  humanLikelihood: number
  aiLikelihood: number
  confidence: 'low' | 'medium' | 'high'
  topSignals: string[]
  explanation: string
  verdict: 'likely-human' | 'inconclusive' | 'likely-ai'
}

// ── Pipeline Funnel ──────────────────────────────────────────────────────

export interface PipelineFunnel {
  totalPosts: number
  negativePosts: number
  aiFlaggedPosts: number // likely-AI count among negatives
}

// ── Crisis Intelligence Brief ────────────────────────────────────────────

export interface CrisisIntelligenceBrief {
  analysisTimestamp: string
  postCount: number
  timelineWindow: string // e.g. "Mar 18 – Mar 25, 2026"

  threatLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
  threatRationale: string

  sentimentDistribution: {
    positive: { count: number; percentage: number }
    negative: { count: number; percentage: number }
    neutral: { count: number; percentage: number }
  }

  // AI authorship breakdown — scoped to negative posts only
  aiAuthorshipBreakdown: {
    likelyHuman: { count: number; percentage: number }
    inconclusive: { count: number; percentage: number }
    likelyAI: { count: number; percentage: number }
  }

  themes: ThemeCluster[]

  pipelineFunnel: PipelineFunnel

  spreadAnalysis: {
    peakHour: number // hour index within the 7-day window
    velocityTrend: 'accelerating' | 'steady' | 'decelerating'
    platformBreakdown: Record<string, number>
  }

  responsePosture: 'engage' | 'monitor' | 'ignore' | 'escalate'
  responseRationale: string
  suggestedActions: string[]
  evidenceGaps: string[]
  confidence: 'low' | 'medium' | 'high'
}

// ── Full Analysis Result (returned by API) ───────────────────────────────

/** Client-safe post (same as SocialPost — no ground truth to strip) */
export type PostForClient = SocialPost

export interface FullAnalysisResult {
  brief: CrisisIntelligenceBrief
  posts: PostForClient[]
  sentimentResults: SentimentResult[]
  themes: ThemeCluster[]
  aiDetection: AIDetectionResult[] // only for negative posts
}

// ── Preflight ────────────────────────────────────────────────────────────

export interface ReputationPulsePreflight {
  user: {
    name: string
    email: string
    role: string
  }
}

// ── Interview (Sandy conversational layer) ───────────────────────────────

export type RepPulsePhase =
  | 'loading'
  | 'ready'
  | 'deep-dive'

export interface RepPulseInterviewState {
  phase: RepPulsePhase
  userRole: string | null
}

export interface RepPulseInterviewRequest {
  messages: { role: 'user' | 'assistant'; content: string }[]
  preflight: ReputationPulsePreflight
  interviewState: RepPulseInterviewState
  brief?: CrisisIntelligenceBrief | null
}
