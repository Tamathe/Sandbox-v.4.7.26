import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth
    const { id: materialId } = await params
    await prisma.materialReadStatus.upsert({
      where: { userId_materialId: { userId: user.id, materialId } },
      create: { userId: user.id, materialId },
      update: { readAt: new Date() },
    })
    return NextResponse.json({ read: true })
  })

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth
    const { id: materialId } = await params
    await prisma.materialReadStatus.deleteMany({ where: { userId: user.id, materialId } })
    return NextResponse.json({ unread: true })
  })
