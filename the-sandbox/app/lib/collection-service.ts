import { prisma } from './prisma'
import type { CollectionVisibility } from '../generated/prisma'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CreateCollectionInput {
  name: string
  slug: string
  description?: string
  icon?: string
  gradient?: string
  emoji?: string
  visibility?: CollectionVisibility
  displayOrder?: number
  pinned?: boolean
}

interface UpdateCollectionInput {
  name?: string
  slug?: string
  description?: string | null
  icon?: string | null
  gradient?: string | null
  emoji?: string | null
  visibility?: CollectionVisibility
  displayOrder?: number
  pinned?: boolean
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function createCollection(departmentId: string, data: CreateCollectionInput) {
  return prisma.toolCollection.create({
    data: { ...data, departmentId },
    include: { _count: { select: { tools: true } } },
  })
}

export async function updateCollection(id: string, data: UpdateCollectionInput) {
  const collection = await prisma.toolCollection.update({
    where: { id },
    data,
    include: {
      _count: { select: { tools: true } },
      department: { select: { id: true, shortName: true, slug: true } },
    },
  })

  // Notify department followers (non-blocking, best-effort)
  if (collection.department) {
    import('./department-service').then(({ notifyDepartmentFollowers }) =>
      notifyDepartmentFollowers(
        collection.department!.id,
        'DEPARTMENT_COLLECTION_UPDATED',
        `${collection.department!.shortName} updated`,
        `The "${collection.name}" collection was updated`,
        `/hub/s/${collection.department!.slug}`,
      )
    ).catch(() => {})
  }

  return collection
}

export async function deleteCollection(id: string) {
  return prisma.toolCollection.delete({ where: { id } })
}

export async function getCollection(departmentId: string, slug: string) {
  return prisma.toolCollection.findUnique({
    where: { departmentId_slug: { departmentId, slug } },
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
  })
}

export async function listCollections(departmentId: string) {
  return prisma.toolCollection.findMany({
    where: { departmentId },
    orderBy: [{ pinned: 'desc' }, { displayOrder: 'asc' }],
    include: { _count: { select: { tools: true } } },
  })
}

// ─── Collection Tools ────────────────────────────────────────────────────────

export async function addToolToCollection(collectionId: string, toolId: string) {
  const maxOrder = await prisma.collectionTool.aggregate({
    where: { collectionId },
    _max: { displayOrder: true },
  })

  const entry = await prisma.collectionTool.create({
    data: {
      collectionId,
      toolId,
      displayOrder: (maxOrder._max.displayOrder ?? -1) + 1,
    },
    include: {
      tool: {
        select: { id: true, name: true, shortDescription: true, category: true, toolType: true },
      },
      collection: {
        select: {
          name: true,
          departmentId: true,
          department: { select: { shortName: true, slug: true } },
        },
      },
    },
  })

  // Notify department followers (non-blocking, best-effort)
  if (entry.collection.departmentId && entry.collection.department) {
    import('./department-service').then(({ notifyDepartmentFollowers }) =>
      notifyDepartmentFollowers(
        entry.collection.departmentId!,
        'DEPARTMENT_TOOL_ADDED',
        `New tool in ${entry.collection.department!.shortName}`,
        `${entry.tool.name} was added to ${entry.collection.name}`,
        `/hub/s/${entry.collection.department!.slug}`,
      )
    ).catch(() => {})
  }

  return entry
}

export async function removeToolFromCollection(collectionId: string, toolId: string) {
  return prisma.collectionTool.delete({
    where: { collectionId_toolId: { collectionId, toolId } },
  })
}

export async function reorderTools(collectionId: string, toolIds: string[]) {
  const updates = toolIds.map((toolId, index) =>
    prisma.collectionTool.update({
      where: { collectionId_toolId: { collectionId, toolId } },
      data: { displayOrder: index },
    })
  )
  return prisma.$transaction(updates)
}

export async function toggleToolPinned(collectionId: string, toolId: string) {
  const entry = await prisma.collectionTool.findUnique({
    where: { collectionId_toolId: { collectionId, toolId } },
    select: { pinned: true },
  })
  if (!entry) throw new Error('Collection tool not found')
  return prisma.collectionTool.update({
    where: { collectionId_toolId: { collectionId, toolId } },
    data: { pinned: !entry.pinned },
  })
}

export async function listCollectionTools(collectionId: string) {
  return prisma.collectionTool.findMany({
    where: { collectionId },
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
  })
}
