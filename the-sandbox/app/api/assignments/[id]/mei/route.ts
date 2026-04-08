import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import {
  requireRequestUser,
  requireEducatorUser,
  isAuthFailure,
} from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { computeMEI } from '../../../../lib/mei-scoring-service'

export const runtime = 'nodejs'

// GET /api/assignments/[id]/mei
// Educator/Admin: all students' MEI scores + class aggregates.
// Student: own MEI score + trajectory data.
export const GET = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id: assignmentId } = await params
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: {
        id: true,
        type: true,
        courseId: true,
        assessmentToolIds: true,
        minimumAttempts: true,
        createdAt: true,
        assessmentWindowEnd: true,
        course: { select: { instructorId: true } },
      },
    })

    if (!assignment) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (assignment.type !== 'TOOL_ASSESSMENT') {
      return NextResponse.json(
        { error: 'This assignment is not a tool assessment' },
        { status: 400 },
      )
    }

    const isFaculty =
      user.role === 'ADMIN' ||
      (user.role === 'EDUCATOR' && user.id === assignment.course.instructorId)

    // ── Educator / Admin view ─────────────────────────────────────────────
    if (isFaculty) {
      const scores = await prisma.masteryEfficiencyScore.findMany({
        where: { assignmentId },
        include: { student: { select: { id: true, name: true, email: true } } },
        orderBy: { meiScore: 'desc' },
      })

      const meiValues = scores.map((s) => s.meiScore)
      const totalStudents = await prisma.courseEnrollment.count({
        where: { courseId: assignment.courseId },
      })

      const sorted = [...meiValues].sort((a, b) => a - b)
      const median =
        sorted.length === 0
          ? null
          : sorted.length % 2 === 1
            ? sorted[Math.floor(sorted.length / 2)]
            : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2

      const sum = (arr: number[]) =>
        arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length

      return NextResponse.json({
        assignmentId,
        scores,
        aggregates: {
          totalStudents,
          scoredStudents: scores.length,
          avgMeiScore: sum(meiValues),
          medianMeiScore: median,
          avgDurationTrend: sum(scores.map((s) => s.durationTrend)),
          avgScoreTrend: sum(scores.map((s) => s.scoreTrend)),
          avgHintIndependence: sum(scores.map((s) => s.hintIndependence)),
          avgReformulationDecline: sum(scores.map((s) => s.reformulationDecline)),
          avgBloomCeiling: sum(scores.map((s) => s.bloomCeiling)),
        },
      }, {
        headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
      })
    }

    // ── Student view ──────────────────────────────────────────────────────
    if (user.role === 'STUDENT') {
      const meiScore = await prisma.masteryEfficiencyScore.findUnique({
        where: { assignmentId_studentId: { assignmentId, studentId: user.id } },
      })

      const windowStart = assignment.createdAt
      const windowEnd = assignment.assessmentWindowEnd ?? new Date()

      const sessions = await prisma.toolSession.findMany({
        where: {
          userId: user.id,
          toolId: { in: assignment.assessmentToolIds },
          courseId: assignment.courseId,
          startedAt: { gte: windowStart, lte: windowEnd },
          score: { gte: 0.3 },
          exitReason: 'completed',
          durationSeconds: { not: null },
        },
        orderBy: { startedAt: 'asc' },
        select: {
          id: true,
          startedAt: true,
          score: true,
          durationSeconds: true,
          hintCount: true,
        },
      })

      return NextResponse.json({
        assignmentId,
        meiScore,
        trajectory: sessions,
        minimumAttempts: assignment.minimumAttempts ?? 3,
        sessionsCompleted: sessions.length,
      }, {
        headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
      })
    }

    // ── Other roles ───────────────────────────────────────────────────────
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  },
)

// POST /api/assignments/[id]/mei
// Educator/Admin only — recompute MEI scores for all enrolled students.
export const POST = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id: assignmentId } = await params
    const auth = await requireEducatorUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: {
        id: true,
        type: true,
        courseId: true,
        course: { select: { instructorId: true } },
      },
    })

    if (!assignment) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (assignment.type !== 'TOOL_ASSESSMENT') {
      return NextResponse.json(
        { error: 'This assignment is not a tool assessment' },
        { status: 400 },
      )
    }

    // Verify ownership
    if (user.role !== 'ADMIN' && user.id !== assignment.course.instructorId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Load enrolled students
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { courseId: assignment.courseId },
      select: { studentId: true },
    })

    let recomputed = 0
    let skipped = 0

    // Sequential to avoid DB contention
    for (const enrollment of enrollments) {
      const result = await computeMEI(enrollment.studentId, assignmentId)
      if (result) {
        recomputed++
      } else {
        skipped++
      }
    }

    return NextResponse.json({ recomputed, skipped })
  },
)
