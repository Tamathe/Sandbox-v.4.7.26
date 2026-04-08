import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { subDays, format, startOfDay } from 'date-fns'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userEmail = req.headers.get('x-demo-user-email')
    if (!userEmail) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const user = await prisma.user.findUnique({ where: { email: userEmail } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const tool = await prisma.tool.findUnique({ where: { id } })
    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }
    if (tool.creatorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const thirtyDaysAgo = subDays(new Date(), 30)

    const [sessions, recentSessions, upvotes, totalUpvotesCount, favorites, metricEvents] = await Promise.all([
      // All-time aggregates (select only needed fields — no full row fetch)
      prisma.toolSession.findMany({
        where: { toolId: id },
        select: { userId: true, messageCount: true, startedAt: true },
      }),
      // 30-day sessions for chart (already filtered by date)
      prisma.toolSession.findMany({
        where: { toolId: id, startedAt: { gte: thirtyDaysAgo } },
        select: { userId: true, startedAt: true },
        orderBy: { startedAt: 'asc' },
      }),
      prisma.upvote.findMany({
        where: { toolId: id, createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.upvote.count({ where: { toolId: id } }),
      prisma.favorite.count({ where: { toolId: id } }),
      prisma.metricEvent.findMany({
        where: { toolId: id },
        select: { metricName: true, metricValue: true },
      }),
    ])

    // Sessions over time (last 30 days)
    const sessionsMap: Record<string, number> = {}
    const upvotesMap: Record<string, number> = {}
    for (let i = 29; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
      sessionsMap[date] = 0
      upvotesMap[date] = 0
    }

    recentSessions.forEach((s) => {
      const date = format(startOfDay(s.startedAt), 'yyyy-MM-dd')
      if (sessionsMap[date] !== undefined) sessionsMap[date]++
    })

    upvotes.forEach((u) => {
      const date = format(startOfDay(u.createdAt), 'yyyy-MM-dd')
      if (upvotesMap[date] !== undefined) upvotesMap[date]++
    })

    const sessionsOverTime = Object.entries(sessionsMap).map(([date, count]) => ({ date, count }))
    const upvotesOverTime = Object.entries(upvotesMap).map(([date, count]) => ({ date, count }))

    // All-time totals from full sessions list
    const uniqueUserIds = new Set(sessions.filter((s) => s.userId).map((s) => s.userId))
    const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0)

    // Custom metrics summary
    const metricsByName: Record<string, string[]> = {}
    metricEvents.forEach((e) => {
      if (!metricsByName[e.metricName]) metricsByName[e.metricName] = []
      metricsByName[e.metricName].push(e.metricValue)
    })

    const customMetricsSummary = Object.entries(metricsByName).map(([name, values]) => {
      const numericValues = values.map(Number).filter((v) => !isNaN(v))
      const avg =
        numericValues.length > 0
          ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length
          : null
      return {
        name,
        type: 'COUNTER',
        count: values.length,
        avg,
        values,
      }
    })

    return NextResponse.json({
      totalSessions: sessions.length,
      totalMessages,
      uniqueUsers: uniqueUserIds.size,
      upvotesCount: totalUpvotesCount,
      favoritesCount: favorites,
      sessionsOverTime,
      upvotesOverTime,
      customMetricsSummary,
    })
  } catch (error) {
    console.error('GET /api/tools/[id]/analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
