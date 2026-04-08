import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '../../../lib/prisma'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response
  if (auth.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const prisma = getPrismaClient()

  try {
    const sources = await prisma.newsSource.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { articles: true } },
      },
    })

    return NextResponse.json({ sources }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  } catch (err) {
    console.error('GET /api/news/sources error:', err)
    return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 })
  }
})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response
  if (auth.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const prisma = getPrismaClient()

  const parsed = await parseRequestBody<{
    name: string
    rssUrl: string
    sourceType: 'INTERNAL' | 'EXTERNAL'
    category?: string
  }>(request)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  try {
    const source = await prisma.newsSource.create({
      data: {
        name: body.name,
        rssUrl: body.rssUrl,
        sourceType: body.sourceType,
        category: body.category ?? null,
      },
    })

    return NextResponse.json({ source }, { status: 201 })
  } catch (err) {
    console.error('POST /api/news/sources error:', err)
    return NextResponse.json({ error: 'Failed to create source' }, { status: 500 })
  }
})
