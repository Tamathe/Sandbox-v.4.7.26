import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { prisma } from '../../../../lib/prisma'
import { runDegreeAudit } from '../../../../lib/registrar/degree-audit'
import { withErrorHandling } from '../../../../lib/api-utils'

const STALE_DAYS = 7

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) => {
  const { studentId } = await params
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth
  // Students can only see their own audit
  const isRegistrarOrAdmin = user.role === 'REGISTRAR' || user.role === 'ADMIN'
  if (!isRegistrarOrAdmin && user.id !== studentId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Find the target student
  const student = await prisma.user.findUnique({ where: { id: studentId } })
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  // Check for a recent audit
  const staleDate = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000)
  const existing = await prisma.degreeAuditResult.findFirst({
    where: { studentId, auditedAt: { gte: staleDate } },
    include: { program: { select: { code: true, name: true } } },
    orderBy: { auditedAt: 'desc' },
  })

  if (existing) {
    // Strip staff-only fields for students
    const result = isRegistrarOrAdmin
      ? existing
      : { ...existing, chainOfThought: undefined, confidenceScore: undefined }
    return NextResponse.json({ audit: result, fresh: false }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  // Run a fresh audit
  const programCode = student.program ?? 'UNDECLARED'
  const catalogYear = student.catalogYear ?? '2024-2025'
  const sisId = student.sisStudentId ?? student.id

  const payload = await runDegreeAudit(sisId, programCode, catalogYear)

  if (payload.programId === 'unknown') {
    return NextResponse.json({
      audit: null,
      fresh: true,
      message: 'No degree program data found. Contact the Registrar\'s Office.',
      recommendedActions: payload.recommendedActions,
    }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  const saved = await prisma.degreeAuditResult.create({
    data: {
      studentId,
      programId: payload.programId,
      overallStatus: payload.overallStatus,
      percentComplete: payload.percentComplete,
      totalCreditsCompleted: payload.totalCreditsCompleted,
      totalCreditsRequired: payload.totalCreditsRequired,
      requirementResults: payload.requirementResults as unknown as import('../../../../generated/prisma').Prisma.InputJsonValue,
      recommendedActions: payload.recommendedActions as unknown as import('../../../../generated/prisma').Prisma.InputJsonValue,
      citedSources: payload.citedSources as unknown as import('../../../../generated/prisma').Prisma.InputJsonValue,
      chainOfThought: payload.chainOfThought as unknown as import('../../../../generated/prisma').Prisma.InputJsonValue,
      confidenceScore: payload.confidenceScore,
      complexCaseFlag: payload.complexCaseFlag,
      humanReviewRequired: payload.humanReviewRequired,
    },
    include: { program: { select: { code: true, name: true } } },
  })

  const result = isRegistrarOrAdmin
    ? saved
    : { ...saved, chainOfThought: undefined, confidenceScore: undefined }

  return NextResponse.json({ audit: result, fresh: true }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) => {
  const { studentId } = await params
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth
  if (user.role !== 'REGISTRAR' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Registrar access required' }, { status: 403 })
  }

  const student = await prisma.user.findUnique({ where: { id: studentId } })
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const programCode = student.program ?? 'UNDECLARED'
  const catalogYear = student.catalogYear ?? '2024-2025'
  const sisId = student.sisStudentId ?? student.id

  const payload = await runDegreeAudit(sisId, programCode, catalogYear)

  if (payload.programId === 'unknown') {
    return NextResponse.json({ error: 'No degree program found for this student.' }, { status: 422 })
  }

  const saved = await prisma.degreeAuditResult.create({
    data: {
      studentId,
      programId: payload.programId,
      overallStatus: payload.overallStatus,
      percentComplete: payload.percentComplete,
      totalCreditsCompleted: payload.totalCreditsCompleted,
      totalCreditsRequired: payload.totalCreditsRequired,
      requirementResults: payload.requirementResults as unknown as import('../../../../generated/prisma').Prisma.InputJsonValue,
      recommendedActions: payload.recommendedActions as unknown as import('../../../../generated/prisma').Prisma.InputJsonValue,
      citedSources: payload.citedSources as unknown as import('../../../../generated/prisma').Prisma.InputJsonValue,
      chainOfThought: payload.chainOfThought as unknown as import('../../../../generated/prisma').Prisma.InputJsonValue,
      confidenceScore: payload.confidenceScore,
      complexCaseFlag: payload.complexCaseFlag,
      humanReviewRequired: payload.humanReviewRequired,
    },
    include: { program: { select: { code: true, name: true } } },
  })

  return NextResponse.json({ audit: saved, fresh: true })
})
