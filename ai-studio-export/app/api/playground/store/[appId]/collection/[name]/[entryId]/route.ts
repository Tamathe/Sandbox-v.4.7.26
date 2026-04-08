import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../../../lib/prisma'
import {
  handlePlaygroundError,
  playgroundCorsPreflight,
  verifyPlaygroundStorageToken,
  withPlaygroundCors,
} from '../../../../../../../lib/playground-storage'

export function OPTIONS() {
  return playgroundCorsPreflight()
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; name: string; entryId: string }> }
) {
  try {
    const { appId, name, entryId } = await params
    const payload = verifyPlaygroundStorageToken(request, appId)

    const entry = await prisma.appStoreEntry.findUnique({
      where: { id: entryId },
      select: {
        id: true,
        appId: true,
        type: true,
        bucket: true,
        userId: true,
      },
    })

    if (!entry || entry.appId !== appId || entry.type !== 'collection' || entry.bucket !== name) {
      return withPlaygroundCors(
        NextResponse.json({ error: 'Entry not found' }, { status: 404 })
      )
    }

    if (payload.role !== 'creator' && entry.userId !== payload.userId) {
      return withPlaygroundCors(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
    }

    await prisma.appStoreEntry.delete({ where: { id: entryId } })

    return withPlaygroundCors(NextResponse.json({ deleted: true }))
  } catch (error) {
    return withPlaygroundCors(
      handlePlaygroundError(
        error,
        'DELETE /api/playground/store/[appId]/collection/[name]/[entryId] error:'
      )
    )
  }
}
