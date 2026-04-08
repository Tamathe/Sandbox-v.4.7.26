import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../../../lib/server-auth'
import { prisma } from '../../../../../../../lib/prisma'

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ packId: string; itemId: string }> }
) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { packId, itemId } = await params

  const pack = await prisma.customStarterPack.findUnique({
    where: { id: packId },
    select: { userId: true },
  })

  if (!pack) {
    return NextResponse.json({ error: 'Pack not found' }, { status: 404 })
  }
  if (pack.userId !== auth.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { rating: number; reflection: string; wouldRepeat: boolean }
  const { rating, reflection, wouldRepeat } = body

  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 })
  }
  if (typeof reflection !== 'string' || !reflection.trim()) {
    return NextResponse.json({ error: 'Reflection text is required' }, { status: 400 })
  }
  if (typeof wouldRepeat !== 'boolean') {
    return NextResponse.json({ error: 'wouldRepeat must be a boolean' }, { status: 400 })
  }

  const implementation = await prisma.packImplementation.update({
    where: { itemId },
    data: {
      status: 'REFLECTED',
      rating,
      reflection: reflection.trim(),
      wouldRepeat,
    },
  })

  return NextResponse.json({ implementation })
})
