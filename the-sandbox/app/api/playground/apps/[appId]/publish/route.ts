import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { assertPlaygroundCreator, requireDemoUser } from '../../../../../lib/playground-storage'
import { checkRateLimit } from '../../../../../lib/rate-limit'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) => {
    const { appId } = await params
    const user = await requireDemoUser(request)
    const rl = await checkRateLimit(request, user.id, 'API', user.role !== 'STUDENT')
    if (rl) return rl
    await assertPlaygroundCreator(appId, user.id)

    const app = await prisma.playgroundApp.update({
      where: { id: appId },
      data: { publishedAt: new Date() },
      select: { publishedAt: true },
    })

    return NextResponse.json({ publishedAt: app.publishedAt })
  })

export const DELETE = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) => {
    const { appId } = await params
    const user = await requireDemoUser(request)
    const rl = await checkRateLimit(request, user.id, 'API', user.role !== 'STUDENT')
    if (rl) return rl
    await assertPlaygroundCreator(appId, user.id)

    await prisma.playgroundApp.update({
      where: { id: appId },
      data: { publishedAt: null },
    })

    return NextResponse.json({ publishedAt: null })
  })
