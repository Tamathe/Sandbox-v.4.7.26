import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { prisma } from '../../../lib/prisma'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const campaigns = await prisma.philanthropyCampaign.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      organization: true,
      philanthropy: true,
      city: true,
      donationType: true,
      eventName: true,
      eventDate: true,
      contactStatus: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ campaigns }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
