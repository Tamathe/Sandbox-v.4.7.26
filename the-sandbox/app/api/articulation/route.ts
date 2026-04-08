import { NextRequest, NextResponse } from 'next/server'
import { canReviewArticulations, getEmailDomain } from '../../lib/articulation'
import { prisma } from '../../lib/prisma'
import { requireRequestUser, isAuthFailure } from '../../lib/server-auth'
import { withErrorHandling } from '../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
    const auth = await requireRequestUser(request)
    if (isAuthFailure(auth)) return auth.response

    const { user } = auth
    const emailDomain = getEmailDomain(user.email)

    const where = canReviewArticulations(user.role)
      ? emailDomain
        ? { studentEmail: { endsWith: `@${emailDomain}` } }
        : {}
      : { studentEmail: user.email }

    const requests = await prisma.articulationRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ requests }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
