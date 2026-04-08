import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { withErrorHandling } from '../../../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '24', 10), 100)
    const cursor = searchParams.get('cursor') // ISO date string of last publishedAt seen

    const where = cursor
      ? { AND: [{ publishedAt: { not: null } }, { publishedAt: { lt: new Date(cursor) } }] }
      : { publishedAt: { not: null } }

    const [apps, total] = await Promise.all([
      prisma.playgroundApp.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          tags: true,
          publishedAt: true,
          creator: { select: { name: true } },
        },
        orderBy: { publishedAt: 'desc' },
        take: limit,
      }),
      prisma.playgroundApp.count({ where: { publishedAt: { not: null } } }),
    ])

    return NextResponse.json({
      apps: apps.map(a => ({
        id: a.id,
        title: a.title,
        description: a.description,
        tags: a.tags,
        publishedAt: a.publishedAt,
        creatorName: a.creator.name,
      })),
      total,
    }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  })
