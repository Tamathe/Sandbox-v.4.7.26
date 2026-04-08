import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../../../lib/prisma'
import { withErrorHandling } from '../../../../../../../lib/api-utils'
import {
  playgroundCorsPreflight,
  verifyPlaygroundStorageToken,
  withPlaygroundCors,
} from '../../../../../../../lib/playground-storage'

export function OPTIONS(request: NextRequest) {
  return playgroundCorsPreflight(request.headers.get('origin'))
}

export const DELETE = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; name: string; entryId: string }> }
) => {
    const { appId, name, entryId } = await params
    const payload = verifyPlaygroundStorageToken(request, appId)
    const origin = request.headers.get('origin')

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
        NextResponse.json({ error: 'Entry not found' }, { status: 404 }), origin
      )
    }

    if (payload.role !== 'creator' && entry.userId !== payload.userId) {
      return withPlaygroundCors(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), origin)
    }

    await prisma.appStoreEntry.delete({ where: { id: entryId } })

    return withPlaygroundCors(NextResponse.json({ deleted: true }), origin)
  })
