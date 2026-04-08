import { prisma } from './prisma'
import type { Prisma } from '../generated/prisma'

/**
 * Returns an ordered list of ToolCollections personalized for a user.
 *
 * Order:
 *  (a) collections from departments where the user is a member (by dept displayOrder)
 *  (b) collections from departments the user follows
 *  (c) collections from featured departments (featured=true)
 *  (d) platform collections (departmentId=null)
 *
 * If userCollege matches a department name or shortName, that dept's collections
 * are boosted to the top.
 *
 * Deduplicates across groups.
 */

const TOOL_SELECT = {
  id: true,
  name: true,
  shortDescription: true,
  category: true,
  toolType: true,
  thumbnailUrl: true,
  approvalStatus: true,
} satisfies Prisma.ToolSelect

const COLLECTION_INCLUDE = {
  tools: {
    orderBy: [
      { pinned: 'desc' as Prisma.SortOrder },
      { displayOrder: 'asc' as Prisma.SortOrder },
    ],
    include: {
      tool: { select: TOOL_SELECT },
    },
  },
  department: {
    select: { id: true, name: true, shortName: true, slug: true },
  },
} satisfies Prisma.ToolCollectionInclude

export async function getPersonalizedCollections(
  userId: string,
  userRole: string,
  userCollege?: string | null,
) {
  // (a) collections from departments the user is a member of
  const memberCollections = await prisma.toolCollection.findMany({
    where: { department: { members: { some: { userId } } } },
    orderBy: [{ department: { displayOrder: 'asc' } }, { displayOrder: 'asc' }],
    include: COLLECTION_INCLUDE,
  })

  // (b) collections from departments the user follows
  const followedCollections = await prisma.toolCollection.findMany({
    where: { department: { followers: { some: { userId } } } },
    orderBy: [{ department: { displayOrder: 'asc' } }, { displayOrder: 'asc' }],
    include: COLLECTION_INCLUDE,
  })

  // (c) collections from featured departments
  const featuredCollections = await prisma.toolCollection.findMany({
    where: { department: { featured: true, visibility: 'PUBLIC' } },
    orderBy: [{ department: { displayOrder: 'asc' } }, { displayOrder: 'asc' }],
    include: COLLECTION_INCLUDE,
  })

  // (d) platform collections (departmentId=null)
  const platformCollections = await prisma.toolCollection.findMany({
    where: { departmentId: null },
    orderBy: { displayOrder: 'asc' },
    include: COLLECTION_INCLUDE,
  })

  // Deduplicate across groups
  type CollectionRow = typeof memberCollections[number]
  const seen = new Set<string>()
  const result: CollectionRow[] = []

  function addGroup(collections: CollectionRow[]) {
    for (const c of collections) {
      if (!seen.has(c.id)) {
        seen.add(c.id)
        result.push(c)
      }
    }
  }

  // College boost: if userCollege matches a department, move its collections first
  if (userCollege) {
    const collegeLower = userCollege.toLowerCase()
    const collegeCollections = [
      ...memberCollections,
      ...followedCollections,
      ...featuredCollections,
    ].filter(c =>
      c.department &&
      (c.department.name.toLowerCase().includes(collegeLower) ||
       c.department.shortName.toLowerCase() === collegeLower)
    )
    addGroup(collegeCollections)
  }

  addGroup(memberCollections)
  addGroup(followedCollections)
  addGroup(featuredCollections)
  addGroup(platformCollections)

  return result
}
