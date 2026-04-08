import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { prisma } from '../../../../../lib/prisma'
import { getActiveCycle } from '../../../../../lib/accreditation/dashboard-service'

export const PUT = withErrorHandling(async (request: NextRequest, context: { params: Promise<{ standardId: string }> }) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { standardId } = await context.params

  const parsed = await parseRequestBody<{
    action: 'approve' | 'request_revision' | 'finalize'
    comments?: string
  }>(request)
  if ('error' in parsed) return parsed.error

  const { action, comments } = parsed.data

  if (!action) {
    return NextResponse.json({ error: 'action is required' }, { status: 400 })
  }

  const cycle = await getActiveCycle()
  if (!cycle) {
    return NextResponse.json({ error: 'No active accreditation cycle found' }, { status: 404 })
  }

  const narrative = await prisma.complianceNarrative.findFirst({
    where: { standardId, cycleId: cycle.id },
    orderBy: { version: 'desc' },
  })

  if (!narrative) {
    return NextResponse.json({ error: 'No narrative found for this standard' }, { status: 404 })
  }

  const statusMap = {
    approve: 'APPROVED' as const,
    request_revision: 'REVISION_NEEDED' as const,
    finalize: 'FINAL' as const,
  }

  const updated = await prisma.complianceNarrative.update({
    where: { id: narrative.id },
    data: {
      status: statusMap[action],
      reviewerId: auth.user.id,
      reviewComments: comments ?? null,
      reviewedAt: new Date(),
      ...(action === 'approve' && { approvedBy: auth.user.id, approvedAt: new Date() }),
      ...(action === 'finalize' && { finalContent: narrative.draftContent }),
    },
  })

  return NextResponse.json({ narrative: updated })
})
