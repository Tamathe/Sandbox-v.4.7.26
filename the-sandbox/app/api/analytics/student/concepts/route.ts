/**
 * GET /api/analytics/student/concepts?courseId=xyz
 *
 * Student-scoped concept coverage endpoint.
 * Returns: { covered: string[], uncovered: LearningObjective[], byTool: { toolName: string, concepts: string[] }[] }
 *
 * - covered: unique concept tags from session transcripts (last 90 days, non-sensitive)
 * - uncovered: course LearningObjectives not matched by any covered concept
 * - byTool: concepts grouped by tool name
 *
 * Requires: student auth. Students only see their own data.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'

export const runtime = 'nodejs'

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim()
}

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get('courseId') ?? undefined

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  // 1. Fetch all non-sensitive scored sessions for this student (last 90 days)
  // Students query their own data — sensitiveSession filter still applied for consistency
  const sessions = await prisma.toolSession.findMany({
    where: {
      userId: user.id,
      sensitiveSession: false,
      scoredAt: { not: null },
      startedAt: { gte: ninetyDaysAgo },
      ...(courseId ? { courseId } : {}),
    },
    include: { tool: { select: { id: true, name: true } } },
  })

  // 2. Flatten all conceptsTouched into covered set
  const covered = [...new Set(sessions.flatMap(s => s.conceptsTouched ?? []))]

  // 3. Group by tool
  const byToolMap = new Map<string, { toolName: string; concepts: Set<string> }>()
  for (const s of sessions) {
    if (!s.conceptsTouched?.length) continue
    const entry = byToolMap.get(s.toolId) ?? { toolName: s.tool.name, concepts: new Set() }
    for (const c of s.conceptsTouched) entry.concepts.add(c)
    byToolMap.set(s.toolId, entry)
  }
  const byTool = [...byToolMap.values()].map(e => ({
    toolName: e.toolName,
    concepts: [...e.concepts],
  }))

  // 4. Fetch LearningObjectives for the course (if courseId provided)
  let uncovered: { id: string; title: string }[] = []
  if (courseId) {
    const objectives = await prisma.learningObjective.findMany({
      where: { courseId },
      select: { id: true, title: true },
    })

    const coveredNormalized = covered.map(normalize)
    uncovered = objectives.filter(obj => {
      const objNorm = normalize(obj.title)
      return !coveredNormalized.some(c => objNorm.includes(c) || c.includes(objNorm))
    })
  }

  return NextResponse.json({ covered, uncovered, byTool }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
