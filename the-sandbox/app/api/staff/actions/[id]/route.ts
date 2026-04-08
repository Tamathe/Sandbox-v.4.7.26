import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { prisma } from '../../../../lib/prisma'

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

  const item = await prisma.staffActionItem.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      submitter: { select: { id: true, name: true, email: true } },
      delegatedTo: { select: { id: true, name: true, email: true } },
    },
  })

  if (!item) {
    return NextResponse.json({ error: 'Action item not found' }, { status: 404 })
  }

  return NextResponse.json({ item }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
