/**
 * GET /api/analytics/faculty/tool-comparison?courseId=<id>
 *
 * For each tool linked to the course (CourseToolLink):
 *   - toolId, toolName, toolType, difficultyLevel
 *   - sessionCount
 *   - uniqueStudents (distinct userId)
 *   - avgScore (mean ToolSession.score, null if none)
 *   - completionRate (exitReason="completed" / sessions with exitReason set, null if none)
 *   - avgDurationMinutes (mean durationSeconds / 60, null if none)
 *
 * Response: { tools: ToolComparisonRow[] } sorted by sessionCount desc
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

  // Fetch all tools linked to the course
  const links = await prisma.courseToolLink.findMany({
    where: { courseId },
    select: {
      toolId: true,
      tool: {
        select: {
          id: true,
          name: true,
          toolType: true,
          difficultyLevel: true,
        },
      },
    },
  })

  if (links.length === 0) {
    return NextResponse.json({ tools: [] }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  const toolIds = links.map(l => l.toolId)

  // Fetch all sessions for these tools in this course (FERPA: exclude sensitive)
  const sessions = await prisma.toolSession.findMany({
    where: {
      courseId,
      toolId: { in: toolIds },
      sensitiveSession: false,
    },
    select: {
      toolId: true,
      userId: true,
      score: true,
      exitReason: true,
      durationSeconds: true,
    },
  })

  // Build per-tool aggregates
  type ToolAgg = {
    sessionCount: number
    userIds: Set<string>
    scoreSum: number
    scoreCount: number
    completedSessions: number
    exitReasonSessions: number
    durationSum: number
    durationCount: number
  }

  const aggMap = new Map<string, ToolAgg>()
  for (const link of links) {
    aggMap.set(link.toolId, {
      sessionCount: 0,
      userIds: new Set(),
      scoreSum: 0,
      scoreCount: 0,
      completedSessions: 0,
      exitReasonSessions: 0,
      durationSum: 0,
      durationCount: 0,
    })
  }

  for (const s of sessions) {
    const agg = aggMap.get(s.toolId)
    if (!agg) continue
    agg.sessionCount++
    if (s.userId) agg.userIds.add(s.userId)
    if (s.score !== null) {
      agg.scoreSum += s.score
      agg.scoreCount++
    }
    if (s.exitReason !== null) {
      agg.exitReasonSessions++
      if (s.exitReason === 'completed') agg.completedSessions++
    }
    if (s.durationSeconds !== null) {
      agg.durationSum += s.durationSeconds
      agg.durationCount++
    }
  }

  const tools = links
    .map(link => {
      const agg = aggMap.get(link.toolId)!
      return {
        toolId: link.tool.id,
        toolName: link.tool.name,
        toolType: link.tool.toolType,
        difficultyLevel: link.tool.difficultyLevel,
        sessionCount: agg.sessionCount,
        uniqueStudents: agg.userIds.size,
        avgScore:
          agg.scoreCount > 0
            ? Math.round((agg.scoreSum / agg.scoreCount) * 1000) / 1000
            : null,
        completionRate:
          agg.exitReasonSessions > 0
            ? Math.round((agg.completedSessions / agg.exitReasonSessions) * 1000) / 1000
            : null,
        avgDurationMinutes:
          agg.durationCount > 0
            ? Math.round((agg.durationSum / agg.durationCount / 60) * 10) / 10
            : null,
      }
    })
    .sort((a, b) => b.sessionCount - a.sessionCount)

  return NextResponse.json({ tools }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
