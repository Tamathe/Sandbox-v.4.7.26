import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireAdminUser(req)
    if (isAuthFailure(auth)) return auth.response

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Run all aggregations in parallel
    const [allLogs, topSectionsRaw] = await Promise.all([
      prisma.uKNowQueryLog.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { query: true, topSection: true, topTopics: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.uKNowQueryLog.groupBy({
        by: ['topSection'],
        where: { createdAt: { gte: thirtyDaysAgo }, topSection: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ])

    // Top queries by frequency
    const queryCounts = new Map<string, number>()
    const topicCounts = new Map<string, number>()
    const dayCounts = new Map<string, number>()

    for (const log of allLogs) {
      // Query counts
      const q = log.query.toLowerCase().trim()
      if (q) queryCounts.set(q, (queryCounts.get(q) ?? 0) + 1)

      // Topic counts
      for (const topic of log.topTopics) {
        topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1)
      }

      // Day volume
      const day = log.createdAt.toISOString().slice(0, 10)
      dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1)
    }

    const topQueries = [...queryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }))

    const topSections = topSectionsRaw
      .filter((s) => s.topSection)
      .map((s) => ({ section: s.topSection!, count: s._count.id }))

    const trendingTopics = [...topicCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([topic, count]) => ({ topic, count }))

    // Fill in missing days for sparkline
    const volumeByDay: Array<{ date: string; count: number }> = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      volumeByDay.push({ date: key, count: dayCounts.get(key) ?? 0 })
    }

    return NextResponse.json({ topQueries, topSections, trendingTopics, volumeByDay }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})
