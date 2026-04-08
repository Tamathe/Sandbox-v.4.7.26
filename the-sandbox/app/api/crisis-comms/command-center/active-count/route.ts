import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { prisma } from '../../../../lib/prisma'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const count = await prisma.crisisIncident.count({
    where: { status: { in: ['DRAFTING', 'ACTIVE', 'CONTAINED'] } },
  })

  return NextResponse.json({ count }, {
    headers: { 'Cache-Control': 'private, max-age=30' },
  })
})
