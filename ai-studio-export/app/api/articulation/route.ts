import { NextRequest, NextResponse } from 'next/server'
import { canReviewArticulations, getEmailDomain } from '../../lib/articulation'
import { prisma } from '../../lib/prisma'
import { requireRequestUser, isAuthFailure } from '../../lib/server-auth'

export async function GET(request: NextRequest) {
  try {
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

    return NextResponse.json({ requests })
  } catch (error) {
    console.error('GET /api/articulation error:', error)
    return NextResponse.json(
      { error: 'Failed to load articulation requests.' },
      { status: 500 }
    )
  }
}
