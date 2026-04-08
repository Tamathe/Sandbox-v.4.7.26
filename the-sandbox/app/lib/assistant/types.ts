// ─── Assistant Service Types ─────────────────────────────────
// Shared types extracted from assistant service files.
// Import via: import type { ... } from './types'

import type { CalendarEvent } from './providers'

// ─── Rules Service ──────────────────────────────────────────

export interface ParsedRule {
  ruleType: string
  structured: Record<string, unknown>
  expiresAt?: Date
}

export interface ActiveRule {
  id: string
  naturalText: string
  ruleType: string
  structured: Record<string, unknown>
}

// ─── Email Insight Service ──────────────────────────────────

export interface EmailInsight {
  type: 'email-action'
  icon: string            // lucide icon name
  title: string
  detail: string
  actionType: 'sandy-message'
  actionLabel: string
  sandyMessage: string
  urgency: 'high' | 'medium' | 'low'
}

// ─── Email Follow-Up Service ────────────────────────────────

export interface FollowUpCandidate {
  emailId: string
  draftId: string
  threadId: string | null
  subject: string
  recipient: string
  recipientAddress: string
  approvedAt: Date
  daysSinceApproval: number
  suggestedAction: string
}

// ─── Email Urgency Service ──────────────────────────────────

export type UrgencyBucket = 'respond-today' | 'this-week' | 'when-free' | 'archive'

export interface UrgencyScore {
  score: number           // 0-100
  bucket: UrgencyBucket
  reasons: string[]
}

// ─── Email Thread Summary Service ───────────────────────────

export interface ThreadSummary {
  threadId: string
  messageCount: number
  summary: string           // 2-3 sentences
  keyDecisions: string[]    // Bullet points of decisions/action items
  lastActivity: Date
  needsResponse: boolean    // Does the thread end with a question to the user?
  cachedAt: Date
}

// ─── Email Commons Bridge Service ───────────────────────────

export interface ThreadStallSignal {
  threadId: string
  participantCount: number
  messageCount: number
  isCircular: boolean
  isDecisionBlocked: boolean
  suggestedRoomType: 'CHALLENGE' | 'STUDY' | 'TEACHBACK' | null
  suggestedTopic: string
  suggestion: string
}

// ─── Email Compose Service ──────────────────────────────────

export interface ComposeContext {
  suggestedRecipient?: { name: string; email: string; role: string }
  suggestedSubject?: string
  suggestedTone: 'polished' | 'warm' | 'concise'
  pageContext: string
  relatedCourse?: string
  relatedStudent?: string
  knownContacts: { name: string; email: string; role: string; context: string }[]
}

// ─── Email Rule Learner ─────────────────────────────────────

export interface DraftPattern {
  category: string              // email category e.g. 'student', 'admin'
  commonTone: string            // e.g. 'warm, includes next steps'
  approvalRate: number          // 0–1
  sampleCount: number           // how many drafts analyzed
  proposedRule: string          // natural language rule
  confidence: number            // 0–1
}

// ─── Email Mention Service ──────────────────────────────────

export type MentionType = 'ACTION_REQUESTED' | 'QUESTION' | 'RECOGNITION' | 'FYI_MENTION'

export interface EmailMention {
  emailId: string
  from: string
  fromAddress: string
  subject: string
  mentionType: MentionType
  excerpt: string
  confidence: number
  suggestedAction: string | null
  receivedAt: Date
}

export interface MentionSummary {
  total: number
  actionRequired: number
  questions: number
  recognitions: number
  topMentions: EmailMention[]
}

// ─── Cross-System Service ───────────────────────────────────

import type { CourseContext } from '../types'
export type { CourseContext }

export type AssistantCourseContext = Required<Pick<CourseContext, 'courseId' | 'courseCode' | 'title' | 'relationship'>>

export interface SenderContext {
  isPlatformUser: boolean
  userId?: string
  name?: string
  role?: string
  courses: CourseContext[]
}

export interface CrossSystemContext {
  sender: SenderContext
  relatedEvents: CalendarEvent[]
  relatedCourses: CourseContext[]
  summary: string
}

// ─── Scheduling Service ─────────────────────────────────────

export interface MeetingOption {
  index: number
  start: Date
  end: Date
  label: string // "Tuesday Mar 25, 11:00 AM – 11:30 AM"
  score: number // higher = better (earlier in week, mid-morning preferred)
}

export interface FindTimeInput {
  requesterId: string
  targetEmail: string
  durationMinutes: number
  startDate: Date
  endDate: Date
}

export interface BookMeetingInput {
  requesterId: string
  option: MeetingOption
  title: string
  attendees: string[]
}

// ─── Knowledge Gateway ──────────────────────────────────────

export interface KnowledgeResult {
  content: string
  source: string       // "course:TEK-100" | "uknow" | "sharepoint:registrar" | "service:financial-aid"
  sourceLabel: string  // human-readable label
  similarity: number
  url?: string
}

export interface KnowledgeQueryInput {
  userId: string
  query: string
  providers?: string[] // filter: ["courses", "uknow", "sharepoint", "services"]
  topK?: number
}
