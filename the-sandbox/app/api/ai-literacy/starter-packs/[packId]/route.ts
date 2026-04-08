import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { prisma } from '../../../../lib/prisma'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ packId: string }> }
) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { packId } = await params

  const pack = await prisma.customStarterPack.findUnique({
    where: { id: packId },
    include: {
      items: {
        include: { template: true },
        orderBy: { sortOrder: 'asc' },
      },
      checkpoints: {
        include: { checkpoint: true },
        orderBy: { sortOrder: 'asc' },
      },
      implementations: true,
    },
  })

  if (!pack) {
    return NextResponse.json({ error: 'Pack not found' }, { status: 404 })
  }

  if (pack.userId !== auth.user.id && auth.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ pack }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
