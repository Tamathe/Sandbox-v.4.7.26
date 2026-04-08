// ── Engagement Fingerprint — Engagement Shape Computation ─────────────────────
// Pure function: derives tool diversity, consistency, session metrics,
// and deadline proximity from usage + submission data.

import type { EngagementShape } from './types'

interface SessionInput {
  toolId: string
  startedAt: Date
  durationSeconds: number | null
}

interface SubmissionInput {
  assignmentId: string
  submittedAt: Date | null
}

interface AssignmentInput {
  id: string
  dueAt: Date | null
}

const TOTAL_TOOLS = 76 // Hub tool count

export function computeEngagementShape(
  sessions: SessionInput[],
  submissions: SubmissionInput[],
  assignments: AssignmentInput[],
  since: Date,
  windowDays: number
): EngagementShape {
  // ── Tool diversity ──
  const uniqueTools = new Set(sessions.map((s) => s.toolId)).size
  const toolDiversity = Math.min(1, uniqueTools / TOTAL_TOOLS)

  // ── Consistency score (inverted coefficient of variation) ──
  const dailyCounts = buildDailyCounts(sessions, since, windowDays)
  const mean = dailyCounts.reduce((a, b) => a + b, 0) / (dailyCounts.length || 1)
  const variance = dailyCounts.reduce((s, c) => s + (c - mean) ** 2, 0) / (dailyCounts.length || 1)
  const stdDev = Math.sqrt(variance)
  const cv = mean > 0 ? stdDev / mean : 1
  const consistencyScore = Math.max(0, Math.min(1, 1 - cv / 3))

  // ── Session metrics ──
  const avgSessionMinutes =
    sessions.length > 0
      ? sessions.reduce((s, sess) => s + (sess.durationSeconds || 0) / 60, 0) / sessions.length
      : 0
  const weeks = windowDays / 7
  const sessionsPerWeek = sessions.length / (weeks || 1)

  // ── Deadline proximity ──
  const deadlineProximity = computeDeadlineProximity(submissions, assignments)

  return { toolDiversity, consistencyScore, avgSessionMinutes, sessionsPerWeek, deadlineProximity }
}

function buildDailyCounts(sessions: SessionInput[], since: Date, windowDays: number): number[] {
  const counts = new Array(windowDays).fill(0) as number[]
  const sinceMs = since.getTime()
  const dayMs = 24 * 60 * 60 * 1000

  for (const s of sessions) {
    const dayIndex = Math.floor((s.startedAt.getTime() - sinceMs) / dayMs)
    if (dayIndex >= 0 && dayIndex < windowDays) {
      counts[dayIndex]++
    }
  }
  return counts
}

function computeDeadlineProximity(
  submissions: SubmissionInput[],
  assignments: AssignmentInput[]
): EngagementShape['deadlineProximity'] {
  const assignmentMap = new Map<string, Date>()
  for (const a of assignments) {
    if (a.dueAt) assignmentMap.set(a.id, a.dueAt)
  }

  const leadHours: number[] = []
  let lateCount = 0

  for (const sub of submissions) {
    if (!sub.submittedAt) continue
    const dueAt = assignmentMap.get(sub.assignmentId)
    if (!dueAt) continue
    const leadMs = dueAt.getTime() - sub.submittedAt.getTime()
    const hours = leadMs / (1000 * 60 * 60)
    leadHours.push(hours)
    if (hours < 0) lateCount++
  }

  if (leadHours.length === 0) return 'steady'
  if (lateCount / leadHours.length > 0.3) return 'late'

  const avgLead = leadHours.reduce((a, b) => a + b, 0) / leadHours.length
  if (avgLead > 72) return 'planner'
  if (avgLead > 24) return 'steady'
  return 'crammer'
}
