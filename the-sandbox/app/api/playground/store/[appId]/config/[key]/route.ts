import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../../lib/prisma'
import { withErrorHandling } from '../../../../../../lib/api-utils'
import { parseRequestBody } from '../../../../../../lib/server-auth'
import {
  assertCreatorRole,
  buildConfigStoreUniqueKey,
  getSerializedSize,
  playgroundCorsPreflight,
  toPlaygroundJsonValue,
  verifyPlaygroundStorageToken,
  withPlaygroundCors,
} from '../../../../../../lib/playground-storage'

export function OPTIONS(request: NextRequest) {
  return playgroundCorsPreflight(request.headers.get('origin'))
}

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; key: string }> }
) => {
    const { appId, key } = await params
    verifyPlaygroundStorageToken(request, appId)
    const origin = request.headers.get('origin')

    const entry = await prisma.appStoreEntry.findFirst({
      where: {
        appId,
        type: 'config',
        bucket: key,
      },
      select: { data: true },
    })

    return withPlaygroundCors(NextResponse.json(entry?.data ?? { value: null }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    }), origin)
  })

export const PUT = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; key: string }> }
) => {
    const { appId, key } = await params
    const payload = verifyPlaygroundStorageToken(request, appId)
    assertCreatorRole(payload)
    const origin = request.headers.get('origin')

    const parsed = await parseRequestBody<{ value?: unknown }>(request)
    if ('error' in parsed) return parsed.error
    const body = parsed.data
    if (!body || typeof body !== 'object' || !Object.prototype.hasOwnProperty.call(body, 'value')) {
      return withPlaygroundCors(
        NextResponse.json({ error: 'value is required' }, { status: 400 }), origin
      )
    }

    if (getSerializedSize(body.value) > 102_400) {
      return withPlaygroundCors(
        NextResponse.json({ error: 'Config value exceeds 100 KB limit' }, { status: 413 }), origin
      )
    }

    const data = { value: toPlaygroundJsonValue(body.value) }

    await prisma.appStoreEntry.upsert({
      where: {
        uniqueKey: buildConfigStoreUniqueKey(appId, key),
      },
      update: {
        data,
        bucket: key,
        type: 'config',
        userId: null,
      },
      create: {
        uniqueKey: buildConfigStoreUniqueKey(appId, key),
        appId,
        type: 'config',
        bucket: key,
        userId: null,
        data,
      },
    })

    return withPlaygroundCors(NextResponse.json(data), origin)
  })
