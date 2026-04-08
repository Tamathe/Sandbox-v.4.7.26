import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../../lib/server-auth'
import { prisma } from '../../../../../lib/prisma'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ packId: string }> }
) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { packId } = await params

  const pack = await prisma.customStarterPack.findUnique({
    where: { id: packId },
    select: { userId: true },
  })

  if (!pack) {
    return NextResponse.json({ error: 'Pack not found' }, { status: 404 })
  }
  if (pack.userId !== auth.user.id && auth.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const items = await prisma.customPackItem.findMany({
    where: { packId },
    include: {
      template: true,
      implementation: true,
    },
    orderBy: { sortOrder: 'asc' },
  })

  const total = items.length
  const started = items.filter(i => i.implementation && i.implementation.status !== 'NOT_STARTED').length
  const completed = items.filter(i => i.implementation?.status === 'COMPLETED' || i.implementation?.status === 'REFLECTED').length
  const reflected = items.filter(i => i.implementation?.status === 'REFLECTED').length

  return NextResponse.json({
    items,
    progress: { total, started, completed, reflected },
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
