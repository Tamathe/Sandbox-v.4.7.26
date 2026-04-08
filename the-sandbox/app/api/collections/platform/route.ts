import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const collections = await prisma.toolCollection.findMany({
    where: { departmentId: null },
    orderBy: { displayOrder: 'asc' },
    include: {
      tools: {
        orderBy: [{ pinned: 'desc' }, { displayOrder: 'asc' }],
        include: {
          tool: {
            select: {
              id: true,
              name: true,
              shortDescription: true,
              category: true,
              toolType: true,
              thumbnailUrl: true,
              approvalStatus: true,
            },
          },
        },
      },
    },
  })

  return NextResponse.json({ collections }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
