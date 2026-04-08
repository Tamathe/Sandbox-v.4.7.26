/**
 * GET /api/analytics/platform
 *
 * ADMIN only — platform-wide aggregates for the Institution analytics tab.
 * Returns: totalUsers, totalTools, totalSessions, sessionsLast30Days,
 * avgSessionScore, adoptionByDepartment, topTools, costEstimate.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { subDays } from 'date-fns'

export const runtime = 'nodejs'

// Haiku pricing (per million tokens):
const HAIKU_INPUT_COST_PER_M  = 1.0  // $1/M input
const HAIKU_OUTPUT_COST_PER_M = 5.0  // $5/M output
// Average tokens per turn estimate: ~400 input + ~200 output
const AVG_INPUT_PER_TURN  = 400
const AVG_OUTPUT_PER_TURN = 200

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const thirtyDaysAgo = subDays(new Date(), 30)

  const [
    totalUsers,
    totalTools,
    totalSessions,
    sessionsLast30Days,
    allUsers,
    topToolRows,
    metricEventCount,
    studyGroupRows,
  ] = await Promise.all([
    prisma.user.count({ where: { suspended: false } }),
    prisma.tool.count({ where: { approvalStatus: { in: ['APPROVED', 'COMMUNITY'] } } }),
    // sensitiveSession: false — exclude counseling/disability/immigration sessions per FERPA policy
    prisma.toolSession.count({ where: { sensitiveSession: false } }),
    prisma.toolSession.count({ where: { startedAt: { gte: thirtyDaysAgo }, sensitiveSession: false } }),
    // Users with department info for adoption breakdown
    prisma.user.findMany({
      where: { suspended: false },
      select: { department: true, college: true },
    }),
    // Top tools by session count
    prisma.tool.findMany({
      where: { approvalStatus: { in: ['APPROVED', 'COMMUNITY'] } },
      select: {
        id: true,
        name: true,
        _count: { select: { sessions: true } },
      },
      orderBy: { sessions: { _count: 'desc' } },
      take: 10,
    }),
    // MetricEvent count as a proxy for AI turns
    prisma.metricEvent.count(),
    // A/B study group breakdown (students only)
    prisma.user.groupBy({
      by: ['studyGroup'],
      _count: { _all: true },
      where: { role: 'STUDENT' },
    }),
  ])

  // Score events for average score
  const scoreEvents = await prisma.metricEvent.findMany({
    where: { metricName: 'score' },
    select: { metricValue: true },
  })
  const scores = scoreEvents
    .map((e) => Number(e.metricValue))
    .filter((v) => Number.isFinite(v) && v >= 0 && v <= 100)
  const avgSessionScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null

  // Top tool scores
  const topToolIds = topToolRows.map((t) => t.id)
  // Get session IDs for top tools to look up scores
  // sensitiveSession: false — exclude counseling/disability/immigration sessions per FERPA policy
  const topToolSessionIds = topToolIds.length > 0
    ? await prisma.toolSession
        .findMany({ where: { toolId: { in: topToolIds }, sensitiveSession: false }, select: { id: true, toolId: true } })
    : []

  const sessionToTool = new Map(topToolSessionIds.map(s => [s.id, s.toolId]))
  const topToolSessionIdList = topToolSessionIds.map(s => s.id)

  const topToolScoreEvents = topToolSessionIdList.length > 0
    ? await prisma.metricEvent.findMany({
        where: { metricName: 'score', sessionId: { in: topToolSessionIdList } },
        select: { metricValue: true, sessionId: true },
      })
    : []

  const scoresByTool = new Map<string, number[]>()
  for (const e of topToolScoreEvents) {
    const tid = e.sessionId ? sessionToTool.get(e.sessionId) : undefined
    if (!tid) continue
    const v = Number(e.metricValue)
    if (!Number.isFinite(v)) continue
    const arr = scoresByTool.get(tid) ?? []
    arr.push(v)
    scoresByTool.set(tid, arr)
  }

  const topTools = topToolRows.map((t) => {
    const tScores = scoresByTool.get(t.id) ?? []
    const avg = tScores.length > 0
      ? Math.round(tScores.reduce((a, b) => a + b, 0) / tScores.length)
      : null
    return { id: t.id, name: t.name, sessions: t._count.sessions, avgScore: avg }
  })

  // Adoption by department
  const deptMap = new Map<string, { users: number }>()
  for (const u of allUsers) {
    const dept = u.department ?? u.college ?? 'Unknown'
    const entry = deptMap.get(dept) ?? { users: 0 }
    entry.users++
    deptMap.set(dept, entry)
  }

  // Session counts per department via users
  const deptUserCounts = Array.from(deptMap.entries())
    .sort((a, b) => b[1].users - a[1].users)
    .slice(0, 10)
    .map(([department, { users }]) => ({ department, users, sessions: 0 }))

  // Cost estimate: use metricEvent count as proxy for turns
  // Each event ≈ 1 turn. (Turns are a better proxy than events in practice but this is illustrative.)
  const totalTurnsEstimate = Math.max(metricEventCount, totalSessions * 4)
  const totalInputTokens = totalTurnsEstimate * AVG_INPUT_PER_TURN
  const totalOutputTokens = totalTurnsEstimate * AVG_OUTPUT_PER_TURN
  const costUsd =
    (totalInputTokens / 1_000_000) * HAIKU_INPUT_COST_PER_M +
    (totalOutputTokens / 1_000_000) * HAIKU_OUTPUT_COST_PER_M
  const costPerSession = totalSessions > 0 ? costUsd / totalSessions : 0

  const studyGroups = studyGroupRows.map(r => ({
    group: r.studyGroup,
    count: r._count._all,
  }))

  return NextResponse.json({
    totalUsers,
    totalTools,
    totalSessions,
    sessionsLast30Days,
    avgSessionScore,
    adoptionByDepartment: deptUserCounts,
    topTools,
    studyGroups,
    costEstimate: {
      totalTokensEstimate: totalInputTokens + totalOutputTokens,
      costUsd: Math.round(costUsd * 100) / 100,
      costPerSession: Math.round(costPerSession * 10000) / 10000,
    },
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
