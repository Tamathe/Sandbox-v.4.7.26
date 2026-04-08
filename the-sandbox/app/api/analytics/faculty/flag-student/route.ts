/**
 * POST /api/analytics/faculty/flag-student
 *
 * Body: { studentEmail: string; courseId: string; reason: FlagReason; note?: string }
 * FlagReason: "grade_drop" | "disengagement" | "missing_sessions" | "other"
 *
 * Creates an InterventionLog:
 *   - studentId resolved from studentEmail
 *   - educatorId = auth user
 *   - reason = flagReason
 *   - actionTaken = "[FLAG: {reason}] {note}"
 *   - outcome = null, resolvedAt = null
 *
 * Response: { interventionId: string }
 *
 * Auth: EDUCATOR or ADMIN
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { prisma } from '../../../../lib/prisma'
import { withErrorHandling } from '../../../../lib/api-utils'

export const runtime = 'nodejs'

const VALID_REASONS = ['grade_drop', 'disengagement', 'missing_sessions', 'other'] as const
type FlagReason = (typeof VALID_REASONS)[number]

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error

  const { studentEmail, courseId, reason, note } = parsed.data as {
    studentEmail?: string
    courseId?: string
    reason?: string
    note?: string
  }

  if (!studentEmail || !courseId || !reason) {
    return NextResponse.json(
      { error: 'studentEmail, courseId, and reason are required' },
      { status: 400 }
    )
  }

  if (!VALID_REASONS.includes(reason as FlagReason)) {
    return NextResponse.json(
      { error: `reason must be one of: ${VALID_REASONS.join(', ')}` },
      { status: 400 }
    )
  }

  const student = await prisma.user.findUnique({
    where: { email: studentEmail.trim().toLowerCase() },
    select: { id: true },
  })
  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  const noteText = note?.trim() ?? ''
  const actionTaken = noteText
    ? `[FLAG: ${reason}] ${noteText}`
    : `[FLAG: ${reason}]`

  const log = await prisma.interventionLog.create({
    data: {
      courseId,
      studentId: student.id,
      educatorId: auth.user.id,
      reason,
      actionTaken,
    },
    select: { id: true },
  })

  return NextResponse.json({ interventionId: log.id }, { status: 201 })
})
