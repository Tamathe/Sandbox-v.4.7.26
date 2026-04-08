import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../../lib/prisma'
import { handlePlaygroundError, requireDemoUser } from '../../../../../../lib/playground-storage'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; delegateId: string }> }
) {
  try {
    const { appId, delegateId } = await params
    const user = await requireDemoUser(request)

    const app = await prisma.playgroundApp.findUnique({
      where: { id: appId },
      select: { creatorId: true },
    })

    if (!app) {
      return NextResponse.json({ error: 'Playground app not found' }, { status: 404 })
    }

    if (app.creatorId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const delegate = await prisma.appStoreDelegate.findUnique({
      where: { id: delegateId },
      select: { id: true, appId: true },
    })

    if (!delegate || delegate.appId !== appId) {
      return NextResponse.json({ error: 'Delegate not found' }, { status: 404 })
    }

    await prisma.appStoreDelegate.delete({
      where: { id: delegateId },
    })

    return NextResponse.json({ deleted: true })
  } catch (error) {
    return handlePlaygroundError(error, 'DELETE /api/playground/apps/[appId]/delegates/[delegateId] error:')
  }
}
