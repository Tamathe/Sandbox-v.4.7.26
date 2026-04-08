import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
    const auth = await requireRequestUser(request)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    // Check if this user has any tools they created
    const toolCount = await prisma.tool.count({
      where: { creatorId: user.id },
    })

    if (toolCount === 0) {
      return NextResponse.json({
        uniqueUsersToday: 0,
        totalSessionsToday: 0,
        toolsUsedToday: 0,
        allTimeUniqueUsers: 0,
      }, {
        headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
      })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [todaySessions, allTimeSessions] = await Promise.all([
      prisma.toolSession.findMany({
        where: {
          tool: { creatorId: user.id },
          startedAt: { gte: today },
          userId: { not: null },
        },
        select: { userId: true, toolId: true },
      }),
      prisma.toolSession.findMany({
        where: {
          tool: { creatorId: user.id },
          userId: { not: null },
        },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ])

    const uniqueUsersTodaySet = new Set(todaySessions.map((s) => s.userId))
    const toolsUsedTodaySet = new Set(todaySessions.map((s) => s.toolId))

    return NextResponse.json({
      uniqueUsersToday: uniqueUsersTodaySet.size,
      totalSessionsToday: todaySessions.length,
      toolsUsedToday: toolsUsedTodaySet.size,
      allTimeUniqueUsers: allTimeSessions.length,
    }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
