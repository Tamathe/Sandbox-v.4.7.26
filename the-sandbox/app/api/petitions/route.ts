import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../lib/server-auth'
import { prisma } from '../../lib/prisma'
import { checkEligibility } from '../../lib/registrar/petition-eligibility'
import { routePetition } from '../../lib/registrar/petition-routing'
import { withErrorHandling } from '../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const petitions = await prisma.petition.findMany({
    where: { studentId: auth.user.id },
    include: {
      auditEntries: {
        include: { actor: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { submittedAt: 'desc' },
  })

  return NextResponse.json({ petitions }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth

  const parsed = await parseRequestBody<{
    type: string
    formData: Record<string, unknown>
  }>(request)
  if ('error' in parsed) return parsed.error

  const { type, formData } = parsed.data

  if (!type || !formData) {
    return NextResponse.json({ error: 'type and formData are required' }, { status: 400 })
  }

  // Validate formData is a plain object and within size limits
  if (typeof formData !== 'object' || Array.isArray(formData) || formData === null) {
    return NextResponse.json({ error: 'formData must be a plain object' }, { status: 400 })
  }
  if (JSON.stringify(formData).length > 50000) {
    return NextResponse.json({ error: 'formData exceeds maximum allowed size' }, { status: 400 })
  }

  // Check eligibility synchronously
  const eligibility = await checkEligibility(type, user, formData)

  // Create petition regardless — blockers are informational, not hard blocks
  const petition = await prisma.petition.create({
    data: {
      studentId: user.id,
      type: type as never,
      formData: formData as unknown as import('../../generated/prisma').Prisma.InputJsonValue,
      eligibilityCheck: eligibility as unknown as import('../../generated/prisma').Prisma.InputJsonValue,
      status: 'SUBMITTED',
    },
  })

  // Create initial audit entry
  await prisma.petitionAuditEntry.create({
    data: {
      petitionId: petition.id,
      actorId: user.id,
      action: 'SUBMITTED',
      note: 'Petition submitted by student.',
    },
  })

  // Route to appropriate staff queue
  try {
    await routePetition(petition, user)
  } catch {
    // Routing failure is non-fatal — petition is still created
  }

  return NextResponse.json({ petition, eligibility }, { status: 201 })
})
