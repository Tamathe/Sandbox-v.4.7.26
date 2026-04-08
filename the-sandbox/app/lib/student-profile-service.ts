import { prisma } from './prisma'
import {
  LOW_SCORE_THRESHOLD, LOW_SCORE_RISK_WEIGHT,
  INACTIVE_DAYS_THRESHOLD, INACTIVE_RISK_WEIGHT,
  HIGH_ABANDON_RATE, ABANDON_RISK_WEIGHT,
  NEGATIVE_VELOCITY_THRESHOLD, VELOCITY_RISK_WEIGHT,
} from './student-risk-constants'

/**
 * Upserts a StudentProfile for the given user based on their recent session history.
 * Called non-blockingly after each scored session. FERPA-safe: uses only non-sensitive sessions.
 */
export async function upsertStudentProfile(userId: string): Promise<void> {
  // 1. Fetch recent sessions (last 30 days, non-sensitive, scored only)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const sessions = await prisma.toolSession.findMany({
    where: {
      userId,
      sensitiveSession: false,
      scoredAt: { not: null },
      startedAt: { gte: thirtyDaysAgo },
    },
    include: { tool: { select: { toolType: true } } },
    orderBy: { startedAt: 'desc' },
    take: 100,
  })

  if (sessions.length === 0) return

  // 2. Compute preferredModality — which tool type appears most
  const typeCounts = new Map<string, number>()
  for (const s of sessions) {
    typeCounts.set(s.tool.toolType, (typeCounts.get(s.tool.toolType) ?? 0) + 1)
  }
  const preferredModality = [...typeCounts.entries()]
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  // 3. avgSessionLength — mean of non-null durationSeconds
  const durSessions = sessions.filter(s => s.durationSeconds != null)
  const avgSessionLength = durSessions.length > 0
    ? Math.round(durSessions.reduce((sum, s) => sum + s.durationSeconds!, 0) / durSessions.length)
    : null

  // 4. peakEngagementHour — group scored sessions by start hour, find highest avg score
  const hourScores = new Map<number, number[]>()
  for (const s of sessions) {
    if (s.score == null) continue
    const hour = s.startedAt.getHours()
    hourScores.set(hour, [...(hourScores.get(hour) ?? []), s.score])
  }
  let peakEngagementHour: number | null = null
  let bestAvg = -1
  for (const [hour, scores] of hourScores.entries()) {
    if (scores.length < 2) continue // need at least 2 data points
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    if (avg > bestAvg) { bestAvg = avg; peakEngagementHour = hour }
  }

  // 5. learningVelocity — slope of score over time (last week avg vs prior week avg)
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const thisWeek = sessions.filter(s => s.score != null && s.startedAt >= oneWeekAgo)
  const priorWeek = sessions.filter(s => s.score != null && s.startedAt < oneWeekAgo)
  let learningVelocity: number | null = null
  if (thisWeek.length >= 2 && priorWeek.length >= 2) {
    const thisAvg = thisWeek.reduce((sum, s) => sum + s.score!, 0) / thisWeek.length
    const priorAvg = priorWeek.reduce((sum, s) => sum + s.score!, 0) / priorWeek.length
    learningVelocity = Math.round((thisAvg - priorAvg) * 100) / 100
  }

  // 6. riskScore — composite of recent signals
  const recentSessions = sessions.slice(0, 10)
  const recentScored = recentSessions.filter(s => s.score != null)
  const recentAvg = recentScored.length > 0
    ? recentScored.reduce((sum, s) => sum + s.score!, 0) / recentScored.length
    : null
  const daysSinceLastSession = sessions[0]
    ? Math.floor((Date.now() - sessions[0].startedAt.getTime()) / (1000 * 60 * 60 * 24))
    : 999
  const abandonRate = sessions.filter(s => s.exitReason === 'abandoned').length / sessions.length

  let riskScore = 0
  if (recentAvg != null && recentAvg < LOW_SCORE_THRESHOLD) riskScore += LOW_SCORE_RISK_WEIGHT
  if (daysSinceLastSession > INACTIVE_DAYS_THRESHOLD) riskScore += INACTIVE_RISK_WEIGHT
  if (abandonRate > HIGH_ABANDON_RATE) riskScore += ABANDON_RISK_WEIGHT
  if (learningVelocity != null && learningVelocity < NEGATIVE_VELOCITY_THRESHOLD) riskScore += VELOCITY_RISK_WEIGHT
  riskScore = Math.min(1, riskScore)

  // 7. topConceptsThisWeek
  const topConceptsThisWeek = [...new Set(
    thisWeek.flatMap(s => s.conceptsTouched ?? [])
  )].slice(0, 10)

  // 8. Upsert
  await prisma.studentProfile.upsert({
    where: { userId },
    create: {
      userId,
      preferredModality,
      avgSessionLength,
      peakEngagementHour,
      riskScore,
      riskUpdatedAt: new Date(),
      learningVelocity,
      totalSessionCount: sessions.length,
      lastSessionAt: sessions[0]?.startedAt ?? null,
      topConceptsThisWeek,
    },
    update: {
      preferredModality,
      avgSessionLength,
      peakEngagementHour,
      riskScore,
      riskUpdatedAt: new Date(),
      learningVelocity,
      totalSessionCount: sessions.length,
      lastSessionAt: sessions[0]?.startedAt ?? null,
      topConceptsThisWeek,
      updatedAt: new Date(),
    },
  })
}
