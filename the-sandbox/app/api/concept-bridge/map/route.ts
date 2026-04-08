import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const bridges = await prisma.conceptBridge.findMany({
    where: { similarity: { gte: 0.7 } },
    select: {
      conceptA: true,
      courseA: true,
      conceptB: true,
      courseB: true,
      similarity: true,
      bridgeType: true,
    },
    take: 200,
  })

  return NextResponse.json({ bridges }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
