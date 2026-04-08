import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { isAuthFailure, requireAdminUser } from '../../../lib/server-auth'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminUser(req)
    if (isAuthFailure(auth)) {
      return auth.response
    }

    const submissions = await prisma.sandcastleSubmission.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        reviewedByAdmin: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({ submissions })
  } catch (error) {
    console.error('GET /api/admin/sandcastle-submissions error:', error)
    return NextResponse.json({ error: 'Failed to fetch Sandcastle submissions' }, { status: 500 })
  }
}
