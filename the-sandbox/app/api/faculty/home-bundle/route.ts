// PERF-AUDIT (Sprint 4, 2026-04-04): Bundle approach is STILL OPTIMAL.
// This route consolidates 5 data sources (briefing, dashboard metrics, homepage
// v2 data, day lifecycle, async tasks) into a single request. All 5 are user-specific,
// fetched together on faculty homepage load, and share the same auth context.
// SWR client-side caching (added Sprint 3) handles dedup + stale-while-revalidate,
// so the bundle avoids 5 parallel requests on page mount. Splitting would increase
// round-trips without improving cache granularity since all data shares the same
// private, per-user TTL. No changes needed.
//
// ─── Faculty Homepage Bundle ────────────────────────────────────
// GET /api/faculty/home-bundle
// Consolidates 5 individual API calls into one request.
// Uses Promise.allSettled so partial failures don't blank the page.

import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { getBriefing } from '../../../lib/briefing-service'
import { getFacultyHomepageV2Data } from '../../../lib/faculty/homepage-aggregator'
import { getDayLifecycleData, getUserAsyncTasks } from '../../../lib/faculty/day-lifecycle-service'
import {
  getEducatorTools,
  getEducatorCourses,
  getEducatorActivityData,
  getScoreEventsForSessions,
} from '../../../lib/dashboard-service'
import { formatDistanceToNow } from 'date-fns'

export const runtime = 'nodejs'

async function getEducatorDashboardData(userId: string) {
  const staleQueueThreshold = new Date(Date.now() - 48 * 60 * 60 * 1000)

  const [myTools, myCourses] = await Promise.all([
    getEducatorTools(userId),
    getEducatorCourses(userId),
  ])

  const myToolIds = myTools.map(t => t.id)
  const courseIds = myCourses.map(c => c.id)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [activeStudentRows, recentSessionRows, engagedUsers, strugglingStudents, sessionScoresByCourse, atRiskRecords, staleGradingQueueCount] =
    await getEducatorActivityData(myToolIds, courseIds, thirtyDaysAgo, staleQueueThreshold)

  const recentIds = recentSessionRows.map(s => s.id)
  const recentScoreEvents = await getScoreEventsForSessions(recentIds)

  const latestScoreMap = new Map<string, number>()
  for (const e of recentScoreEvents) {
    if (e.sessionId && !latestScoreMap.has(e.sessionId)) {
      const val = Number(e.metricValue)
      if (Number.isFinite(val)) latestScoreMap.set(e.sessionId, val)
    }
  }

  const engagedByCourse = new Map<string, number>()
  for (const s of engagedUsers) {
    if (!s.courseId) continue
    engagedByCourse.set(s.courseId, (engagedByCourse.get(s.courseId) ?? 0) + 1)
  }
  const atRiskByCourse = new Map<string, number>()
  for (const s of strugglingStudents) {
    atRiskByCourse.set(s.courseId, (atRiskByCourse.get(s.courseId) ?? 0) + 1)
  }
  const avgScoreByCourse = new Map<string, number>()
  for (const row of sessionScoresByCourse) {
    if (row.courseId && row._avg.score != null) {
      avgScoreByCourse.set(row.courseId, Math.round(row._avg.score * 100))
    }
  }

  const courseHealth = myCourses.map(c => {
    const enrolled = c._count.enrollments
    const engaged = engagedByCourse.get(c.id) ?? 0
    return {
      id: c.id,
      code: c.courseCode,
      title: c.title,
      enrolled,
      engagementPct: enrolled > 0 ? Math.round((engaged / enrolled) * 100) : 0,
      avgScore: avgScoreByCourse.get(c.id) ?? 0,
      atRiskCount: atRiskByCourse.get(c.id) ?? 0,
    }
  })

  return {
    toolsPublished: myToolIds.length,
    activeStudents: activeStudentRows.length,
    gradingQueueStale: staleGradingQueueCount,
    courseHealth,
  }
}

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const userId = auth.user.id

  const [briefingRes, dashboardRes, homepageRes, dayLifecycleRes, tasksRes] =
    await Promise.allSettled([
      getBriefing(userId),
      getEducatorDashboardData(userId),
      getFacultyHomepageV2Data(userId),
      getDayLifecycleData(userId),
      getUserAsyncTasks(userId),
    ])

  return NextResponse.json({
    briefing: briefingRes.status === 'fulfilled' ? briefingRes.value : null,
    dashboard: dashboardRes.status === 'fulfilled' ? dashboardRes.value : null,
    homepage: homepageRes.status === 'fulfilled' ? homepageRes.value : null,
    dayLifecycle: dayLifecycleRes.status === 'fulfilled' ? dayLifecycleRes.value : null,
    tasks: tasksRes.status === 'fulfilled' ? tasksRes.value : [],
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})