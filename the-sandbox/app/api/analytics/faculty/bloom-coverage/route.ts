/**
 * GET /api/analytics/faculty/bloom-coverage?courseId=<id>
 *
 * Aggregates ToolSession.bloomLevel distributions for a given course.
 * Returns:
 *   byTool      — per-tool breakdown of session counts by Bloom level
 *   courseSummary — course-level totals per Bloom level
 *   dominantLevel — most common Bloom level across all sessions
 *   dominantSince — ISO date when current dominantLevel was first observed
 *   gapAlert    — true if no sessions reached Apply (level ≥ 3) in the past 7 days
 *   coverage    — fraction of sessions at Apply or above (0.0–1.0)
 *   totalSessions — total sessions with a recorded bloomLevel
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { subDays } from 'date-fns'

export const runtime = 'nodejs'

const BLOOM_LABELS: Record<number, string> = {
  1: 'Remember',
  2: 'Understand',
  3: 'Apply',
  4: 'Analyze',
  5: 'Evaluate',
  6: 'Create',
}

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth
  if (user.role === 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

    const courseId = req.nextUrl.searchParams.get('courseId')
    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
    }

    // Verify access: educator must own the course, admins see all
    if (user.role !== 'ADMIN') {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { instructorId: true },
      })
      if (!course || course.instructorId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Fetch all tool sessions with bloomLevel recorded for this course
    const sessions = await prisma.toolSession.findMany({
      where: {
        courseId,
        bloomLevel: { not: null },
        sensitiveSession: false,
      },
      select: {
        id: true,
        toolId: true,
        bloomLevel: true,
        startedAt: true,
        tool: { select: { name: true } },
      },
      orderBy: { startedAt: 'asc' },
    })

    // Build per-tool breakdown
    const toolMap = new Map<string, { toolName: string; levels: Record<number, number> }>()

    for (const session of sessions) {
      if (!session.bloomLevel) continue
      if (!toolMap.has(session.toolId)) {
        toolMap.set(session.toolId, {
          toolName: session.tool.name,
          levels: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
        })
      }
      const entry = toolMap.get(session.toolId)!
      entry.levels[session.bloomLevel] = (entry.levels[session.bloomLevel] ?? 0) + 1
    }

    const byTool = Array.from(toolMap.entries()).map(([toolId, data]) => ({
      toolId,
      toolName: data.toolName,
      levels: data.levels,
      totalWithBloom: Object.values(data.levels).reduce((a, b) => a + b, 0),
    }))

    // Course-level summary
    const courseSummary: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
    for (const session of sessions) {
      if (!session.bloomLevel) continue
      courseSummary[session.bloomLevel] = (courseSummary[session.bloomLevel] ?? 0) + 1
    }

    const totalSessions = Object.values(courseSummary).reduce((a, b) => a + b, 0)

    // Dominant level (mode)
    let dominantLevel: number | null = null
    if (totalSessions > 0) {
      dominantLevel = Number(
        Object.entries(courseSummary).reduce((a, b) => (b[1] > a[1] ? b : a))[0],
      )
    }

    // Coverage: fraction at Apply (level ≥ 3)
    const applyOrHigher = [3, 4, 5, 6].reduce(
      (sum, level) => sum + (courseSummary[level] ?? 0),
      0,
    )
    const coverage = totalSessions > 0 ? applyOrHigher / totalSessions : 0

    // Gap alert: no sessions at level ≥ 3 in past 7 days
    const cutoff = subDays(new Date(), 7)
    const recentHighLevelSessions = sessions.filter(
      (s) => s.startedAt >= cutoff && (s.bloomLevel ?? 0) >= 3,
    )
    const gapAlert = totalSessions > 0 && recentHighLevelSessions.length === 0

    // dominantSince: earliest session with the current dominant level in the last 7 days
    let dominantSince: string | null = null
    if (dominantLevel !== null) {
      const first = sessions.find((s) => s.bloomLevel === dominantLevel)
      dominantSince = first ? first.startedAt.toISOString() : null
    }

  return NextResponse.json({
    courseId,
    byTool,
    courseSummary,
    bloomLabels: BLOOM_LABELS,
    dominantLevel,
    dominantSince,
    gapAlert,
    coverage: Math.round(coverage * 100) / 100,
    totalSessions,
    applyOrHigherCount: applyOrHigher,
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
