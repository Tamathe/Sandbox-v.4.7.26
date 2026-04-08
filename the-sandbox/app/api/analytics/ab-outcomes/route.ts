import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'

export const runtime = 'nodejs'

// ── Helpers ───────────────────────────────────────────────────────────────────

function avg(arr: (number | null)[]): number | null {
  const vals = arr.filter((v): v is number => v !== null)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}

function pct(n: number, d: number): number | null {
  return d > 0 ? n / d : null
}

// ── GET /api/analytics/ab-outcomes ────────────────────────────────────────────
// Admin only. Reads User.studyGroup, ToolSession.score, and GradebookEntry to
// compare control vs treatment cohort outcomes.

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  // 1. Partition users by study group
  const users = await prisma.user.findMany({
    where: { studyGroup: { not: null } },
    select: { id: true, studyGroup: true },
  })

  const controlIds = users.filter(u => u.studyGroup === 'control').map(u => u.id)
  const treatmentIds = users.filter(u => u.studyGroup === 'treatment').map(u => u.id)
  const allAssignedIds = [...controlIds, ...treatmentIds]

  // 2. Session data for each cohort (parallelised)
  const [controlSessions, treatmentSessions] = await Promise.all([
    prisma.toolSession.findMany({
      where: { userId: { in: controlIds } },
      select: { score: true, exitReason: true, startedAt: true, durationSeconds: true },
    }),
    prisma.toolSession.findMany({
      where: { userId: { in: treatmentIds } },
      select: { score: true, exitReason: true, startedAt: true, durationSeconds: true },
    }),
  ])

  // 3. Gradebook entries via submission.studentId
  const [controlGradebook, treatmentGradebook] = await Promise.all([
    prisma.gradebookEntry.findMany({
      where: { submission: { studentId: { in: controlIds } } },
      select: { aiScore: true, facultyScore: true },
    }),
    prisma.gradebookEntry.findMany({
      where: { submission: { studentId: { in: treatmentIds } } },
      select: { aiScore: true, facultyScore: true },
    }),
  ])

  // 4. Objective mastery comparison
  const [controlMastery, treatmentMastery] = await Promise.all([
    prisma.studentObjectiveProgress.findMany({
      where: { studentId: { in: controlIds } },
      select: { masteryLevel: true },
    }),
    prisma.studentObjectiveProgress.findMany({
      where: { studentId: { in: treatmentIds } },
      select: { masteryLevel: true },
    }),
  ])

  // ── Cohort stats builder ──────────────────────────────────────────────────
  type SessionRow = { score: number | null; exitReason: string | null; durationSeconds: number | null }

  function cohortStats(sessions: SessionRow[], userIds: string[]) {
    const completedCount = sessions.filter(s => s.exitReason === 'completed').length
    const durations = sessions
      .map(s => s.durationSeconds)
      .filter((v): v is number => v !== null)
    return {
      sessionCount: sessions.length,
      avgSessionsPerStudent: userIds.length > 0 ? sessions.length / userIds.length : 0,
      avgSessionScore: avg(sessions.map(s => s.score)),
      completionRate: pct(completedCount, sessions.length),
      avgDurationSeconds: avg(durations),
    }
  }

  function gradebookStats(entries: { aiScore: number | null; facultyScore: number | null }[]) {
    return {
      count: entries.length,
      avgAiScore: avg(entries.map(e => e.aiScore)),
      avgFacultyScore: avg(entries.map(e => e.facultyScore)),
    }
  }

  function masteryStats(rows: { masteryLevel: string }[]) {
    const total = rows.length
    const mastered = rows.filter(r => r.masteryLevel === 'mastered').length
    const struggling = rows.filter(r => r.masteryLevel === 'struggling').length
    return {
      total,
      masteredPct: pct(mastered, total),
      strugglingPct: pct(struggling, total),
    }
  }

  // 5. Weekly score trend (8-week sliding window)
  type TaggedSession = SessionRow & { group: 'control' | 'treatment'; startedAt: Date }

  const allSessions: TaggedSession[] = [
    ...controlSessions.map(s => ({ ...s, group: 'control' as const })),
    ...treatmentSessions.map(s => ({ ...s, group: 'treatment' as const })),
  ]

  const now = new Date()
  const weeks = Array.from({ length: 8 }, (_, i) => ({
    label: i === 7 ? 'This wk' : `${7 - i}w ago`,
    control: [] as number[],
    treatment: [] as number[],
  }))

  for (const s of allSessions) {
    if (s.score === null) continue
    const daysAgo = Math.floor((now.getTime() - new Date(s.startedAt).getTime()) / 86_400_000)
    const weekIdx = 7 - Math.floor(daysAgo / 7)
    if (weekIdx < 0 || weekIdx >= 8) continue
    weeks[weekIdx][s.group].push(s.score)
  }

  const weeklyTrend = weeks.map(w => ({
    week: w.label,
    controlAvg: avg(w.control),
    treatmentAvg: avg(w.treatment),
  }))

  // ── Total unassigned count ────────────────────────────────────────────────
  const [totalUsers] = await Promise.all([
    prisma.user.count(),
  ])

  return NextResponse.json({
    cohortSizes: {
      control: controlIds.length,
      treatment: treatmentIds.length,
      assigned: allAssignedIds.length,
      total: totalUsers,
    },
    sessions: {
      control: cohortStats(controlSessions, controlIds),
      treatment: cohortStats(treatmentSessions, treatmentIds),
    },
    gradebook: {
      control: gradebookStats(controlGradebook),
      treatment: gradebookStats(treatmentGradebook),
    },
    mastery: {
      control: masteryStats(controlMastery),
      treatment: masteryStats(treatmentMastery),
    },
    weeklyTrend,
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
