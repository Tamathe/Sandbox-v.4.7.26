import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../../lib/prisma'
import {
  buildUserStoreUniqueKey,
  getSerializedSize,
  handlePlaygroundError,
  playgroundCorsPreflight,
  toPlaygroundJsonValue,
  verifyPlaygroundStorageToken,
  withPlaygroundCors,
} from '../../../../../../lib/playground-storage'

export function OPTIONS() {
  return playgroundCorsPreflight()
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; key: string }> }
) {
  try {
    const { appId, key } = await params
    const payload = verifyPlaygroundStorageToken(request, appId)

    const entry = await prisma.appStoreEntry.findFirst({
      where: {
        appId,
        type: 'user',
        bucket: key,
        userId: payload.userId,
      },
      select: { data: true },
    })

    return withPlaygroundCors(NextResponse.json(entry?.data ?? { value: null }))
  } catch (error) {
    return withPlaygroundCors(
      handlePlaygroundError(error, 'GET /api/playground/store/[appId]/user/[key] error:')
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; key: string }> }
) {
  try {
    const { appId, key } = await params
    const payload = verifyPlaygroundStorageToken(request, appId)
    const body = (await request.json()) as { value?: unknown } | null

    if (!body || typeof body !== 'object' || !Object.prototype.hasOwnProperty.call(body, 'value')) {
      return withPlaygroundCors(
        NextResponse.json({ error: 'value is required' }, { status: 400 })
      )
    }

    if (getSerializedSize(body.value) > 102_400) {
      return withPlaygroundCors(
        NextResponse.json({ error: 'User store value exceeds 100 KB limit' }, { status: 413 })
      )
    }

    const data = { value: toPlaygroundJsonValue(body.value) }

    await prisma.appStoreEntry.upsert({
      where: {
        uniqueKey: buildUserStoreUniqueKey(appId, payload.userId, key),
      },
      update: {
        data,
        userId: payload.userId,
        bucket: key,
        type: 'user',
      },
      create: {
        uniqueKey: buildUserStoreUniqueKey(appId, payload.userId, key),
        appId,
        type: 'user',
        bucket: key,
        userId: payload.userId,
        data,
      },
    })

    return withPlaygroundCors(NextResponse.json(data))
  } catch (error) {
    return withPlaygroundCors(
      handlePlaygroundError(error, 'PUT /api/playground/store/[appId]/user/[key] error:')
    )
  }
}
