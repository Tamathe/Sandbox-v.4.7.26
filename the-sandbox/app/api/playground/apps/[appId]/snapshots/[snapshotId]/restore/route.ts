import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../../../lib/prisma'
import {
  assertPlaygroundCreator,
  requireDemoUser,
} from '../../../../../../../lib/playground-storage'
import { checkRateLimit } from '../../../../../../../lib/rate-limit'
import { withErrorHandling } from '../../../../../../../lib/api-utils'

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; snapshotId: string }> }
) => {
    const { appId, snapshotId } = await params
    const user = await requireDemoUser(request)
    const rl = await checkRateLimit(request, user.id, 'GENERATE', user.role !== 'STUDENT')
    if (rl) return rl
    await assertPlaygroundCreator(appId, user.id)

    const snapshot = await prisma.playgroundAppSnapshot.findUnique({
      where: { id: snapshotId },
      select: { appId: true, title: true, htmlContent: true },
    })

    if (!snapshot || snapshot.appId !== appId) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })
    }

    // Save current app state as a 'restore' snapshot before overwriting
    const current = await prisma.playgroundApp.findUnique({
      where: { id: appId },
      select: { title: true, htmlContent: true },
    })

    if (current) {
      await prisma.playgroundAppSnapshot.create({
        data: {
          appId,
          title: current.title,
          htmlContent: current.htmlContent,
          reason: 'restore',
        },
      })
    }

    await prisma.playgroundApp.update({
      where: { id: appId },
      data: {
        title: snapshot.title,
        htmlContent: snapshot.htmlContent,
      },
    })

    return NextResponse.json({
      restoredHtmlContent: snapshot.htmlContent,
      restoredTitle: snapshot.title,
    })
  })
