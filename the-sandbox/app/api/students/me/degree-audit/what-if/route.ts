import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../../lib/server-auth'
import { prisma } from '../../../../../lib/prisma'
import { runDegreeAudit } from '../../../../../lib/registrar/degree-audit'
import { buildTransferMap, compareTimelines } from '../../../../../lib/registrar/what-if-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth

  const targetProgramCode = request.nextUrl.searchParams.get('program')
  if (!targetProgramCode) {
    return NextResponse.json({ error: 'program query parameter is required' }, { status: 400 })
  }

  const catalogYear = user.catalogYear ?? '2024-2025'
  const sisId = user.sisStudentId ?? user.id
  const currentProgramCode = user.program ?? 'UNDECLARED'

  // Look up both programs from DB
  const [currentProgramDb, targetProgramDb] = await Promise.all([
    prisma.degreeProgram.findFirst({
      where: { code: currentProgramCode },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.degreeProgram.findFirst({
      where: { code: targetProgramCode },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  if (!targetProgramDb) {
    return NextResponse.json({ error: 'Target program not found' }, { status: 404 })
  }

  // Run both audits in parallel
  const [currentAudit, targetAudit] = await Promise.all([
    runDegreeAudit(sisId, currentProgramCode, catalogYear),
    runDegreeAudit(sisId, targetProgramCode, catalogYear),
  ])

  // Build transfer map
  const transferMap = buildTransferMap(
    currentAudit,
    targetAudit,
    targetProgramDb.totalCredits,
  )

  // Compare timelines
  const timeline = await compareTimelines(
    sisId,
    currentAudit,
    targetAudit,
    {
      code: currentProgramCode,
      name: currentProgramDb?.name ?? currentProgramCode,
      totalCredits: currentProgramDb?.totalCredits ?? 120,
    },
    {
      code: targetProgramCode,
      name: targetProgramDb.name,
      totalCredits: targetProgramDb.totalCredits,
    },
  )

  // Strip staff-only fields from both audits
  const strip = (audit: typeof currentAudit) => {
    const { chainOfThought: _, confidenceScore: __, programId: ___, ...safe } = audit
    return safe
  }

  return NextResponse.json({
    current: strip(currentAudit),
    target: strip(targetAudit),
    transferMap,
    timeline,
    currentProgram: {
      code: currentProgramCode,
      name: currentProgramDb?.name ?? currentProgramCode,
    },
    targetProgram: {
      code: targetProgramCode,
      name: targetProgramDb.name,
      college: targetProgramDb.college,
    },
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
