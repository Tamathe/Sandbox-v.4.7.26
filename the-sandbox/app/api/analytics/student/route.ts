/**
 * GET /api/analytics/student
 *
 * Real aggregated analytics for the current student.
 * Replaces the hardcoded STUDENT / WEEKLY_PROGRESS / SKILLS / RECENT_SESSIONS
 * constants in app/analytics/student/page.tsx.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import {
  subDays,
  differenceInMinutes,
  format,
  formatDistanceToNow,
  eachWeekOfInterval,
  endOfWeek,
} from 'date-fns'

export const runtime = 'nodejs'

function peakLabel(hour: number): string {
  if (hour === 0) return '12am'
  if (hour < 12) return `${hour}am`
  if (hour === 12) return '12pm'
  return `${hour - 12}pm`
}

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

    const [profile, sessions] = await Promise.all([
      prisma.studentProfile.findUnique({ where: { userId: user.id } }),
      prisma.toolSession.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          startedAt: true,
          endedAt: true,
          bloomLevel: true,
          score: true,
          tool: { select: { id: true, name: true, category: true } },
        },
        orderBy: { startedAt: 'desc' },
      }),
    ])

    const allIds = sessions.map((s) => s.id)

    const allMetrics = allIds.length > 0
      ? await prisma.metricEvent.findMany({
          where: { sessionId: { in: allIds } },
          select: { sessionId: true, metricName: true, metricValue: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        })
      : []

    const scoreBySession = new Map<string, number>()
    const topicBySession = new Map<string, string>()
    const engagementBySession = new Map<string, string>()
    const flagsBySession = new Map<string, string[]>()

    for (const e of allMetrics) {
      if (!e.sessionId) continue
      if (e.metricName === 'score') {
        const val = Number(e.metricValue)
        if (Number.isFinite(val)) scoreBySession.set(e.sessionId, val)
      }
      if (e.metricName === 'topic') topicBySession.set(e.sessionId, e.metricValue)
      if (e.metricName === 'engagement') engagementBySession.set(e.sessionId, e.metricValue)
      if (e.metricName === 'flags') {
        flagsBySession.set(e.sessionId, e.metricValue.split(',').filter(Boolean))
      }
    }

    const weeks = eachWeekOfInterval(
      { start: subDays(new Date(), 55), end: new Date() },
      { weekStartsOn: 1 }
    ).slice(-8)

    const weeklyProgress = weeks.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
      const weekSessions = sessions.filter(
        (s) => s.startedAt >= weekStart && s.startedAt <= weekEnd
      )
      const weekScores = weekSessions
        .map((s) => scoreBySession.get(s.id))
        .filter((v): v is number => v != null)
      const weekMinutes = weekSessions
        .filter((s) => s.endedAt)
        .reduce((sum, s) => sum + differenceInMinutes(s.endedAt!, s.startedAt), 0)
      return {
        week: format(weekStart, 'MMM d'),
        score: weekScores.length > 0
          ? Math.round(weekScores.reduce((a, b) => a + b, 0) / weekScores.length)
          : null,
        minutes: weekMinutes,
        sessions: weekSessions.length,
      }
    })

    const toolMap = new Map<string, { name: string; sessions: number; scores: number[] }>()
    for (const s of sessions) {
      const entry = toolMap.get(s.tool.id) ?? { name: s.tool.name, sessions: 0, scores: [] }
      entry.sessions++
      const sc = scoreBySession.get(s.id)
      if (sc != null) entry.scores.push(sc)
      toolMap.set(s.tool.id, entry)
    }
    const toolBreakdown = [...toolMap.values()]
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 8)
      .map((t) => ({
        toolName: t.name,
        sessions: t.sessions,
        avgScore:
          t.scores.length > 0
            ? Math.round(t.scores.reduce((a, b) => a + b, 0) / t.scores.length)
            : null,
      }))

    const recentSessions = sessions.slice(0, 20).map((s) => ({
      sessionId: s.id,
      toolName: s.tool.name,
      toolCategory: s.tool.category,
      date: formatDistanceToNow(s.startedAt, { addSuffix: true }),
      duration: s.endedAt ? differenceInMinutes(s.endedAt, s.startedAt) : null,
      score: scoreBySession.get(s.id) ?? null,
      topic: topicBySession.get(s.id) ?? null,
      engagement: engagementBySession.get(s.id) ?? null,
      flags: flagsBySession.get(s.id) ?? [],
    }))

    const studentProfile = profile ? (() => {
      const rs = profile.riskScore
      const riskBand = rs == null ? null : rs < 0.3 ? 'low' : rs < 0.6 ? 'medium' : 'high'
      const lv = profile.learningVelocity
      const velocityLabel = lv == null ? null : lv > 0.05 ? 'improving' : lv < -0.05 ? 'declining' : 'stable'
      const peh = profile.peakEngagementHour
      return {
        riskScore: rs,
        riskBand,
        learningVelocity: lv,
        velocityLabel,
        preferredModality: profile.preferredModality,
        peakEngagementHour: peh,
        peakEngagementLabel: peh != null ? peakLabel(peh) : null,
        topConceptsThisWeek: profile.topConceptsThisWeek ?? [],
        avgSessionLength: profile.avgSessionLength,
        lastSessionAt: profile.lastSessionAt?.toISOString() ?? null,
      }
    })() : null

    // ── Cognitive Signals ──────────────────────────────────────────────────────
    const recentSessionIds = sessions.slice(0, 20).map((s) => s.id)

    const observationLogs = recentSessionIds.length > 0
      ? await prisma.learnerObservationLog.findMany({
          where: { sessionId: { in: recentSessionIds } },
          select: {
            sessionId: true,
            cognitiveLoad: true,
            frustrationScore: true,
            bloomLevel: true,
            isProductiveStruggle: true,
          },
        })
      : []

    // Aggregate per session
    type SessionAgg = {
      cogLoads: number[]
      frustrations: number[]
      bloomLevel: number | null
      isProductiveStruggle: boolean
    }
    const sessionAggMap = new Map<string, SessionAgg>()
    for (const log of observationLogs) {
      if (!log.sessionId) continue
      const existing = sessionAggMap.get(log.sessionId) ?? {
        cogLoads: [],
        frustrations: [],
        bloomLevel: null,
        isProductiveStruggle: false,
      }
      if (log.cognitiveLoad != null) existing.cogLoads.push(log.cognitiveLoad)
      if (log.frustrationScore != null) existing.frustrations.push(log.frustrationScore)
      if (existing.bloomLevel == null && log.bloomLevel != null) existing.bloomLevel = log.bloomLevel
      if (log.isProductiveStruggle === true) existing.isProductiveStruggle = true
      sessionAggMap.set(log.sessionId, existing)
    }

    // Build cognitiveSignals array — only sessions that have logs, up to 10
    const cognitiveSignals = sessions
      .slice(0, 20)
      .filter((s) => sessionAggMap.has(s.id))
      .slice(0, 10)
      .map((s) => {
        const agg = sessionAggMap.get(s.id)!
        const avgCognitiveLoad =
          agg.cogLoads.length > 0
            ? agg.cogLoads.reduce((a, b) => a + b, 0) / agg.cogLoads.length
            : null
        const avgFrustration =
          agg.frustrations.length > 0
            ? agg.frustrations.reduce((a, b) => a + b, 0) / agg.frustrations.length
            : null
        return {
          sessionId: s.id,
          toolName: s.tool.name,
          startedAt: s.startedAt.toISOString(),
          avgCognitiveLoad,
          avgFrustration,
          isProductiveStruggle: agg.isProductiveStruggle,
          bloomLevel: s.bloomLevel ?? null,
          score: scoreBySession.get(s.id) ?? null,
        }
      })

  return NextResponse.json({
    weeklyProgress,
    toolBreakdown,
    recentSessions,
    studentProfile,
    cognitiveSignals,
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
