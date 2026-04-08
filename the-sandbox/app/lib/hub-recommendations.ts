import { prisma } from './prisma'

/**
 * Hub Recommendation Engine
 *
 * Generates personalized tool recommendations based on:
 *  - Session history ("Because you used X, try Y" — same category/collection)
 *  - Department membership and follows
 *  - Role-appropriate tools
 *  - College affiliation match
 *  - Popularity signals (session count)
 */

const TOOL_SELECT = {
  id: true,
  name: true,
  shortDescription: true,
  category: true,
  toolType: true,
  thumbnailUrl: true,
} as const

interface RecommendedTool {
  id: string
  name: string
  shortDescription: string | null
  category: string
  toolType: string
  thumbnailUrl: string | null
  reason: string
}

export async function getRecommendations(
  userId: string,
  userRole: string,
  userCollege?: string | null,
  limit = 6,
): Promise<RecommendedTool[]> {
  const seen = new Set<string>()
  const results: RecommendedTool[] = []

  function add(tools: { id: string; name: string; shortDescription: string | null; category: string; toolType: string; thumbnailUrl: string | null }[], reason: string) {
    for (const t of tools) {
      if (!seen.has(t.id) && results.length < limit) {
        seen.add(t.id)
        results.push({ ...t, reason })
      }
    }
  }

  // 0. Staff boost — surface staff-relevant tools first
  if (userRole === 'STAFF') {
    const staffTools = await prisma.tool.findMany({
      where: {
        approvalStatus: 'APPROVED',
        published: true,
        OR: [
          { name: { contains: 'policy', mode: 'insensitive' } },
          { name: { contains: 'committee', mode: 'insensitive' } },
          { name: { contains: 'communication', mode: 'insensitive' } },
          { name: { contains: 'survey', mode: 'insensitive' } },
          { name: { contains: 'action center', mode: 'insensitive' } },
          { name: { contains: 'document', mode: 'insensitive' } },
          { name: { contains: 'room reservation', mode: 'insensitive' } },
          { name: { contains: 'agenda', mode: 'insensitive' } },
          { name: { contains: 'minutes', mode: 'insensitive' } },
          { name: { contains: 'report', mode: 'insensitive' } },
          { name: { contains: 'university systems', mode: 'insensitive' } },
        ],
      },
      take: 4,
      orderBy: { sessions: { _count: 'desc' } },
      select: TOOL_SELECT,
    })
    add(staffTools, 'Popular with staff')
  }

  // 1. "Because you used X" — find tools in same collections as recently used tools
  const recentSessions = await prisma.toolSession.findMany({
    where: { userId },
    orderBy: { startedAt: 'desc' },
    take: 5,
    select: { toolId: true, tool: { select: { name: true, category: true } } },
  })

  if (recentSessions.length > 0) {
    const usedToolIds = recentSessions.map(s => s.toolId)
    // Find collections containing these tools
    const collectionIds = await prisma.collectionTool.findMany({
      where: { toolId: { in: usedToolIds } },
      select: { collectionId: true },
      distinct: ['collectionId'],
    })
    const cIds = collectionIds.map(c => c.collectionId)

    if (cIds.length > 0) {
      // Find other tools in those collections
      const relatedEntries = await prisma.collectionTool.findMany({
        where: {
          collectionId: { in: cIds },
          toolId: { notIn: usedToolIds },
          tool: { approvalStatus: 'APPROVED', published: true },
        },
        take: 4,
        select: { tool: { select: TOOL_SELECT } },
      })
      const firstName = recentSessions[0]?.tool?.name ?? 'recent tools'
      add(
        relatedEntries.map(r => r.tool),
        `Because you used ${firstName}`,
      )
    }
  }

  // 2. Popular in departments user follows
  const followedDepts = await prisma.departmentFollower.findMany({
    where: { userId },
    select: { department: { select: { id: true, shortName: true } } },
  })

  for (const f of followedDepts) {
    if (results.length >= limit) break
    const deptTools = await prisma.collectionTool.findMany({
      where: {
        collection: { departmentId: f.department.id },
        tool: { approvalStatus: 'APPROVED', published: true },
      },
      take: 2,
      select: { tool: { select: TOOL_SELECT } },
    })
    add(
      deptTools.map(ct => ct.tool),
      `Popular in ${f.department.shortName}`,
    )
  }

  // 3. College-matched department tools
  if (userCollege && results.length < limit) {
    const collegeDept = await prisma.department.findFirst({
      where: {
        OR: [
          { name: { contains: userCollege, mode: 'insensitive' } },
          { shortName: { equals: userCollege, mode: 'insensitive' } },
        ],
      },
      select: { id: true, shortName: true },
    })
    if (collegeDept) {
      const tools = await prisma.collectionTool.findMany({
        where: {
          collection: { departmentId: collegeDept.id },
          tool: { approvalStatus: 'APPROVED', published: true },
        },
        take: 3,
        select: { tool: { select: TOOL_SELECT } },
      })
      add(
        tools.map(ct => ct.tool),
        `From your college (${collegeDept.shortName})`,
      )
    }
  }

  // 4. Platform-wide popular tools (fallback)
  if (results.length < limit) {
    const usedToolIds = recentSessions.map(s => s.toolId)
    // Staff: suppress student-oriented tools (simulations, games, wellness)
    const staffSuppressFilter = userRole === 'STAFF' ? {
      NOT: {
        OR: [
          { name: { contains: 'simulator', mode: 'insensitive' as const } },
          { name: { contains: 'cardiac', mode: 'insensitive' as const } },
          { name: { contains: 'debate arena', mode: 'insensitive' as const } },
          { name: { contains: 'quiz bowl', mode: 'insensitive' as const } },
          { name: { contains: 'mindfulness', mode: 'insensitive' as const } },
          { name: { contains: 'habit tracker', mode: 'insensitive' as const } },
          { name: { contains: 'sleep log', mode: 'insensitive' as const } },
          { name: { contains: 'moot court', mode: 'insensitive' as const } },
        ],
      },
    } : {}
    const popular = await prisma.tool.findMany({
      where: {
        approvalStatus: 'APPROVED',
        published: true,
        id: { notIn: [...seen, ...usedToolIds] },
        ...staffSuppressFilter,
      },
      take: limit - results.length,
      orderBy: { sessions: { _count: 'desc' } },
      select: TOOL_SELECT,
    })
    add(popular, 'Popular on campus')
  }

  return results
}

// ─── Popular This Week (per department) ─────────────────────────────────────

export async function getPopularToolsInDepartment(departmentId: string, limit = 5) {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  // Get all tool IDs in this department
  const collectionTools = await prisma.collectionTool.findMany({
    where: { collection: { departmentId } },
    select: { toolId: true },
    distinct: ['toolId'],
  })
  const toolIds = collectionTools.map(ct => ct.toolId)
  if (toolIds.length === 0) return []

  // Count sessions this week per tool
  const sessionCounts = await prisma.toolSession.groupBy({
    by: ['toolId'],
    where: {
      toolId: { in: toolIds },
      startedAt: { gte: weekAgo },
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: limit,
  })

  if (sessionCounts.length === 0) return []

  // Fetch tool details
  const topToolIds = sessionCounts.map(s => s.toolId)
  const tools = await prisma.tool.findMany({
    where: { id: { in: topToolIds } },
    select: {
      id: true,
      name: true,
      shortDescription: true,
      category: true,
      toolType: true,
      thumbnailUrl: true,
    },
  })

  const toolMap = new Map(tools.map(t => [t.id, t]))
  const countMap = new Map(sessionCounts.map(s => [s.toolId, s._count.id]))

  return topToolIds
    .map(id => {
      const tool = toolMap.get(id)
      if (!tool) return null
      return { ...tool, sessionsThisWeek: countMap.get(id) ?? 0 }
    })
    .filter(Boolean)
}
