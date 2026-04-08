import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../../lib/server-auth'
import { prisma } from '../../../../../../lib/prisma'

const VALID_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'REFLECTED'] as const

export const PATCH = withErrorHandling(async (
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
  const body = parsed.data as { status: typeof VALID_STATUSES[number]; reflectionNotes?: string }
  const { status } = body

  if (!status || !VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const now = new Date()
  const data: Record<string, unknown> = { status }

  if (status === 'IN_PROGRESS') {
    data.startedAt = now
  }
  if (status === 'COMPLETED') {
    data.completedAt = now
  }

  const implementation = await prisma.packImplementation.upsert({
    where: { itemId },
    create: {
      packId,
      itemId,
      status,
      ...(status === 'IN_PROGRESS' && { startedAt: now }),
      ...(status === 'COMPLETED' && { completedAt: now }),
    },
    update: data,
  })

  // Update parent pack status based on all implementations
  const allImplementations = await prisma.packImplementation.findMany({
    where: { packId },
  })
  const allItems = await prisma.customPackItem.count({ where: { packId } })

  const allReflected = allImplementations.length === allItems &&
    allImplementations.every(i => i.status === 'REFLECTED')
  const anyStarted = allImplementations.some(i => i.status !== 'NOT_STARTED')

  if (allReflected) {
    await prisma.customStarterPack.update({
      where: { id: packId },
      data: { status: 'COMPLETED' },
    })
  } else if (anyStarted) {
    await prisma.customStarterPack.update({
      where: { id: packId },
      data: { status: 'IN_PROGRESS' },
    })
  }

  return NextResponse.json({ implementation })
})
