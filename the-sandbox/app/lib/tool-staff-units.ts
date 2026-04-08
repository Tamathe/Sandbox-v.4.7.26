import type {
  CollectionVisibility,
  DepartmentMemberRole,
  DepartmentVisibility,
} from '../generated/prisma'

import { prisma } from './prisma'

const STAFF_UNIT_CATEGORY_TAGS = ['Administrative', 'Student Services'] as const

export type ResolvedStaffUnitVisibility =
  | 'PUBLIC'
  | 'INTERNAL'
  | 'ROLE_RESTRICTED'
  | 'HIDDEN'

export interface ToolStaffUnitPlacement {
  collectionId: string
  collectionName: string
  collectionSlug: string
  collectionVisibility: CollectionVisibility
  visibility: ResolvedStaffUnitVisibility
  departmentId: string
  departmentName: string
  departmentShortName: string
  departmentSlug: string
  categoryTags: string[]
}

export interface ToolStaffUnitSummary {
  placementCount: number
  departmentCount: number
  placements: ToolStaffUnitPlacement[]
}

export interface ToolStaffUnitCollectionOption {
  collectionId: string
  collectionName: string
  collectionSlug: string
  visibility: ResolvedStaffUnitVisibility
  departmentId: string
  departmentName: string
  departmentShortName: string
  departmentSlug: string
  categoryTags: string[]
}

export interface ToolStaffUnitResponse {
  staffUnits: ToolStaffUnitSummary
  visiblePlacements: ToolStaffUnitPlacement[]
  availableCollections: ToolStaffUnitCollectionOption[]
  canInstall: boolean
  installHint: string | null
}

interface ViewerContext {
  userId: string | null
  userRole: string | null
}

interface ManageableUser {
  id: string
  role: string
}

type MembershipRole = DepartmentMemberRole | null

const EMPTY_SUMMARY: ToolStaffUnitSummary = {
  placementCount: 0,
  departmentCount: 0,
  placements: [],
}

export function isStaffUnitDepartment(categoryTags: string[] | null | undefined) {
  return (categoryTags ?? []).some((tag) =>
    STAFF_UNIT_CATEGORY_TAGS.includes(tag as (typeof STAFF_UNIT_CATEGORY_TAGS)[number]),
  )
}

function resolveStaffUnitVisibility(
  collectionVisibility: CollectionVisibility,
  departmentVisibility: DepartmentVisibility,
): ResolvedStaffUnitVisibility {
  if (collectionVisibility === 'INHERIT') {
    return departmentVisibility
  }

  return collectionVisibility
}

function canViewPlacement(
  visibility: ResolvedStaffUnitVisibility,
  viewer: ViewerContext,
  membershipRole: MembershipRole,
) {
  if (viewer.userRole === 'ADMIN') return true

  switch (visibility) {
    case 'PUBLIC':
      return true
    case 'INTERNAL':
      return Boolean(viewer.userId)
    case 'ROLE_RESTRICTED':
      return membershipRole !== null
    case 'HIDDEN':
      return membershipRole === 'OWNER' || membershipRole === 'EDITOR'
    default:
      return false
  }
}

function buildSummary(placements: ToolStaffUnitPlacement[]): ToolStaffUnitSummary {
  if (placements.length === 0) {
    return EMPTY_SUMMARY
  }

  const sortedPlacements = [...placements].sort((left, right) => {
    const departmentComparison = left.departmentShortName.localeCompare(right.departmentShortName)
    if (departmentComparison !== 0) return departmentComparison
    return left.collectionName.localeCompare(right.collectionName)
  })

  return {
    placementCount: sortedPlacements.length,
    departmentCount: new Set(sortedPlacements.map((placement) => placement.departmentId)).size,
    placements: sortedPlacements,
  }
}

export function createEmptyToolStaffUnitSummary(): ToolStaffUnitSummary {
  return {
    placementCount: 0,
    departmentCount: 0,
    placements: [],
  }
}

export function getStaffUnitInstallEligibility(tool: {
  approvalStatus: string
}) {
  if (tool.approvalStatus === 'REJECTED' || tool.approvalStatus === 'SUSPENDED') {
    return {
      canInstall: false,
      reason: 'This tool cannot be assigned to a staff unit.',
    }
  }

  return {
    canInstall: true,
    reason: null,
  }
}

export async function getVisibleToolStaffUnitSummary(
  toolId: string,
  viewer: ViewerContext,
) {
  const entries = await prisma.collectionTool.findMany({
    where: {
      toolId,
      collection: {
        department: {
          categoryTags: { hasSome: [...STAFF_UNIT_CATEGORY_TAGS] },
        },
      },
    },
    select: {
      collection: {
        select: {
          id: true,
          name: true,
          slug: true,
          visibility: true,
          department: {
            select: {
              id: true,
              name: true,
              shortName: true,
              slug: true,
              visibility: true,
              categoryTags: true,
              ...(viewer.userId
                ? {
                    members: {
                      where: { userId: viewer.userId },
                      select: { role: true },
                      take: 1,
                    },
                  }
                : {}),
            },
          },
        },
      },
    },
  })

  const placements: ToolStaffUnitPlacement[] = []

  for (const entry of entries) {
    const department = entry.collection.department
    if (!department || !isStaffUnitDepartment(department.categoryTags)) continue

    const membershipRole =
      'members' in department && Array.isArray(department.members)
        ? ((department.members[0]?.role ?? null) as MembershipRole)
        : null

    const visibility = resolveStaffUnitVisibility(
      entry.collection.visibility,
      department.visibility,
    )

    if (!canViewPlacement(visibility, viewer, membershipRole)) {
      continue
    }

    placements.push({
      collectionId: entry.collection.id,
      collectionName: entry.collection.name,
      collectionSlug: entry.collection.slug,
      collectionVisibility: entry.collection.visibility,
      visibility,
      departmentId: department.id,
      departmentName: department.name,
      departmentShortName: department.shortName,
      departmentSlug: department.slug,
      categoryTags: department.categoryTags,
    })
  }

  return buildSummary(placements)
}

export async function listAvailableStaffUnitCollectionsForUser(
  user: ManageableUser,
) {
  const collections = await prisma.toolCollection.findMany({
    where:
      user.role === 'ADMIN'
        ? {
            department: {
              categoryTags: { hasSome: [...STAFF_UNIT_CATEGORY_TAGS] },
            },
          }
        : {
            department: {
              categoryTags: { hasSome: [...STAFF_UNIT_CATEGORY_TAGS] },
              members: {
                some: {
                  userId: user.id,
                  role: { in: ['OWNER', 'EDITOR'] },
                },
              },
            },
          },
    select: {
      id: true,
      name: true,
      slug: true,
      visibility: true,
      department: {
        select: {
          id: true,
          name: true,
          shortName: true,
          slug: true,
          visibility: true,
          categoryTags: true,
        },
      },
    },
  })

  return collections
    .filter((collection) => collection.department && isStaffUnitDepartment(collection.department.categoryTags))
    .map((collection) => ({
      collectionId: collection.id,
      collectionName: collection.name,
      collectionSlug: collection.slug,
      visibility: resolveStaffUnitVisibility(
        collection.visibility,
        collection.department!.visibility,
      ),
      departmentId: collection.department!.id,
      departmentName: collection.department!.name,
      departmentShortName: collection.department!.shortName,
      departmentSlug: collection.department!.slug,
      categoryTags: collection.department!.categoryTags,
    }))
    .sort((left, right) => {
      const departmentComparison = left.departmentShortName.localeCompare(right.departmentShortName)
      if (departmentComparison !== 0) return departmentComparison
      return left.collectionName.localeCompare(right.collectionName)
    })
}
