import { prisma } from './prisma'

const VALID_ENTITY_TYPES = ['document', 'incident', 'requirement', 'dpa', 'training-module', 'exception'] as const
type EntityType = (typeof VALID_ENTITY_TYPES)[number]

export function isValidEntityType(t: string): t is EntityType {
  return VALID_ENTITY_TYPES.includes(t as EntityType)
}

/**
 * Create a new compliance tag.
 */
export async function createTag(opts: { name: string; color?: string; description?: string }) {
  return prisma.complianceTag.create({
    data: {
      name: opts.name,
      color: opts.color ?? '#0033A0',
      description: opts.description ?? null,
    },
  })
}

/**
 * List all tags ordered by usage count desc.
 */
export async function listTags() {
  return prisma.complianceTag.findMany({
    orderBy: { usageCount: 'desc' },
    include: { _count: { select: { assignments: true } } },
  })
}

/**
 * Delete a tag by id (cascade deletes assignments via schema).
 */
export async function deleteTag(id: string) {
  return prisma.complianceTag.delete({ where: { id } })
}

/**
 * Assign a tag to an entity (creates assignment + increments usageCount).
 */
export async function assignTag(opts: { tagId: string; entityType: string; entityId: string; assignedBy: string }) {
  if (!isValidEntityType(opts.entityType)) {
    throw new Error(`Invalid entity type: ${opts.entityType}`)
  }

  const [assignment] = await prisma.$transaction([
    prisma.complianceTagAssignment.create({
      data: {
        tagId: opts.tagId,
        entityType: opts.entityType,
        entityId: opts.entityId,
        assignedBy: opts.assignedBy,
      },
    }),
    prisma.complianceTag.update({
      where: { id: opts.tagId },
      data: { usageCount: { increment: 1 } },
    }),
  ])

  return assignment
}

/**
 * Remove a tag assignment and decrement usageCount.
 */
export async function removeTagAssignment(opts: { tagId: string; entityType: string; entityId: string }) {
  const assignment = await prisma.complianceTagAssignment.findUnique({
    where: {
      tagId_entityType_entityId: {
        tagId: opts.tagId,
        entityType: opts.entityType,
        entityId: opts.entityId,
      },
    },
  })

  if (!assignment) throw new Error('Tag assignment not found')

  await prisma.$transaction([
    prisma.complianceTagAssignment.delete({ where: { id: assignment.id } }),
    prisma.complianceTag.update({
      where: { id: opts.tagId },
      data: { usageCount: { decrement: 1 } },
    }),
  ])

  return { success: true }
}

/**
 * Get all tags for a specific entity.
 */
export async function getTagsForEntity(entityType: string, entityId: string) {
  const assignments = await prisma.complianceTagAssignment.findMany({
    where: { entityType, entityId },
    include: { tag: true },
  })
  return assignments.map((a) => a.tag)
}

/**
 * Get all entities for a specific tag.
 */
export async function getEntitiesForTag(tagId: string) {
  return prisma.complianceTagAssignment.findMany({
    where: { tagId },
    select: { entityType: true, entityId: true, assignedAt: true },
  })
}

/**
 * Get top 10 tags by usage count.
 */
export async function getPopularTags() {
  return prisma.complianceTag.findMany({
    orderBy: { usageCount: 'desc' },
    take: 10,
  })
}
