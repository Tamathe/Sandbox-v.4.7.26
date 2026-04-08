import { NextRequest, NextResponse } from 'next/server'
import { requireRegistrarUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { prisma } from '../../../../../lib/prisma'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const PATCH = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ resultId: string }> },
) => {
  const { resultId } = await params
  const auth = await requireRegistrarUser(request)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody<{ staffOverride?: string; staffNotes?: string }>(request)
  if ('error' in parsed) return parsed.error

  const { staffOverride, staffNotes } = parsed.data

  const existing = await prisma.degreeAuditResult.findUnique({ where: { id: resultId } })
  if (!existing) return NextResponse.json({ error: 'Audit result not found' }, { status: 404 })

  const updated = await prisma.degreeAuditResult.update({
    where: { id: resultId },
    data: {
      staffOverride,
      staffNotes,
      staffReviewedBy: auth.user.id,
      staffReviewedAt: new Date(),
      humanReviewRequired: false,
    },
  })

  return NextResponse.json({ audit: updated })
})
