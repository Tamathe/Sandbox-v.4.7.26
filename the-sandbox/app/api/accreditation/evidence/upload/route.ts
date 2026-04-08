import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { prisma } from '../../../../lib/prisma'
import { getActiveCycle } from '../../../../lib/accreditation/dashboard-service'

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireStaffOrAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody<{
    standardId: string
    title: string
    description: string
    evidenceType: string
    programCode?: string
    semesterCode?: string
  }>(request)
  if ('error' in parsed) return parsed.error

  const { standardId, title, description, evidenceType, programCode, semesterCode } = parsed.data

  if (!standardId || !title || !description || !evidenceType) {
    return NextResponse.json({ error: 'standardId, title, description, and evidenceType are required' }, { status: 400 })
  }

  const cycle = await getActiveCycle()
  if (!cycle) {
    return NextResponse.json({ error: 'No active accreditation cycle found' }, { status: 404 })
  }

  const evidence = await prisma.accreditationEvidence.create({
    data: {
      standardId,
      cycleId: cycle.id,
      title,
      description,
      evidenceType,
      sourceType: 'manual_upload',
      sourceCount: 1,
      quality: 'FAIR',
      qualityScore: 0.5,
      completeness: 0.5,
      recency: 1.0,
      alignment: 0.7,
      programCode: programCode ?? null,
      semesterCode: semesterCode ?? null,
    },
  })

  return NextResponse.json({ evidence }, { status: 201 })
})
