/**
 * GET /api/dashboard
 *
 * Returns role-appropriate real stats for the home dashboard.
 * Replaces the STUDENT_PROFILES / EDUCATOR_PROFILES hardcoded constants in page.tsx.
 *
 * STUDENT response: recentSessions[]
 * EDUCATOR response: toolsPublished, activeStudents, recentActivity[]
 * ADMIN (no tools) response: isExecutiveBriefing=true, platform-wide KPIs + toolsByCategory
 * ADMIN (has tools) response: falls through to educator view
 */

import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../lib/server-auth'
import { subDays, formatDistanceToNow } from 'date-fns'
import {
  getStudentSessions,
  getStudentUpcomingAssignments,
  getSessionMetrics,
  getEducatorTools,
  getEducatorCourses,
  getEducatorActivityData,
  getScoreEventsForSessions,
  getAdminPlatformStats,
} from '../../lib/dashboard-service'

export const runtime = 'nodejs'

// ─── helpers ──────────────────────────────────────────────────────────────────

function relativeDate(d: Date): string {
  return formatDistanceToNow(d, { addSuffix: true })
}

// ─── student ──────────────────────────────────────────────────────────────────

async function getStudentDashboard(userId: string) {
  // All sessions — lightweight select + upcoming assignments — parallel
  const [sessions, assignmentRows] = await Promise.all([
    getStudentSessions(userId),
    getStudentUpcomingAssignments(userId),
  ])

  // MetricEvents for the most recent 8 sessions (score + topic)
  const recentRaw = sessions.slice(0, 8)
  const recentIds = recentRaw.map((s) => s.id)

  const recentMetrics = await getSessionMetrics(recentIds)

  // Build per-session score + topic maps
  const latestScoreBySession = new Map<string, number>()
  const topicBySession = new Map<string, string>()
  for (const e of recentMetrics) {
    if (!e.sessionId) continue
    if (e.metricName === 'score') {
      const val = Number(e.metricValue)
      if (Number.isFinite(val)) latestScoreBySession.set(e.sessionId, val)
    }
    if (e.metricName === 'topic') {
      topicBySession.set(e.sessionId, e.metricValue)
    }
  }

  const recentSessions = recentRaw.map((s) => ({
    toolId: s.tool.id,
    toolName: s.tool.name,
    toolCategory: s.tool.category,
    date: relativeDate(s.startedAt),
    score: latestScoreBySession.get(s.id) ?? null,
    topic: topicBySession.get(s.id) ?? null,
  }))

  const assignments = assignmentRows.map((a) => ({
    id: a.id,
    title: a.title,
    toolId: a.tool?.id ?? null,
    toolName: a.tool?.name ?? null,
    courseTitle: a.course.title,
    courseCode: a.course.courseCode,
    dueAt: a.dueAt?.toISOString() ?? null,
    rubricId: a.rubricId ?? null,
  }))

  return NextResponse.json({
    role: 'STUDENT',
    recentSessions,
    assignments,
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
}

// ─── educator / admin ─────────────────────────────────────────────────────────

async function getEducatorDashboard(userId: string, userTitle?: string | null) {
  const thirtyDaysAgo = subDays(new Date(), 30)
  const staleQueueThreshold = new Date(Date.now() - 48 * 60 * 60 * 1000)

  // Phase 1: tools + courses in parallel
  const [myTools, myCourses] = await Promise.all([
    getEducatorTools(userId),
    getEducatorCourses(userId),
  ])

  const myToolIds = myTools.map((t) => t.id)
  const toolsPublished = myToolIds.length
  const courseIds = myCourses.map((c) => c.id)

  // Phase 2: activity (if tools exist) + course health (if courses exist) — all parallel
  const [activeStudentRows, recentSessionRows, engagedUsers, strugglingStudents, sessionScoresByCourse, atRiskRecords, staleGradingQueueCount] =
    await getEducatorActivityData(myToolIds, courseIds, thirtyDaysAgo, staleQueueThreshold)

  // Phase 3: scores for recent sessions (depends on phase 2)
  const recentIds = recentSessionRows.map((s) => s.id)
  const recentScoreEvents = await getScoreEventsForSessions(recentIds)

  const latestScoreMap = new Map<string, number>()
  for (const e of recentScoreEvents) {
    if (e.sessionId && !latestScoreMap.has(e.sessionId)) {
      const val = Number(e.metricValue)
      if (Number.isFinite(val)) latestScoreMap.set(e.sessionId, val)
    }
  }

  const recentActivity = recentSessionRows.map((s) => ({
    studentName: s.user?.name ?? 'Unknown',
    toolName: s.tool.name,
    date: relativeDate(s.startedAt),
    score: latestScoreMap.get(s.id) ?? null,
  }))

  // Build courseHealth from real data
  const engagedByCourse = new Map<string, number>()
  for (const s of engagedUsers) {
    if (!s.courseId) continue
    engagedByCourse.set(s.courseId, (engagedByCourse.get(s.courseId) ?? 0) + 1)
  }
  const atRiskByCourse = new Map<string, number>()
  for (const s of strugglingStudents) {
    atRiskByCourse.set(s.courseId, (atRiskByCourse.get(s.courseId) ?? 0) + 1)
  }
  // Real avgScore per course from scored sessions
  const avgScoreByCourse = new Map<string, number>()
  for (const row of sessionScoresByCourse) {
    if (row.courseId && row._avg.score != null) {
      avgScoreByCourse.set(row.courseId, Math.round(row._avg.score * 100))
    }
  }
  const courseHealth = myCourses.map((c) => {
    const enrolled = c._count.enrollments
    const engaged = engagedByCourse.get(c.id) ?? 0
    return {
      code: c.courseCode,
      title: c.title,
      enrolled,
      engagementPct: enrolled > 0 ? Math.round((engaged / enrolled) * 100) : 0,
      avgScore: avgScoreByCourse.get(c.id) ?? 0,
      atRiskCount: atRiskByCourse.get(c.id) ?? 0,
    }
  })

  // Real at-risk list from StudentObjectiveProgress
  const atRisk = atRiskRecords.map((r) => ({
    studentName: r.student.name,
    studentEmail: r.student.email,
    objectiveTitle: r.objective.title,
    masteryLevel: r.masteryLevel,
    flaggedForReview: r.flaggedForReview,
    lastSeen: relativeDate(r.lastSeen),
  }))

  return NextResponse.json({
    role: 'EDUCATOR',
    title: userTitle ?? null,
    toolsPublished,
    activeStudents: activeStudentRows.length,
    gradingQueueStale: staleGradingQueueCount,
    recentActivity,
    courseHealth,
    atRisk,
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
}

// ─── admin executive dashboard ────────────────────────────────────────────────

async function getAdminDashboard(userId: string, userTitle?: string | null) {
  // If this admin has published tools, show the educator-style view instead
  const myTools = await getEducatorTools(userId)
  if (myTools.length > 0) {
    return getEducatorDashboard(userId, userTitle)
  }

  // Executive admin — return platform-wide stats
  const [totalStudents, totalSessions, totalToolCount, recentSessionRows, toolCategories, studyGroupRows] =
    await getAdminPlatformStats()

  const recentIds = recentSessionRows.map((s) => s.id)
  const recentScoreEvents = await getScoreEventsForSessions(recentIds)

  const latestScoreMap = new Map<string, number>()
  for (const e of recentScoreEvents) {
    if (e.sessionId && !latestScoreMap.has(e.sessionId)) {
      const val = Number(e.metricValue)
      if (Number.isFinite(val)) latestScoreMap.set(e.sessionId, val)
    }
  }

  const recentActivity = recentSessionRows.map((s) => ({
    studentName: s.user?.name ?? 'Unknown',
    toolName: s.tool.name,
    toolCategory: s.tool.category,
    date: relativeDate(s.startedAt),
    score: latestScoreMap.get(s.id) ?? null,
  }))

  const toolsByCategory = toolCategories.map((t) => ({
    category: t.category,
    count: t._count._all,
  }))

  const studyGroupSplit = {
    control: studyGroupRows.find((r) => r.studyGroup === 'control')?._count._all ?? 0,
    treatment: studyGroupRows.find((r) => r.studyGroup === 'treatment')?._count._all ?? 0,
    unassigned: totalStudents - studyGroupRows.reduce((s, r) => s + r._count._all, 0),
  }

  return NextResponse.json({
    role: 'ADMIN',
    isExecutiveBriefing: true,
    title: userTitle ?? null,
    toolsPublished: 0,
    totalStudents,
    totalSessions,
    totalTools: totalToolCount,
    toolsByCategory,
    recentActivity,
    studyGroupSplit,
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
}

// ─── handler ──────────────────────────────────────────────────────────────────

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  if (user.role === 'STUDENT') return getStudentDashboard(user.id)
  if (user.role === 'ADMIN') return getAdminDashboard(user.id, user.title)
  return getEducatorDashboard(user.id, user.title)
})
