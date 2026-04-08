// ─── Concierge Service Types ─────────────────────────────────
// Shared types extracted from concierge-service.ts.
// Import via: import type { ... } from './concierge-types'

export type DepartmentStorefrontContext = {
  name: string
  shortName: string
  description: string | null
  collections: { name: string; toolCount: number }[]
  totalTools: number
}

export type BloomAlert = {
  courseCode: string
  dominantLevel: number    // 1–2 = concern
  dominantSince: string    // ISO date string
  daysSince: number
}

export type SRContext = {
  dueCount: number
  topDueConcept: string | null       // most overdue concept slug (human-readable)
  topDueBloomLevel: number | null    // bloom high-water for that concept
  hasRemediationHint: boolean        // whether that concept has a known misconception hint
  daysSinceLastNudge: number | null  // null = never nudged
}

export type FrustrationAlert = {
  toolName: string
  avgFrustration: number  // 0–1
}

export type StudentIntelligence = {
  lowestObjectiveTitle: string | null
  lastSessionScore: number | null
  daysSinceLastSession: number | null
  upcomingDueDates: { title: string; dueAt: Date; courseCode: string }[]
}

export type StudyPlanSummary = {
  courseCode: string
  criticalCount: number
  highCount: number
  topConcept: string | null
  totalMinutes: number
  generatedAt: string
}

export type WeeklyRecapSummary = {
  totalSessions: number
  totalMinutes: number
  improvedCount: number
  declinedCount: number
  overdueReviews: number
  topInsight: string | null
}

export type ExamForgeNudge = {
  assignmentTitle: string
  courseCode: string
  courseId: string
  assignmentId: string
  daysUntilDue: number
}

export type ReviewContext = {
  toolName: string
  toolDescription: string
}

export type ConversationMemoryItem = {
  title: string
  content: string
  courseCode: string | null
  createdAt: Date
}

export type ToolDetailContext = {
  name: string
  shortDescription: string
  category: string
  toolType: string
  creatorName: string
  courseLinks: string[]
}

export type AssistantIntent = 'scheduling' | 'email' | 'tasks' | 'rules' | 'staff-briefing' | 'staff-budget' | 'policy' | 'communication' | 'committee-minutes' | null

export interface AssistantContext {
  upcomingEvents: string
  emailSummary: string
  overdueTasks: string
  activeRules: string
  recentActions: string
}
