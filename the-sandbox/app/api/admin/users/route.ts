import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { prisma } from '../../../lib/prisma'
import { requireAdminUser, isAuthFailure } from '../../../lib/server-auth'

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireAdminUser(req)
    if (isAuthFailure(auth)) return auth.response

    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') ?? '1'))
    const pageSize = 50
    const search = req.nextUrl.searchParams.get('search') ?? ''

    const where = search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { email: { contains: search, mode: 'insensitive' as const } }] }
      : {}

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
        include: {
          _count: {
            select: {
              tools: true,
              toolSessions: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ])

    const userIds = users.map(u => u.id)
    const flaggedSessions = userIds.length > 0
      ? await prisma.toolSession.groupBy({
          by: ['userId'],
          where: {
            userId: { in: userIds },
            chatMessages: { some: { flagged: true } },
          },
          _count: { _all: true },
        })
      : []

    const flaggedSessionMap = new Map(
      flaggedSessions.map((entry) => [entry.userId, entry._count._all])
    )

    return NextResponse.json({
      users: users.map((user) => ({
        ...user,
        flaggedSessionCount: flaggedSessionMap.get(user.id) ?? 0,
      })),
      pagination: { page, pageSize, total },
    }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})
