/**
 * GET /api/analytics/faculty/session-quality?courseId=<id>
 *
 * For each tool linked to the course, aggregates ToolSession records:
 *   - sessionCount
 *   - avgScore (mean of score where score != null)
 *   - avgDurationMinutes (mean of durationSeconds / 60 where durationSeconds != null)
 *   - completionRate (exitReason = "completed" / total sessions with any exitReason)
 *
 * Returns:
 *   { tools: { toolId, toolName, sessionCount, avgScore, avgDurationMinutes, completionRate }[] }
 *   ordered by sessionCount desc
 *
 * Auth: EDUCATOR or ADMIN
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure } from '../../../../lib/server-auth'
import { prisma } from '../../../../lib/prisma'
import { withErrorHandling } from '../../../../lib/api-utils'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const courseId = req.nextUrl.searchParams.get('courseId')
  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }

  // Fetch all tools linked to this course
  const courseToolLinks = await prisma.courseToolLink.findMany({
    where: { courseId },
    select: {
      toolId: true,
      tool: { select: { id: true, name: true } },
    },
  })

  if (courseToolLinks.length === 0) {
    return NextResponse.json({ tools: [] }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  const toolIds = courseToolLinks.map(l => l.toolId)

  // Fetch all sessions for these tools in this course (FERPA: exclude sensitiveSession)
  const sessions = await prisma.toolSession.findMany({
    where: {
      courseId,
      toolId: { in: toolIds },
      sensitiveSession: false,
    },
    select: {
      toolId: true,
      score: true,
      durationSeconds: true,
      exitReason: true,
    },
  })

  // Build a map of toolId → aggregated stats
  type Stats = {
    toolId: string
    toolName: string
    sessionCount: number
    scoreSum: number
    scoreCount: number
    durationSum: number
    durationCount: number
    completedCount: number
    exitReasonCount: number
  }

  const statsMap = new Map<string, Stats>()
  for (const link of courseToolLinks) {
    statsMap.set(link.toolId, {
      toolId: link.toolId,
      toolName: link.tool.name,
      sessionCount: 0,
      scoreSum: 0,
      scoreCount: 0,
      durationSum: 0,
      durationCount: 0,
      completedCount: 0,
      exitReasonCount: 0,
    })
  }

  for (const s of sessions) {
    if (!s.toolId) continue
    const stat = statsMap.get(s.toolId)
    if (!stat) continue

    stat.sessionCount++

    if (s.score !== null) {
      stat.scoreSum += s.score
      stat.scoreCount++
    }

    if (s.durationSeconds !== null) {
      stat.durationSum += s.durationSeconds
      stat.durationCount++
    }

    if (s.exitReason !== null) {
      stat.exitReasonCount++
      if (s.exitReason === 'completed') {
        stat.completedCount++
      }
    }
  }

  const tools = Array.from(statsMap.values())
    .map(stat => ({
      toolId: stat.toolId,
      toolName: stat.toolName,
      sessionCount: stat.sessionCount,
      avgScore: stat.scoreCount > 0 ? Math.round((stat.scoreSum / stat.scoreCount) * 100) / 100 : null,
      avgDurationMinutes:
        stat.durationCount > 0
          ? Math.round((stat.durationSum / stat.durationCount / 60) * 10) / 10
          : null,
      completionRate:
        stat.exitReasonCount > 0
          ? Math.round((stat.completedCount / stat.exitReasonCount) * 100) / 100
          : null,
    }))
    .sort((a, b) => b.sessionCount - a.sessionCount)

  return NextResponse.json({ tools }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
