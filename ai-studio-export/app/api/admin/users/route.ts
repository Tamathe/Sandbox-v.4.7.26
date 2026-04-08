import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireAdminUser, isAuthFailure } from '../../../lib/server-auth'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminUser(req)
    if (isAuthFailure(auth)) return auth.response

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            tools: true,
            toolSessions: true,
          },
        },
      },
    })

    const flaggedSessions = await prisma.toolSession.groupBy({
      by: ['userId'],
      where: {
        userId: { not: null },
        chatMessages: { some: { flagged: true } },
      },
      _count: { _all: true },
    })

    const flaggedSessionMap = new Map(
      flaggedSessions.map((entry) => [entry.userId, entry._count._all])
    )

    return NextResponse.json({
      users: users.map((user) => ({
        ...user,
        flaggedSessionCount: flaggedSessionMap.get(user.id) ?? 0,
      })),
    })
  } catch (error) {
    console.error('GET /api/admin/users error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
