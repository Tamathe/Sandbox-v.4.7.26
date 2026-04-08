import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const events = await prisma.campusEvent.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
        endsOn: { gte: new Date() },
        visibility: 'Public',
      },
      select: {
        id: true,
        name: true,
        location: true,
        startsOn: true,
        endsOn: true,
        latitude: true,
        longitude: true,
        theme: true,
        categoryNames: true,
        organizationName: true,
        imagePath: true,
      },
      orderBy: { startsOn: 'asc' },
      take: 200,
    })

    return NextResponse.json({ events }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
