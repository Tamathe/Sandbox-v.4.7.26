/**
 * GET /api/analytics/faculty/course-health-trend?courseId=<id>
 *
 * Returns last 8 weeks of course health data:
 *   - week: ISO week label (e.g. "Mar 10")
 *   - avgScore: mean ToolSession.score ×100 for that week's sessions, null if none
 *   - atRiskCount: distinct students with no session that week OR avgScore < 0.4 that week
 *   - sessionCount: total sessions that week
 *
 * Response: { weeks: WeekRow[] }
 *
 * Auth: EDUCATOR or ADMIN
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure } from '../../../../lib/server-auth'
import { prisma } from '../../../../lib/prisma'
import { withErrorHandling } from '../../../../lib/api-utils'

export const runtime = 'nodejs'

function weekLabel(date: Date): string {
  // "Mar 10" style — Monday of the ISO week
  const d = new Date(date)
  const day = d.getDay()
  // Shift to Monday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getWeekMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const courseId = req.nextUrl.searchParams.get('courseId')
  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }

  // Build 8-week window: Monday of current week going back 7 weeks
  const now = new Date()
  const thisMonday = getWeekMonday(now)
  const weeks: { monday: Date; label: string }[] = []
  for (let i = 7; i >= 0; i--) {
    const monday = new Date(thisMonday)
    monday.setDate(thisMonday.getDate() - i * 7)
    weeks.push({ monday, label: weekLabel(monday) })
  }
  const windowStart = weeks[0].monday
  const windowEnd = new Date(thisMonday)
  windowEnd.setDate(thisMonday.getDate() + 7)

  // Fetch all sessions in this course within the window (FERPA: exclude sensitive)
  const sessions = await prisma.toolSession.findMany({
    where: {
      courseId,
      sensitiveSession: false,
      startedAt: { gte: windowStart, lt: windowEnd },
    },
    select: {
      userId: true,
      startedAt: true,
      score: true,
    },
  })

  // Fetch enrolled students in this course for at-risk counting
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseId },
    select: { studentId: true },
  })
  const enrolledIds = new Set(enrollments.map((e: { studentId: string }) => e.studentId))

  // Aggregate per week
  type WeekAgg = {
    sessions: { userId: string | null; score: number | null }[]
  }
  const weekMap = new Map<string, WeekAgg>()
  for (const w of weeks) {
    weekMap.set(w.label, { sessions: [] })
  }

  for (const s of sessions) {
    const monday = getWeekMonday(s.startedAt)
    const label = weekLabel(monday)
    const agg = weekMap.get(label)
    if (agg) {
      agg.sessions.push({ userId: s.userId, score: s.score })
    }
  }

  const result = weeks.map(w => {
    const agg = weekMap.get(w.label)!
    const sessionCount = agg.sessions.length

    // avgScore: mean of non-null scores ×100
    const scored = agg.sessions.filter(s => s.score !== null)
    const avgScore =
      scored.length > 0
        ? Math.round((scored.reduce((sum, s) => sum + s.score!, 0) / scored.length) * 100)
        : null

    // atRiskCount: enrolled students who either had no session this week
    //              OR whose avg score this week was < 0.4
    const studentScoreMap = new Map<string, number[]>()
    for (const s of agg.sessions) {
      if (!s.userId) continue
      if (!studentScoreMap.has(s.userId)) studentScoreMap.set(s.userId, [])
      if (s.score !== null) studentScoreMap.get(s.userId)!.push(s.score)
    }

    let atRiskCount = 0
    for (const studentId of enrolledIds) {
      const scores = studentScoreMap.get(studentId)
      if (!scores || scores.length === 0) {
        // No session this week
        atRiskCount++
      } else {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length
        if (avg < 0.4) atRiskCount++
      }
    }

    return {
      week: w.label,
      avgScore,
      atRiskCount,
      sessionCount,
    }
  })

  return NextResponse.json({ weeks: result }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
