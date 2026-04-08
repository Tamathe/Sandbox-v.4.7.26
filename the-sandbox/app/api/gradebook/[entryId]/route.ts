import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { checkRateLimit } from '../../../lib/rate-limit'
import { pushGradeToCanvas } from '../../../lib/canvas-grade-service'
import { withErrorHandling } from '../../../lib/api-utils'
import { syncAuthenticAssessmentSubmission } from '../../../lib/assessment/authentic-assessment-service'

export const runtime = 'nodejs'

async function getEntry(entryId: string) {
  return prisma.gradebookEntry.findUnique({
    where: { id: entryId },
    include: {
      submission: {
        include: {
          assignment: {
            include: {
              course: { select: { id: true, instructorId: true, canvasCourseId: true } },
              rubric: {
                include: {
                  criteria: {
                    include: { bands: { orderBy: { minPoints: 'desc' } } },
                    orderBy: { order: 'asc' },
                  },
                },
              },
            },
          },
          student: { select: { id: true, name: true, email: true } },
          linkedTool: {
            select: {
              id: true,
              name: true,
              published: true,
              toolType: true,
            },
          },
          session: {
            select: {
              id: true,
              startedAt: true,
              messageCount: true,
              chatMessages: {
                select: { role: true, content: true, createdAt: true },
                orderBy: { createdAt: 'asc' },
              },
            },
          },
        },
      },
      evidence: {
        orderBy: { createdAt: 'desc' },
      },
      reviewedBy: { select: { id: true, name: true } },
    },
  })
}

// GET /api/gradebook/[entryId]
// Faculty: full entry including AI draft + submission content.
// Student: only if status is RELEASED; returns score + feedback only.
export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ entryId: string }> }) => {
  const { entryId } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const rateLimitError = await checkRateLimit(req, user.id, 'API')
  if (rateLimitError) return rateLimitError

  const entry = await getEntry(entryId)
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isFaculty =
    user.role === 'ADMIN' ||
    (user.role === 'EDUCATOR' && user.id === entry.submission.assignment.course.instructorId)
  const isOwner = entry.submission.student.id === user.id

  if (!isFaculty && !isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (isOwner && !isFaculty) {
    // Students can only see their grade once it's released
    if (entry.status !== 'RELEASED') {
      return NextResponse.json({ status: entry.status, message: 'Grade not yet released' })
    }
    return NextResponse.json({
      id: entry.id,
      status: entry.status,
      score: entry.facultyScore,
      feedback: entry.facultyFeedback,
      criteriaScores: entry.facultyCriteriaScores,
      pointsPossible: entry.submission.assignment.pointsPossible,
      rubric: entry.submission.assignment.rubric,
    })
  }

  // Mark as FACULTY_REVIEWING if faculty opens a PENDING_REVIEW entry
  if (isFaculty && entry.status === 'PENDING_REVIEW') {
    await prisma.gradebookEntry.update({
      where: { id: entryId },
      data: { status: 'FACULTY_REVIEWING' },
    })
    entry.status = 'FACULTY_REVIEWING'
  }

  let authenticAssessment = null
  if (entry.submission.assignment.assessmentMode === 'AUTHENTIC') {
    authenticAssessment = await syncAuthenticAssessmentSubmission(entry.submission.id)
  }

  return NextResponse.json({
    ...entry,
    authenticAssessment,
  })
})

// PATCH /api/gradebook/[entryId]
// Faculty only — save score, feedback, criteria scores, and/or update status.
export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ entryId: string }> }) => {
  const { entryId } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const rateLimitError = await checkRateLimit(req, user.id, 'API')
  if (rateLimitError) return rateLimitError

  const entry = await getEntry(entryId)
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isFaculty =
    user.role === 'ADMIN' ||
    (user.role === 'EDUCATOR' && user.id === entry.submission.assignment.course.instructorId)
  if (!isFaculty) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { facultyScore, facultyFeedback, facultyCriteriaScores, status } = parsed.data as { facultyScore?: number; facultyFeedback?: string; facultyCriteriaScores?: unknown; status?: string }

  const validStatuses = ['AI_DRAFT', 'PENDING_REVIEW', 'FACULTY_REVIEWING', 'APPROVED', 'NEEDS_REVISION']
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (facultyScore != null) data.facultyScore = Number(facultyScore)
  if (facultyFeedback != null) data.facultyFeedback = String(facultyFeedback)
  if (facultyCriteriaScores != null) data.facultyCriteriaScores = facultyCriteriaScores
  if (status) data.status = status
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  // Track who reviewed and when
  data.reviewedById = user.id
  data.reviewedAt = new Date()

  const updated = await prisma.gradebookEntry.update({ where: { id: entryId }, data })

  // Fire Canvas grade passback asynchronously — don't block the HTTP response.
  // Only triggers when status transitions to APPROVED and the assignment has a Canvas ID.
  if (status === 'APPROVED') {
    const { assignment } = entry.submission
    const canvasCourseId = assignment.course.canvasCourseId
    if (assignment.canvasAssignmentId && canvasCourseId) {
      const facultyScore = (data.facultyScore as number | undefined) ?? entry.facultyScore
      if (facultyScore != null) {
        void pushGradeToCanvas({
          entryId,
          canvasCourseId,
          canvasAssignmentId: assignment.canvasAssignmentId,
          studentEmail: entry.submission.student.email,
          score: facultyScore,
          pointsPossible: assignment.pointsPossible,
        }).catch((err) => {
          console.error('[gradebook] Canvas grade passback error:', err)
        })
      }
    }
  }

  return NextResponse.json(updated, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
