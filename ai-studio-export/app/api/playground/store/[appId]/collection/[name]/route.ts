import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../../lib/prisma'
import {
  getSerializedSize,
  handlePlaygroundError,
  parsePositiveInt,
  playgroundCorsPreflight,
  sortStoreEntries,
  verifyPlaygroundStorageToken,
  withPlaygroundCors,
} from '../../../../../../lib/playground-storage'

export function OPTIONS() {
  return playgroundCorsPreflight()
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; name: string }> }
) {
  try {
    const { appId, name } = await params
    verifyPlaygroundStorageToken(request, appId)

    const { searchParams } = new URL(request.url)
    const orderBy = searchParams.get('orderBy')?.trim() || 'createdAt'
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc'
    const limit = parsePositiveInt(searchParams.get('limit'), 50, 100)

    const entries = await prisma.appStoreEntry.findMany({
      where: {
        appId,
        type: 'collection',
        bucket: name,
      },
      take: 1000,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        data: true,
        createdAt: true,
      },
    })

    const sorted = sortStoreEntries(entries, orderBy, order).slice(0, limit)

    return withPlaygroundCors(
      NextResponse.json({
        entries: sorted.map((entry) => ({
          id: entry.id,
          userId: entry.userId,
          data: entry.data,
          createdAt: entry.createdAt,
        })),
      })
    )
  } catch (error) {
    return withPlaygroundCors(
      handlePlaygroundError(error, 'GET /api/playground/store/[appId]/collection/[name] error:')
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; name: string }> }
) {
  try {
    const { appId, name } = await params
    const payload = verifyPlaygroundStorageToken(request, appId)
    const body = (await request.json()) as { data?: unknown }

    if (!body || typeof body !== 'object' || !Object.prototype.hasOwnProperty.call(body, 'data')) {
      return withPlaygroundCors(
        NextResponse.json({ error: 'data is required' }, { status: 400 })
      )
    }

    if (typeof body.data !== 'object' || body.data === null || Array.isArray(body.data)) {
      return withPlaygroundCors(
        NextResponse.json({ error: 'data must be an object' }, { status: 400 })
      )
    }

    if (getSerializedSize(body.data) > 10_240) {
      return withPlaygroundCors(
        NextResponse.json({ error: 'Collection entry exceeds 10 KB limit' }, { status: 413 })
      )
    }

    const count = await prisma.appStoreEntry.count({
      where: {
        appId,
        type: 'collection',
        bucket: name,
      },
    })

    if (count >= 1000) {
      return withPlaygroundCors(
        NextResponse.json({ error: 'Collection entry limit reached' }, { status: 429 })
      )
    }

    const entry = await prisma.appStoreEntry.create({
      data: {
        appId,
        type: 'collection',
        bucket: name,
        userId: payload.userId,
        data: body.data,
      },
      select: {
        id: true,
        userId: true,
        data: true,
        createdAt: true,
      },
    })

    return withPlaygroundCors(NextResponse.json(entry, { status: 201 }))
  } catch (error) {
    return withPlaygroundCors(
      handlePlaygroundError(error, 'POST /api/playground/store/[appId]/collection/[name] error:')
    )
  }
}
