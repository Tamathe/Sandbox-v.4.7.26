/**
 * Pack Template Service — query functions for browsing and searching
 * StarterPackTemplate and CheckpointTemplate tables.
 */

import { prisma } from '../prisma'
import type {
  DisciplineFamily,
  AITier,
  PackAssignmentType,
  StarterPackTemplate,
  CheckpointTemplate,
  Prisma,
} from '../../generated/prisma'

// ---------------------------------------------------------------------------
// 1. getTemplates — paginated, filterable template browsing
// ---------------------------------------------------------------------------

export async function getTemplates(filters: {
  discipline?: DisciplineFamily
  tier?: AITier
  type?: PackAssignmentType
  search?: string
  page?: number
  pageSize?: number
}): Promise<{ templates: StarterPackTemplate[]; total: number }> {
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 20

  const where: Prisma.StarterPackTemplateWhereInput = {}

  if (filters.discipline) {
    where.disciplineFamily = filters.discipline
  }
  if (filters.tier) {
    where.aiTier = filters.tier
  }
  if (filters.type) {
    where.assignmentType = filters.type
  }
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { tags: { has: filters.search } },
    ]
  }

  const [templates, total] = await Promise.all([
    prisma.starterPackTemplate.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.starterPackTemplate.count({ where }),
  ])

  return { templates, total }
}

// ---------------------------------------------------------------------------
// 2. getTemplateById
// ---------------------------------------------------------------------------

export async function getTemplateById(
  id: string,
): Promise<StarterPackTemplate | null> {
  return prisma.starterPackTemplate.findUnique({ where: { id } })
}

// ---------------------------------------------------------------------------
// 3. getCheckpoints — filterable checkpoint browsing
// ---------------------------------------------------------------------------

export async function getCheckpoints(filters: {
  discipline?: DisciplineFamily
  tier?: AITier
}): Promise<CheckpointTemplate[]> {
  const where: Prisma.CheckpointTemplateWhereInput = {}

  if (filters.discipline) {
    where.disciplineFamily = filters.discipline
  }
  if (filters.tier) {
    where.aiTier = filters.tier
  }

  return prisma.checkpointTemplate.findMany({
    where,
    orderBy: { sortOrder: 'asc' },
  })
}

// ---------------------------------------------------------------------------
// 4. getTemplateCountsByDiscipline
// ---------------------------------------------------------------------------

export async function getTemplateCountsByDiscipline(): Promise<
  Record<string, number>
> {
  const groups = await prisma.starterPackTemplate.groupBy({
    by: ['disciplineFamily'],
    _count: { _all: true },
  })

  const counts: Record<string, number> = {}
  for (const g of groups) {
    counts[g.disciplineFamily] = g._count._all
  }
  return counts
}

// ---------------------------------------------------------------------------
// 5. getTemplateCountsByTier
// ---------------------------------------------------------------------------

export async function getTemplateCountsByTier(): Promise<
  Record<string, number>
> {
  const groups = await prisma.starterPackTemplate.groupBy({
    by: ['aiTier'],
    _count: { _all: true },
  })

  const counts: Record<string, number> = {}
  for (const g of groups) {
    counts[g.aiTier] = g._count._all
  }
  return counts
}

// ---------------------------------------------------------------------------
// 6. getPopularTemplates — most-adopted templates by CustomPackItem count
// ---------------------------------------------------------------------------

export async function getPopularTemplates(
  limit: number = 10,
): Promise<(StarterPackTemplate & { adoptionCount: number })[]> {
  const templates = await prisma.starterPackTemplate.findMany({
    include: {
      _count: { select: { customPackItems: true } },
    },
    orderBy: {
      customPackItems: { _count: 'desc' },
    },
    take: limit,
  })

  return templates.map((t) => {
    const { _count, ...rest } = t
    return { ...rest, adoptionCount: _count.customPackItems }
  })
}
