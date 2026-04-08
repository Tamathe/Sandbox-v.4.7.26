// ─── Commons Service Types ───────────────────────────────────
// Shared types extracted from commons engine and service files.
// Import via: import type { ... } from './types'

import type { LiveRoomPhase, LiveRoomType } from '../../generated/prisma'

// ─── Core Commons Types ─────────────────────────────────────

export interface PlayerScore {
  userId: string
  name: string
  score: number
  streak: number
}

export interface LiveRoomSummary {
  id: string
  channelId: string
  type: LiveRoomType
  title: string
  phase: LiveRoomPhase
  hostId: string
  hostName: string
  courseId: string | null
  assignmentId?: string | null
  currentRound: number
  config: LiveRoomConfig
  assessmentMode?: boolean
  participants: Array<{ userId: string; name: string; score: number; streak: number }>
  totalRounds: number
  createdAt: string
  startedAt: string | null
  endedAt: string | null
}

export interface LiveRoomConfig {
  rounds?: number
  timeoutMs?: number
  topic?: string
  difficulty?: string
  assessmentResults?: unknown
}

// ─── Question Service ───────────────────────────────────────

export interface GeneratedQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

// ─── Quiz Import Service ────────────────────────────────────

export interface ImportedQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

// ─── Streak Service ─────────────────────────────────────────

export interface StreakData {
  currentStreak: number       // Consecutive days including today
  longestStreak: number       // All-time best
  totalSessions: number       // Total Commons session participations
  totalMinutes: number        // Estimated total study time
  lastActiveDate: string | null
  isActiveToday: boolean
}

// ─── Suggestion Service ─────────────────────────────────────

export interface LiveRoomSuggestion {
  type: 'exam_prep' | 'group_active' | 'rematch' | 'study_break'
  message: string
  chipLabel: string
  channelId: string
  groupName: string
  topic?: string
  courseId?: string
}

// ─── Engine Configs ─────────────────────────────────────────

export interface CaseStudyConfig {
  topic: string
  readTimeMs?: number       // default 90000 (90s)
  hypothesizeTimeMs?: number  // default 90000 (90s)
  evidencePhaseCount?: number // default 3
}

export interface DebateConfig {
  topic: string
  openingTimeMs?: number   // default 90000 (90s)
  rebuttalTimeMs?: number  // default 60000 (60s)
  closingTimeMs?: number   // default 60000 (60s)
}

export interface FishbowlConfig {
  topic: string
  discussTimeMs?: number // default 300000 (5 min per round)
  innerCircleSize?: number // default 3
}

export interface ImprovConfig {
  topic: string
  performTimeMs?: number  // default 60000 (60s)
  rateTimeMs?: number     // default 30000 (30s)
}

export interface OfficeHoursConfig {
  topic: string
  courseContext?: string
}

export interface PeerReviewConfig {
  topic: string
  prompt: string           // what participants should submit
  rubric?: string[]        // e.g. ["Clarity", "Depth", "Originality"]
  submitTimeMs?: number    // default 180000 (3 min)
  reviewTimeMs?: number    // default 300000 (5 min)
}

export interface ProblemLabConfig {
  topic: string
  solveTimeMs?: number // default 180000 (3 min)
}

export interface SimulationConfig {
  topic: string
  totalTurns: number       // default 5
  turnTimeoutMs: number    // default 120000 (2 min per turn)
  scenarioType?: 'ethical-dilemma' | 'crisis' | 'negotiation' | 'clinical' | 'custom'
  customScenario?: string
}

export interface SpeedMentoringConfig {
  topic: string
  sessionTimeMs?: number // default 600000 (10 min)
}

export interface StudyConfig {
  focusMinutes: number   // default 25
  breakMinutes: number   // default 5
  totalCycles: number    // default 4
  topic?: string
}

export type StudyPhase = 'LOBBY' | 'FOCUS' | 'BREAK' | 'COMPLETE'

export interface TeachBackConfig {
  topic: string
  concepts?: string[]  // Pre-set or AI-generated
  teachTimeMs?: number // default 120000 (2 min)
  rateTimeMs?: number  // default 30000 (30s)
}

export interface WatchConfig {
  eventTitle: string
  eventType: 'game' | 'lecture' | 'campus' | 'other'
  durationMinutes?: number
  topic?: string
}
