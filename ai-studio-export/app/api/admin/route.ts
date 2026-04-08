import { NextRequest, NextResponse } from 'next/server'
import { estimateHaikuCostUsd } from '../../lib/admin-control-tower'
import { prisma } from '../../lib/prisma'
import { requireAdminUser, isAuthFailure } from '../../lib/server-auth'

function settled<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === 'fulfilled' ? result.value : fallback
}

function getMonthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminUser(req)
    if (isAuthFailure(auth)) return auth.response

    const monthStart = getMonthStart()

    const results = await Promise.allSettled([
      prisma.tool.count({ where: { published: true, approvalStatus: { not: 'SUSPENDED' } } }),
      prisma.toolSession.count(),
      prisma.user.count(),
      prisma.upvote.count(),
      prisma.tool.findMany({
        where: { published: true, approvalStatus: { notIn: ['REJECTED', 'SUSPENDED'] } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          creator: true,
          _count: { select: { upvotes: true, favorites: true, comments: true, sessions: true } },
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
          _count: { select: { upvotes: true, favorites: true, comments: true, sessions: true } },
        },
      }),
      prisma.tool.findMany({
        where: { isOfficialService: true },
        orderBy: { createdAt: 'desc' },
        include: {
          creator: true,
          _count: { select: { upvotes: true, favorites: true, comments: true, sessions: true } },
        },
      }),
      prisma.tool.findMany({
        where: { approvalStatus: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        include: {
          creator: true,
          _count: { select: { upvotes: true, favorites: true, comments: true, sessions: true } },
        },
      }),
      prisma.toolSession.findMany({
        where: { chatMessages: { some: { flagged: true } } },
        orderBy: { startedAt: 'desc' },
        take: 10,
        include: {
          user: { select: { id: true, name: true, email: true } },
          tool: { select: { id: true, name: true, category: true, isOfficialService: true } },
          chatMessages: {
            where: { flagged: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              role: true,
              content: true,
              flagCategory: true,
              flagReason: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.adminAnnouncement.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.sandcastleSubmission.findMany({
        where: { approvalStatus: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          creator: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.adminAuditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: {
          admin: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.toolSession.findMany({
        where: { tool: { isOfficialService: true } },
        orderBy: { startedAt: 'desc' },
        take: 6,
        include: {
          user: { select: { id: true, name: true, email: true } },
          tool: { select: { id: true, name: true, serviceProtocol: true } },
          chatMessages: {
            orderBy: { createdAt: 'desc' },
            take: 2,
            select: { id: true, role: true, content: true, createdAt: true },
          },
        },
      }),
      prisma.chatMessage.findMany({
        where: { createdAt: { gte: monthStart }, role: 'assistant' },
        select: {
          inputTokens: true,
          outputTokens: true,
          tokensUsed: true,
          session: {
            select: {
              toolId: true,
              userId: true,
              tool: { select: { id: true, name: true } },
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      }),
    ])

    const [
      totalTools,
      totalSessions,
      totalUsers,
      totalUpvotes,
      recentTools,
      topCreators,
      allTools,
      serviceBots,
      pendingTools,
      flaggedSessions,
      recentAnnouncements,
      sandcastleQueue,
      auditLog,
      serviceBotSamples,
      monthlyMessages,
    ] = [
      settled(results[0], 0),
      settled(results[1], 0),
      settled(results[2], 0),
      settled(results[3], 0),
      settled(results[4], []),
      settled(results[5], []),
      settled(results[6], []),
      settled(results[7], []),
      settled(results[8], []),
      settled(results[9], []),
      settled(results[10], []),
      settled(results[11], []),
      settled(results[12], []),
      settled(results[13], []),
      settled(results[14], []),
    ]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const economics = (monthlyMessages as any[]).reduce(
      (acc, message) => {
        const tool = message.session.tool
        const sessionUser = message.session.user
        const toolKey = tool?.id ?? 'unknown-tool'
        const userKey = sessionUser?.id ?? 'unknown-user'

        acc.totalInputTokens += message.inputTokens
        acc.totalOutputTokens += message.outputTokens
        acc.totalTokens += message.tokensUsed

        if (tool) {
          const toolEntry = acc.tools.get(toolKey) ?? {
            toolId: tool.id,
            toolName: tool.name,
            inputTokens: 0,
            outputTokens: 0,
            tokensUsed: 0,
          }
          toolEntry.inputTokens += message.inputTokens
          toolEntry.outputTokens += message.outputTokens
          toolEntry.tokensUsed += message.tokensUsed
          acc.tools.set(toolKey, toolEntry)
        }

        if (sessionUser) {
          const userEntry = acc.users.get(userKey) ?? {
            userId: sessionUser.id,
            userName: sessionUser.name,
            userEmail: sessionUser.email,
            inputTokens: 0,
            outputTokens: 0,
            tokensUsed: 0,
          }
          userEntry.inputTokens += message.inputTokens
          userEntry.outputTokens += message.outputTokens
          userEntry.tokensUsed += message.tokensUsed
          acc.users.set(userKey, userEntry)
        }

        return acc
      },
      {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        tools: new Map<
          string,
          { toolId: string; toolName: string; inputTokens: number; outputTokens: number; tokensUsed: number }
        >(),
        users: new Map<
          string,
          { userId: string; userName: string; userEmail: string; inputTokens: number; outputTokens: number; tokensUsed: number }
        >(),
      }
    )

    const totalEstimatedCost = estimateHaikuCostUsd(
      economics.totalInputTokens,
      economics.totalOutputTokens
    )

    return NextResponse.json({
      totalTools,
      totalSessions,
      totalUsers,
      totalUpvotes,
      recentTools,
      topCreators,
      allTools,
      serviceBots,
      pendingTools,
      flaggedSessions,
      recentAnnouncements,
      sandcastleQueue,
      auditLog,
      serviceBotSamples,
      economics: {
        monthStart,
        totalInputTokens: economics.totalInputTokens,
        totalOutputTokens: economics.totalOutputTokens,
        totalTokens: economics.totalTokens,
        totalEstimatedCostUsd: totalEstimatedCost,
        topTools: [...economics.tools.values()]
          .sort((left, right) => right.tokensUsed - left.tokensUsed)
          .slice(0, 10)
          .map((entry) => ({
            ...entry,
            estimatedCostUsd: estimateHaikuCostUsd(entry.inputTokens, entry.outputTokens),
          })),
        topUsers: [...economics.users.values()]
          .sort((left, right) => right.tokensUsed - left.tokensUsed)
          .slice(0, 10)
          .map((entry) => ({
            ...entry,
            estimatedCostUsd: estimateHaikuCostUsd(entry.inputTokens, entry.outputTokens),
          })),
      },
    })
  } catch (error) {
    console.error('GET /api/admin error:', error)
    return NextResponse.json({ error: 'Failed to fetch admin stats' }, { status: 500 })
  }
}
