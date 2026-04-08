import { prisma } from './prisma'

// ─── Unified Hub Search ─────────────────────────────────────────────────────
// Searches across tools, departments, and collections in one query.

export interface HubSearchResult {
  tools: {
    id: string
    name: string
    shortDescription: string | null
    category: string
    toolType: string
    thumbnailUrl: string | null
    departmentName: string | null
    collectionName: string | null
  }[]
  departments: {
    id: string
    name: string
    shortName: string
    slug: string
    description: string | null
    logoUrl: string | null
    themeColor: string | null
    categoryTags: string[]
    _count: { collections: number; followers: number }
  }[]
  collections: {
    id: string
    name: string
    slug: string
    emoji: string | null
    toolCount: number
    departmentName: string | null
    departmentSlug: string | null
  }[]
  totalTools: number
}

export async function hubSearch(
  query: string,
  options: { limit?: number; userId?: string } = {},
): Promise<HubSearchResult> {
  const limit = options.limit ?? 10

  // Run all three searches in parallel
  const [toolResults, departmentResults, collectionResults] = await Promise.all([
    // Tools: search name, shortDescription, category + join department/collection names
    prisma.tool.findMany({
      where: {
        approvalStatus: 'APPROVED',
        published: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { shortDescription: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { sessions: { _count: 'desc' } },
      select: {
        id: true,
        name: true,
        shortDescription: true,
        category: true,
        toolType: true,
        thumbnailUrl: true,
        collectionEntries: {
          take: 1,
          select: {
            collection: {
              select: {
                name: true,
                department: { select: { name: true } },
              },
            },
          },
        },
      },
    }),

    // Departments: search name, shortName, description
    prisma.department.findMany({
      where: {
        visibility: 'PUBLIC',
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { shortName: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 5,
      orderBy: [{ featured: 'desc' }, { displayOrder: 'asc' }],
      select: {
        id: true,
        name: true,
        shortName: true,
        slug: true,
        description: true,
        logoUrl: true,
        themeColor: true,
        categoryTags: true,
        _count: { select: { collections: true, followers: true } },
      },
    }),

    // Collections: search name, description + join department name
    prisma.toolCollection.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 5,
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        emoji: true,
        _count: { select: { tools: true } },
        department: { select: { name: true, slug: true } },
      },
    }),
  ])

  // Also count total matching tools for "see all" link
  const totalTools = await prisma.tool.count({
    where: {
      approvalStatus: 'APPROVED',
      published: true,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { shortDescription: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
      ],
    },
  })

  // Log search (best-effort, non-blocking)
  if (query.trim().length >= 2) {
    prisma.hubSearchLog.create({
      data: {
        userId: options.userId ?? null,
        query: query.trim().toLowerCase(),
        resultCount: toolResults.length + departmentResults.length + collectionResults.length,
      },
    }).catch(() => {})
  }

  return {
    tools: toolResults.map(t => ({
      id: t.id,
      name: t.name,
      shortDescription: t.shortDescription,
      category: t.category,
      toolType: t.toolType,
      thumbnailUrl: t.thumbnailUrl,
      departmentName: t.collectionEntries[0]?.collection?.department?.name ?? null,
      collectionName: t.collectionEntries[0]?.collection?.name ?? null,
    })),
    departments: departmentResults,
    collections: collectionResults.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      emoji: c.emoji,
      toolCount: c._count.tools,
      departmentName: c.department?.name ?? null,
      departmentSlug: c.department?.slug ?? null,
    })),
    totalTools,
  }
}

// ─── Recent Searches (per user) ─────────────────────────────────────────────

export async function getRecentSearches(userId: string, limit = 5) {
  const logs = await prisma.hubSearchLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { query: true },
  })
  // Deduplicate, keep most recent
  const seen = new Set<string>()
  const result: string[] = []
  for (const log of logs) {
    if (!seen.has(log.query) && result.length < limit) {
      seen.add(log.query)
      result.push(log.query)
    }
  }
  return result
}

// ─── Popular Searches (global, last 7 days) ─────────────────────────────────

export async function getPopularSearches(limit = 5) {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const results = await prisma.hubSearchLog.groupBy({
    by: ['query'],
    where: { createdAt: { gte: weekAgo } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: limit,
  })

  return results.map(r => r.query)
}
