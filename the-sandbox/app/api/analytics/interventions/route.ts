/**
 * POST /api/analytics/interventions   — create a new InterventionLog
 * GET  /api/analytics/interventions?courseId=<id> — list all for a course
 *
 * Auth: EDUCATOR or ADMIN
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { prisma } from '../../../lib/prisma'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error

  const { courseId, studentId, studentEmail, reason, actionTaken } = parsed.data as {
    courseId?: string
    studentId?: string
    studentEmail?: string
    reason?: string
    actionTaken?: string
  }

  if (!courseId || (!studentId && !studentEmail) || !reason || !actionTaken) {
    return NextResponse.json(
      { error: 'courseId, studentId or studentEmail, reason, and actionTaken are required' },
      { status: 400 }
    )
  }

  // Resolve studentEmail → studentId if needed
  let resolvedStudentId = studentId
  if (!resolvedStudentId && studentEmail) {
    const student = await prisma.user.findUnique({
      where: { email: studentEmail.trim().toLowerCase() },
      select: { id: true },
    })
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }
    resolvedStudentId = student.id
  }

  const record = await prisma.interventionLog.create({
    data: {
      courseId,
      studentId: resolvedStudentId!,
      educatorId: auth.user.id,
      reason,
      actionTaken,
    },
    include: {
      student: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json(record, { status: 201 })
})

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const courseId = req.nextUrl.searchParams.get('courseId')
  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }

  const logs = await prisma.interventionLog.findMany({
    where: { courseId },
    orderBy: { createdAt: 'desc' },
    include: {
      student: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json({ logs }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
