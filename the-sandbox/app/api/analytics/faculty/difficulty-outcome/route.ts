/**
 * GET /api/analytics/faculty/difficulty-outcome?courseId=<id>
 *
 * For each tool linked to the course (CourseToolLink), returns:
 *   - toolId, toolName
 *   - difficultyLevel (Tool.difficultyLevel)
 *   - avgScore  (mean ToolSession.score for sessions in this course, null if none scored)
 *   - sessionCount
 *   - completionRate (exitReason="completed" / sessions with any exitReason)
 *
 * Response: { tools: ToolDifficultyOutcome[] }
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
          difficultyLevel: true,
        },
      },
    },
  })

  if (links.length === 0) {
    return NextResponse.json({ tools: [] })
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
      score: true,
      exitReason: true,
    },
  })

  // Build per-tool aggregates
  type ToolAgg = {
    scoreSum: number
    scoreCount: number
    totalSessions: number
    completedSessions: number
    exitReasonSessions: number
  }
  const aggMap = new Map<string, ToolAgg>()
  for (const link of links) {
    aggMap.set(link.toolId, {
      scoreSum: 0,
      scoreCount: 0,
      totalSessions: 0,
      completedSessions: 0,
      exitReasonSessions: 0,
    })
  }

  for (const s of sessions) {
    const agg = aggMap.get(s.toolId)
    if (!agg) continue
    agg.totalSessions++
    if (s.score !== null) {
      agg.scoreSum += s.score
      agg.scoreCount++
    }
    if (s.exitReason !== null) {
      agg.exitReasonSessions++
      if (s.exitReason === 'completed') {
        agg.completedSessions++
      }
    }
  }

  const tools = links.map(link => {
    const agg = aggMap.get(link.toolId)!
    return {
      toolId: link.tool.id,
      toolName: link.tool.name,
      difficultyLevel: link.tool.difficultyLevel,
      avgScore:
        agg.scoreCount > 0
          ? Math.round((agg.scoreSum / agg.scoreCount) * 1000) / 1000
          : null,
      sessionCount: agg.totalSessions,
      completionRate:
        agg.exitReasonSessions > 0
          ? Math.round((agg.completedSessions / agg.exitReasonSessions) * 1000) / 1000
          : null,
    }
  })

  return NextResponse.json({ tools }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
