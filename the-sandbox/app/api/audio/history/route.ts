import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { prisma } from '../../../lib/prisma'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const history = await prisma.studentAudioHistory.findMany({
    where: { studentId: auth.user.id },
    orderBy: { lastListenAt: 'desc' },
    take: 50,
    include: {
      episode: {
        include: { audioRenders: { where: { isStale: false }, take: 1 } },
      },
    },
  })
  return NextResponse.json({ history }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
