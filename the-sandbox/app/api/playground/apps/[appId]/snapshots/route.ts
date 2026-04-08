import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import {
  assertPlaygroundCreator,
  requireDemoUser,
} from '../../../../../lib/playground-storage'
import { checkRateLimit } from '../../../../../lib/rate-limit'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) => {
    const { appId } = await params
    const user = await requireDemoUser(request)
    await assertPlaygroundCreator(appId, user.id)

    const snapshots = await prisma.playgroundAppSnapshot.findMany({
      where: { appId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, title: true, reason: true, createdAt: true },
    })

    return NextResponse.json({ snapshots }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  })

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) => {
    const { appId } = await params
    const user = await requireDemoUser(request)
    const rl = await checkRateLimit(request, user.id, 'API', user.role !== 'STUDENT')
    if (rl) return rl
    await assertPlaygroundCreator(appId, user.id)

    const app = await prisma.playgroundApp.findUnique({
      where: { id: appId },
      select: { htmlContent: true, title: true },
    })

    if (!app) {
      return NextResponse.json({ error: 'Playground app not found' }, { status: 404 })
    }

    const snapshot = await prisma.playgroundAppSnapshot.create({
      data: {
        appId,
        title: app.title,
        htmlContent: app.htmlContent,
        reason: 'manual',
      },
      select: { id: true, title: true, reason: true, createdAt: true },
    })

    return NextResponse.json({ snapshot }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  })
