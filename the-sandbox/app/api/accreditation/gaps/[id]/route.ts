import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { prisma } from '../../../../lib/prisma'

export const PUT = withErrorHandling(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireStaffOrAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await context.params

  const parsed = await parseRequestBody<{
    remediationStatus?: string
    assignedTo?: string
    resolutionNotes?: string
  }>(request)
  if ('error' in parsed) return parsed.error

  const gap = await prisma.complianceGap.update({
    where: { id },
    data: {
      ...(parsed.data.remediationStatus && { remediationStatus: parsed.data.remediationStatus }),
      ...(parsed.data.assignedTo !== undefined && { assignedTo: parsed.data.assignedTo }),
      ...(parsed.data.resolutionNotes !== undefined && { resolutionNotes: parsed.data.resolutionNotes }),
      ...(parsed.data.remediationStatus === 'resolved' && { resolvedAt: new Date() }),
    },
  })

  return NextResponse.json({ gap })
})
