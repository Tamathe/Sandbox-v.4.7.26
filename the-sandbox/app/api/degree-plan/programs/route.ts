import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if ('response' in auth) return auth.response

    const programs = await prisma.degreeProgram.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { requirements: true } } },
    })
    return NextResponse.json(programs, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
