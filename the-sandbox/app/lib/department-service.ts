import { prisma } from './prisma'
import type { DepartmentVisibility, DepartmentMemberRole } from '../generated/prisma'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CreateDepartmentInput {
  name: string
  shortName: string
  slug: string
  description?: string
  logoUrl?: string
  bannerUrl?: string
  themeColor?: string
  websiteUrl?: string
  contactEmail?: string
  visibility?: DepartmentVisibility
  featured?: boolean
  displayOrder?: number
}

interface UpdateDepartmentInput {
  name?: string
  shortName?: string
  slug?: string
  description?: string | null
  logoUrl?: string | null
  bannerUrl?: string | null
  themeColor?: string | null
  websiteUrl?: string | null
  contactEmail?: string | null
  visibility?: DepartmentVisibility
  featured?: boolean
  displayOrder?: number
}

interface ListDepartmentsOptions {
  visibility?: DepartmentVisibility
  featured?: boolean
  page?: number
  pageSize?: number
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function createDepartment(data: CreateDepartmentInput, creatorId: string) {
  return prisma.department.create({
    data: {
      ...data,
      members: {
        create: { userId: creatorId, role: 'OWNER' },
      },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
      _count: { select: { collections: true, followers: true } },
    },
  })
}

export async function updateDepartment(id: string, data: UpdateDepartmentInput) {
  return prisma.department.update({
    where: { id },
    data,
    include: {
      _count: { select: { collections: true, followers: true, members: true } },
    },
  })
}

export async function getDepartment(slug: string) {
  return prisma.department.findUnique({
    where: { slug },
    include: {
      collections: {
        orderBy: [{ pinned: 'desc' }, { displayOrder: 'asc' }],
        include: {
          tools: {
            orderBy: [{ pinned: 'desc' }, { displayOrder: 'asc' }],
            include: {
              tool: {
                select: {
                  id: true,
                  name: true,
                  shortDescription: true,
                  category: true,
                  toolType: true,
                  thumbnailUrl: true,
                  approvalStatus: true,
                  isPortfolio: true,
                  creator: { select: { id: true, name: true, role: true } },
                },
              },
            },
          },
          _count: { select: { tools: true } },
        },
      },
      members: {
        include: { user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } } },
        orderBy: { createdAt: 'asc' },
      },
      _count: { select: { collections: true, followers: true, members: true } },
    },
  })
}

export async function getDepartmentBySlug(slug: string) {
  return prisma.department.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, shortName: true },
  })
}

export async function listDepartments(options: ListDepartmentsOptions = {}) {
  const { visibility, featured, page = 1, pageSize = 20 } = options

  const where: Record<string, unknown> = {}
  if (visibility) where.visibility = visibility
  if (featured !== undefined) where.featured = featured

  const [departments, total] = await Promise.all([
    prisma.department.findMany({
      where,
      orderBy: [{ featured: 'desc' }, { displayOrder: 'asc' }, { name: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { collections: true, followers: true, members: true } },
      },
    }),
    prisma.department.count({ where }),
  ])

  return { departments, total, page, pageSize }
}

// ─── User-specific queries ───────────────────────────────────────────────────

const DEPARTMENT_CARD_INCLUDE = {
  _count: { select: { collections: true, followers: true, members: true } },
} as const

export async function getMyDepartments(userId: string) {
  const [memberships, follows] = await Promise.all([
    prisma.departmentMember.findMany({
      where: { userId },
      select: { department: { include: DEPARTMENT_CARD_INCLUDE } },
    }),
    prisma.departmentFollower.findMany({
      where: { userId },
      select: { department: { include: DEPARTMENT_CARD_INCLUDE } },
    }),
  ])

  // Deduplicate: member departments first, then followed-only
  const seen = new Set<string>()
  const departments = []
  for (const m of memberships) {
    seen.add(m.department.id)
    departments.push(m.department)
  }
  for (const f of follows) {
    if (!seen.has(f.department.id)) {
      departments.push(f.department)
    }
  }
  return departments
}

export async function getFeaturedDepartments() {
  return prisma.department.findMany({
    where: { featured: true, visibility: 'PUBLIC' },
    orderBy: [{ displayOrder: 'asc' }],
    include: DEPARTMENT_CARD_INCLUDE,
  })
}

// ─── Tool count helpers ──────────────────────────────────────────────────────

export async function getDepartmentToolCount(departmentId: string) {
  const result = await prisma.collectionTool.findMany({
    where: { collection: { departmentId } },
    select: { toolId: true },
    distinct: ['toolId'],
  })
  return result.length
}

// ─── Members ─────────────────────────────────────────────────────────────────

export async function addMember(departmentId: string, userId: string, role: DepartmentMemberRole) {
  return prisma.departmentMember.create({
    data: { departmentId, userId, role },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  })
}

export async function removeMember(departmentId: string, userId: string) {
  return prisma.departmentMember.delete({
    where: { departmentId_userId: { departmentId, userId } },
  })
}

export async function listMembers(departmentId: string) {
  return prisma.departmentMember.findMany({
    where: { departmentId },
    include: { user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' },
  })
}

// ─── Followers ───────────────────────────────────────────────────────────────

export async function followDepartment(departmentId: string, userId: string) {
  return prisma.departmentFollower.create({
    data: { departmentId, userId },
  })
}

export async function unfollowDepartment(departmentId: string, userId: string) {
  return prisma.departmentFollower.delete({
    where: { departmentId_userId: { departmentId, userId } },
  })
}

export async function isFollowing(departmentId: string, userId: string) {
  const follow = await prisma.departmentFollower.findUnique({
    where: { departmentId_userId: { departmentId, userId } },
    select: { id: true },
  })
  return !!follow
}

export async function updateMemberRole(departmentId: string, userId: string, role: DepartmentMemberRole) {
  return prisma.departmentMember.update({
    where: { departmentId_userId: { departmentId, userId } },
    data: { role },
    include: { user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } } },
  })
}

export async function lookupUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true, avatarUrl: true },
  })
}

// ─── Search (Sandy tool) ────────────────────────────────────────────────────

export async function searchDepartmentTools(query: string, departmentSlug?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    tool: {
      approvalStatus: 'APPROVED',
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { shortDescription: { contains: query, mode: 'insensitive' } },
      ],
    },
    collection: {
      department: departmentSlug
        ? { slug: departmentSlug }
        : { isNot: null },
    },
  }

  const results = await prisma.collectionTool.findMany({
    where,
    take: 10,
    include: {
      tool: {
        select: { id: true, name: true, shortDescription: true, category: true },
      },
      collection: {
        select: {
          name: true,
          department: { select: { name: true, slug: true } },
        },
      },
    },
  })

  return results.map(r => ({
    toolId: r.tool.id,
    name: r.tool.name,
    shortDescription: r.tool.shortDescription,
    category: r.tool.category,
    departmentName: r.collection.department?.name ?? 'Platform',
    departmentSlug: r.collection.department?.slug ?? null,
    collectionName: r.collection.name,
    url: `/tools/${r.tool.id}`,
  }))
}

// ─── Storefront context (for Sandy concierge) ──────────────────────────────

export async function getDepartmentStorefrontContext(slug: string) {
  const dept = await prisma.department.findUnique({
    where: { slug },
    select: {
      name: true,
      shortName: true,
      description: true,
      collections: {
        orderBy: { displayOrder: 'asc' },
        select: { name: true, _count: { select: { tools: true } } },
      },
    },
  })
  if (!dept) return null

  const totalTools = dept.collections.reduce((sum, c) => sum + c._count.tools, 0)
  return {
    name: dept.name,
    shortName: dept.shortName,
    description: dept.description,
    collections: dept.collections.map(c => ({ name: c.name, toolCount: c._count.tools })),
    totalTools,
  }
}

// ─── Follower notifications ─────────────────────────────────────────────────

export async function notifyDepartmentFollowers(
  departmentId: string,
  type: 'DEPARTMENT_TOOL_ADDED' | 'DEPARTMENT_COLLECTION_UPDATED',
  title: string,
  body: string,
  href: string,
) {
  const { createNotification } = await import('./notifications')
  const followers = await prisma.departmentFollower.findMany({
    where: { departmentId },
    select: { userId: true },
  })

  await Promise.allSettled(
    followers.map(f =>
      createNotification({ userId: f.userId, type, title, body, href })
    )
  )
}

// ─── Suggested departments (for discovery page) ─────────────────────────────

export async function getSuggestedDepartments(userId: string, userRole: string, userCollege?: string | null) {
  // Get departments the user is NOT already a member/follower of
  const [memberIds, followerIds] = await Promise.all([
    prisma.departmentMember.findMany({ where: { userId }, select: { departmentId: true } }),
    prisma.departmentFollower.findMany({ where: { userId }, select: { departmentId: true } }),
  ])
  const excludeIds = new Set([
    ...memberIds.map(m => m.departmentId),
    ...followerIds.map(f => f.departmentId),
  ])

  const allPublic = await prisma.department.findMany({
    where: { visibility: 'PUBLIC' },
    orderBy: [{ featured: 'desc' }, { displayOrder: 'asc' }],
    include: {
      _count: { select: { collections: true, followers: true, members: true } },
    },
  })

  const suggestions = allPublic.filter(d => !excludeIds.has(d.id))

  // Boost college-matched departments to top
  if (userCollege) {
    const collegeLower = userCollege.toLowerCase()
    suggestions.sort((a, b) => {
      const aMatch = a.name.toLowerCase().includes(collegeLower) || a.shortName.toLowerCase() === collegeLower
      const bMatch = b.name.toLowerCase().includes(collegeLower) || b.shortName.toLowerCase() === collegeLower
      if (aMatch && !bMatch) return -1
      if (!aMatch && bMatch) return 1
      return 0
    })
  }

  return suggestions
}

// ─── All departments with category filter ───────────────────────────────────

export async function listAllDepartments(options: { category?: string; page?: number; pageSize?: number } = {}) {
  const { category, page = 1, pageSize = 50 } = options
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { visibility: 'PUBLIC' }
  if (category) {
    where.categoryTags = { has: category }
  }

  const [departments, total] = await Promise.all([
    prisma.department.findMany({
      where,
      orderBy: [{ featured: 'desc' }, { displayOrder: 'asc' }, { name: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { collections: true, followers: true, members: true } },
      },
    }),
    prisma.department.count({ where }),
  ])

  return { departments, total }
}

// ─── Distinct category tags ─────────────────────────────────────────────────

export async function getDepartmentCategoryTags(): Promise<string[]> {
  const departments = await prisma.department.findMany({
    where: { visibility: 'PUBLIC' },
    select: { categoryTags: true },
  })
  const tags = new Set<string>()
  for (const d of departments) {
    for (const t of d.categoryTags) tags.add(t)
  }
  return Array.from(tags).sort()
}

// ─── Analytics ──────────────────────────────────────────────────────────────

export async function getDepartmentAnalytics(departmentId: string) {
  // Get all tool IDs in this department's collections
  const collectionTools = await prisma.collectionTool.findMany({
    where: { collection: { departmentId } },
    select: { toolId: true, collection: { select: { id: true, name: true } } },
    distinct: ['toolId'],
  })
  const toolIds = collectionTools.map(ct => ct.toolId)

  // Total sessions across department tools
  const totalSessions = toolIds.length > 0
    ? await prisma.toolSession.count({ where: { toolId: { in: toolIds } } })
    : 0

  // Top tools by session count
  const topTools = toolIds.length > 0
    ? await prisma.toolSession.groupBy({
        by: ['toolId'],
        where: { toolId: { in: toolIds } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      })
    : []

  // Resolve tool names for top tools
  const topToolIds = topTools.map(t => t.toolId)
  const toolDetails = topToolIds.length > 0
    ? await prisma.tool.findMany({
        where: { id: { in: topToolIds } },
        select: { id: true, name: true },
      })
    : []
  const toolNameMap = new Map(toolDetails.map(t => [t.id, t.name]))

  const topToolsWithNames = topTools.map(t => ({
    toolId: t.toolId,
    name: toolNameMap.get(t.toolId) ?? 'Unknown',
    sessions: t._count.id,
  }))

  // Tool count by collection
  const collections = await prisma.toolCollection.findMany({
    where: { departmentId },
    select: { id: true, name: true, _count: { select: { tools: true } } },
    orderBy: { displayOrder: 'asc' },
  })
  const toolCountByCollection = collections.map(c => ({
    collectionId: c.id,
    name: c.name,
    toolCount: c._count.tools,
  }))

  // Follower count
  const followerCount = await prisma.departmentFollower.count({ where: { departmentId } })

  return {
    totalSessions,
    topTools: topToolsWithNames,
    toolCountByCollection,
    followerCount,
    totalTools: toolIds.length,
  }
}
