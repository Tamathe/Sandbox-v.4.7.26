import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { prisma } from '../../../../lib/prisma'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const url = new URL(req.url)
  const dateStr = url.searchParams.get('date')
  const date = dateStr ? new Date(dateStr) : new Date()

  // Normalize to date-only (strip time)
  const briefingDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const insights = await prisma.staffBriefingInsight.findMany({
    where: {
      userId: auth.user.id,
      briefingDate,
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ insights }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
