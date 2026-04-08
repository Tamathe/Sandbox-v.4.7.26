import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const userEmail = req.headers.get('x-demo-user-email')
    if (!userEmail) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const user = await prisma.user.findUnique({ where: { email: userEmail } })
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const [totalTools, totalSessions, totalUsers, totalUpvotes, recentTools, topCreators, allTools, serviceBots] =
      await Promise.all([
        prisma.tool.count({ where: { published: true } }),
        prisma.toolSession.count(),
        prisma.user.count(),
        prisma.upvote.count(),
        prisma.tool.findMany({
          where: { published: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            creator: true,
            _count: { select: { upvotes: true, favorites: true, comments: true } },
          },
        }),
        prisma.user.findMany({
          orderBy: { tools: { _count: 'desc' } },
          take: 5,
          include: { _count: { select: { tools: true } } },
        }),
        prisma.tool.findMany({
          orderBy: { createdAt: 'desc' },
          include: {
            creator: true,
            _count: { select: { upvotes: true, favorites: true, comments: true } },
          },
        }),
        prisma.tool.findMany({
          where: { isOfficialService: true },
          orderBy: { createdAt: 'desc' },
          include: {
            creator: true,
            _count: { select: { upvotes: true, favorites: true, comments: true } },
          },
        }),
      ])

    return NextResponse.json({
      totalTools,
      totalSessions,
      totalUsers,
      totalUpvotes,
      recentTools,
      topCreators,
      allTools,
      serviceBots,
    })
  } catch (error) {
    console.error('GET /api/admin error:', error)
    return NextResponse.json({ error: 'Failed to fetch admin stats' }, { status: 500 })
  }
}
