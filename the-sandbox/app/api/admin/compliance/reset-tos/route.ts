import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser, isAuthFailure } from '../../../../lib/server-auth'
import { prisma } from '../../../../lib/prisma'
import { withErrorHandling } from '../../../../lib/api-utils'

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth

  const result = await prisma.user.updateMany({
    where: { tosAcceptedAt: { not: null } },
    data: { tosAcceptedAt: null },
  })

  await prisma.adminAuditLog.create({
    data: {
      adminId: user.id,
      action: 'bulk-tos-reset',
      targetType: 'User',
      targetLabel: 'All users',
      metadata: { type: 'bulk-tos-reset', affectedCount: result.count },
    },
  })

  return NextResponse.json({ ok: true, affectedCount: result.count })
})
