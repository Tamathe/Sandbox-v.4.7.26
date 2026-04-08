import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { prisma } from '../../../../lib/prisma'
import { runDegreeAudit } from '../../../../lib/registrar/degree-audit'
import { withErrorHandling } from '../../../../lib/api-utils'

const STALE_DAYS = 7

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth

  const staleDate = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000)
  const existing = await prisma.degreeAuditResult.findFirst({
    where: { studentId: user.id, auditedAt: { gte: staleDate } },
    include: { program: { select: { code: true, name: true } } },
    orderBy: { auditedAt: 'desc' },
  })

  if (existing) {
    // Strip staff-only fields for students
    const { chainOfThought: _ct, confidenceScore: _cs, ...studentView } = existing
    const humanNote = existing.humanReviewRequired
      ? 'Your audit is under advisor review. Results may be updated soon.'
      : null
    return NextResponse.json({ audit: studentView, fresh: false, humanNote })
  }

  const programCode = user.program ?? 'UNDECLARED'
  const catalogYear = user.catalogYear ?? '2024-2025'
  const sisId = user.sisStudentId ?? user.id

  const payload = await runDegreeAudit(sisId, programCode, catalogYear)

  if (payload.programId === 'unknown') {
    return NextResponse.json({
      audit: null,
      message: 'Degree program data not available. Contact the Registrar\'s Office.',
      recommendedActions: payload.recommendedActions,
    }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  const saved = await prisma.degreeAuditResult.create({
    data: {
      studentId: user.id,
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

  const { chainOfThought: _ct2, confidenceScore: _cs2, ...studentView } = saved
  const humanNote = saved.humanReviewRequired
    ? 'Your audit has been flagged for advisor review. Results may be updated soon.'
    : null

  return NextResponse.json({ audit: studentView, fresh: true, humanNote })
})
