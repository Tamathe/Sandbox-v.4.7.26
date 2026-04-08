/**
 * GET /api/analytics/faculty
 *
 * Real aggregated analytics for the requesting educator/admin.
 * Covers: overview stats, per-student breakdown with at-risk flags,
 * per-tool breakdown, and 8-week engagement trend.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import {
  subDays,
  differenceInDays,
  startOfDay,
  format,
  eachWeekOfInterval,
  endOfWeek,
} from 'date-fns'

export const runtime = 'nodejs'

function avgNumeric(values: string[]): number | null {
  const nums = values.map(Number).filter((v) => Number.isFinite(v) && v >= 0 && v <= 100)
  if (nums.length === 0) return null
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
}

/**
 * A student is flagged at-risk if ANY of:
 * - Avg score on their last 5 scored sessions < 65
 * - No sessions at all in the past 14 days
 * - 2+ 'confusion' flags in their last 5 sessions
 */
function computeAtRisk(params: {
  recentScores: number[]
  lastSessionAt: Date | null
  recentFlags: string[]
}): boolean {
  const { recentScores, lastSessionAt, recentFlags } = params
  if (lastSessionAt === null) return false
  if (differenceInDays(new Date(), lastSessionAt) > 14) return true
  if (recentScores.length > 0) {
    const avg =
      recentScores.reduce((a, b) => a + b, 0) / recentScores.length
    if (avg < 65) return true
  }
  const confusionCount = recentFlags.filter((f) => f === 'confusion').length
  if (confusionCount >= 2) return true
  return false
}

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth
  if (user.role === 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

    const thirtyDaysAgo = subDays(new Date(), 30)
    const ninetyDaysAgo = subDays(new Date(), 90)

    // Tools owned by this educator (ADMIN sees all tools)
    const myTools = await prisma.tool.findMany({
      where: user.role === 'ADMIN' ? {} : { creatorId: user.id },
      select: { id: true, name: true },
    })
    const myToolIds = myTools.map((t) => t.id)
    const toolNameById = new Map(myTools.map((t) => [t.id, t.name]))

    if (myToolIds.length === 0) {
      return NextResponse.json({
        overview: { totalSessions: 0, activeStudents: 0, avgScore: null, atRiskCount: 0 },
        engagementTrend: [],
        studentBreakdown: [],
        toolBreakdown: [],
      })
    }

    // All sessions on their tools (last 90 days for performance)
    // sensitiveSession: false — exclude counseling/disability/immigration sessions per FERPA policy
    const sessions = await prisma.toolSession.findMany({
      where: {
        toolId: { in: myToolIds },
        startedAt: { gte: ninetyDaysAgo },
        sensitiveSession: false,
      },
      select: {
        id: true,
        toolId: true,
        userId: true,
        startedAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { startedAt: 'desc' },
    })

    const allIds = sessions.map((s) => s.id)

    // MetricEvents for these sessions
    const allMetrics =
      allIds.length > 0
        ? await prisma.metricEvent.findMany({
            where: { sessionId: { in: allIds } },
            select: { sessionId: true, metricName: true, metricValue: true },
          })
        : []

    const scoreBySession = new Map<string, number>()
    const flagsBySession = new Map<string, string[]>()

    for (const e of allMetrics) {
      if (!e.sessionId) continue
      if (e.metricName === 'score') {
        const val = Number(e.metricValue)
        if (Number.isFinite(val)) scoreBySession.set(e.sessionId, val)
      }
      if (e.metricName === 'flags') {
        flagsBySession.set(e.sessionId, e.metricValue.split(',').filter(Boolean))
      }
    }

    // ── overview ─────────────────────────────────────────────────────────────
    // sensitiveSession: false — exclude counseling/disability/immigration sessions per FERPA policy
    const totalSessions = await prisma.toolSession.count({
      where: { toolId: { in: myToolIds }, sensitiveSession: false },
    })

    const activeStudentIds = new Set(
      sessions
        .filter((s) => s.userId && s.startedAt >= thirtyDaysAgo)
        .map((s) => s.userId!)
    )

    const allScores = [...scoreBySession.values()]
    const avgScore =
      allScores.length > 0
        ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
        : null

    // ── 8-week engagement trend ──────────────────────────────────────────────
    const weeks = eachWeekOfInterval(
      { start: subDays(new Date(), 55), end: new Date() },
      { weekStartsOn: 1 }
    ).slice(-8)

    const engagementTrend = weeks.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
      const weekSessions = sessions.filter(
        (s) => s.startedAt >= weekStart && s.startedAt <= weekEnd
      )
      const weekScores = weekSessions
        .map((s) => scoreBySession.get(s.id))
        .filter((v): v is number => v != null)
      return {
        week: format(weekStart, 'MMM d'),
        sessions: weekSessions.length,
        avgScore:
          weekScores.length > 0
            ? Math.round(weekScores.reduce((a, b) => a + b, 0) / weekScores.length)
            : null,
      }
    })

    // ── per-student breakdown ────────────────────────────────────────────────
    type StudentEntry = {
      studentId: string
      studentName: string
      studentEmail: string
      totalSessions: number
      scores: number[]
      recentScores: number[]        // last 5 scored sessions
      recentFlags: string[]         // flags from last 5 sessions
      lastSessionAt: Date | null
    }

    const studentMap = new Map<string, StudentEntry>()

    for (const s of sessions) {
      if (!s.userId || !s.user) continue
      const entry = studentMap.get(s.userId) ?? {
        studentId: s.userId,
        studentName: s.user.name,
        studentEmail: s.user.email,
        totalSessions: 0,
        scores: [],
        recentScores: [],
        recentFlags: [],
        lastSessionAt: null,
      }

      entry.totalSessions++
      const sc = scoreBySession.get(s.id)
      if (sc != null) entry.scores.push(sc)

      // Track most recent 5 sessions for at-risk logic
      if (entry.totalSessions <= 5) {
        if (sc != null) entry.recentScores.push(sc)
        const flags = flagsBySession.get(s.id) ?? []
        entry.recentFlags.push(...flags)
      }

      if (!entry.lastSessionAt) entry.lastSessionAt = s.startedAt

      studentMap.set(s.userId, entry)
    }

    const studentBreakdown = [...studentMap.values()].map((entry) => {
      const avgScore = avgNumeric(entry.scores.map(String))
      const atRisk = computeAtRisk({
        recentScores: entry.recentScores,
        lastSessionAt: entry.lastSessionAt,
        recentFlags: entry.recentFlags,
      })
      return {
        studentId:     entry.studentId,
        studentName:   entry.studentName,
        studentEmail:  entry.studentEmail,
        sessions:      entry.totalSessions,
        avgScore,
        lastSeen: entry.lastSessionAt
          ? `${differenceInDays(new Date(), entry.lastSessionAt)}d ago`
          : 'Never',
        atRisk,
        engagementDrop: entry.lastSessionAt
          ? differenceInDays(new Date(), entry.lastSessionAt) > 14
          : false,
        gradeDrop:
          entry.recentScores.length >= 3 &&
          avgNumeric(entry.recentScores.map(String)) !== null &&
          avgNumeric(entry.recentScores.map(String))! < 70,
      }
    })

    // Batch-fetch StudentProfile for all students — adds riskBand + velocityLabel
    // FERPA-safe: riskScore is a composite of non-sensitive sessions only (see student-profile-service.ts)
    const studentIds = studentBreakdown.map(s => s.studentId)
    const profiles = studentIds.length > 0
      ? await prisma.studentProfile.findMany({ where: { userId: { in: studentIds } } })
      : []
    const profileByUserId = new Map(profiles.map(p => [p.userId, p]))

    const studentBreakdownWithProfile = studentBreakdown.map(entry => {
      const p = profileByUserId.get(entry.studentId)
      const rs = p?.riskScore ?? null
      const lv = p?.learningVelocity ?? null
      return {
        ...entry,
        riskBand: rs == null ? null : rs < 0.3 ? 'low' : rs < 0.6 ? 'medium' : 'high',
        velocityLabel: lv == null ? null : lv > 0.05 ? 'improving' : lv < -0.05 ? 'declining' : 'stable',
      }
    })

    // Sort: at-risk first, then by session count desc
    studentBreakdownWithProfile.sort((a, b) => {
      if (a.atRisk !== b.atRisk) return a.atRisk ? -1 : 1
      return b.sessions - a.sessions
    })

    // ── per-tool breakdown ───────────────────────────────────────────────────
    const toolMap = new Map<string, { name: string; sessions: number; scores: number[] }>()
    for (const s of sessions) {
      const entry = toolMap.get(s.toolId) ?? {
        name: toolNameById.get(s.toolId) ?? s.toolId,
        sessions: 0,
        scores: [],
      }
      entry.sessions++
      const sc = scoreBySession.get(s.id)
      if (sc != null) entry.scores.push(sc)
      toolMap.set(s.toolId, entry)
    }

    const toolBreakdown = [...toolMap.values()]
      .sort((a, b) => b.sessions - a.sessions)
      .map((t) => ({
        toolName: t.name,
        sessions: t.sessions,
        avgScore:
          t.scores.length > 0
            ? Math.round(t.scores.reduce((a, b) => a + b, 0) / t.scores.length)
            : null,
      }))

    const atRiskCount = studentBreakdownWithProfile.filter((s) => s.atRisk).length

  return NextResponse.json({
    overview: {
      totalSessions,
      activeStudents: activeStudentIds.size,
      avgScore,
      atRiskCount,
    },
    engagementTrend,
    studentBreakdown: studentBreakdownWithProfile,
    toolBreakdown,
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
