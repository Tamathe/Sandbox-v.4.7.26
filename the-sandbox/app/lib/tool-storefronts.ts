import type {
  CollectionVisibility,
  DepartmentMemberRole,
  DepartmentVisibility,
} from '../generated/prisma'

import { prisma } from './prisma'

export type ResolvedStorefrontVisibility =
  | 'PUBLIC'
  | 'INTERNAL'
  | 'ROLE_RESTRICTED'
  | 'HIDDEN'

export interface ToolStorefrontPlacement {
  collectionId: string
  collectionName: string
  collectionSlug: string
  collectionVisibility: CollectionVisibility
  visibility: ResolvedStorefrontVisibility
  departmentId: string
  departmentName: string
  departmentShortName: string
  departmentSlug: string
}

export interface ToolStorefrontSummary {
  placementCount: number
  departmentCount: number
  placements: ToolStorefrontPlacement[]
}

export interface ToolStorefrontCollectionOption {
  collectionId: string
  collectionName: string
  collectionSlug: string
  visibility: ResolvedStorefrontVisibility
  departmentId: string
  departmentName: string
  departmentShortName: string
  departmentSlug: string
}

export interface ToolStorefrontResponse {
  storefront: ToolStorefrontSummary
  visiblePlacements: ToolStorefrontPlacement[]
  availableCollections: ToolStorefrontCollectionOption[]
  canShare: boolean
  shareHint: string | null
}

interface ViewerContext {
  userId: string | null
  userRole: string | null
}

interface ShareableUser {
  id: string
  role: string
}

type MembershipRole = DepartmentMemberRole | null

const EMPTY_SUMMARY: ToolStorefrontSummary = {
  placementCount: 0,
  departmentCount: 0,
  placements: [],
}

function resolveStorefrontVisibility(
  collectionVisibility: CollectionVisibility,
  departmentVisibility: DepartmentVisibility,
): ResolvedStorefrontVisibility {
  if (collectionVisibility === 'INHERIT') {
    return departmentVisibility
  }

  return collectionVisibility
}

function canViewPlacement(
  visibility: ResolvedStorefrontVisibility,
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

function buildSummary(placements: ToolStorefrontPlacement[]): ToolStorefrontSummary {
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

export function createEmptyToolStorefrontSummary(): ToolStorefrontSummary {
  return {
    placementCount: 0,
    departmentCount: 0,
    placements: [],
  }
}

export function getStorefrontShareEligibility(tool: {
  approvalStatus: string
}) {
  if (tool.approvalStatus === 'APPROVED') {
    return {
      canShare: true,
      reason: null,
    }
  }

  if (tool.approvalStatus === 'REJECTED' || tool.approvalStatus === 'SUSPENDED') {
    return {
      canShare: false,
      reason: 'This tool is not eligible for department storefront sharing.',
    }
  }

  return {
    canShare: false,
    reason: 'Only approved tools can be shared into department storefronts.',
  }
}

export async function getVisibleToolStorefrontSummaryMap(
  toolIds: string[],
  viewer: ViewerContext,
) {
  if (toolIds.length === 0) {
    return new Map<string, ToolStorefrontSummary>()
  }

  const rawEntries = await prisma.collectionTool.findMany({
    where: {
      toolId: { in: toolIds },
      collection: {
        departmentId: { not: null },
      },
    },
    select: {
      toolId: true,
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

  const placementsByTool = new Map<string, ToolStorefrontPlacement[]>()

  for (const entry of rawEntries) {
    const department = entry.collection.department
    if (!department) continue

    const membershipRole =
      'members' in department && Array.isArray(department.members)
        ? ((department.members[0]?.role ?? null) as MembershipRole)
        : null
    const visibility = resolveStorefrontVisibility(
      entry.collection.visibility,
      department.visibility,
    )

    if (!canViewPlacement(visibility, viewer, membershipRole)) {
      continue
    }

    const placement: ToolStorefrontPlacement = {
      collectionId: entry.collection.id,
      collectionName: entry.collection.name,
      collectionSlug: entry.collection.slug,
      collectionVisibility: entry.collection.visibility,
      visibility,
      departmentId: department.id,
      departmentName: department.name,
      departmentShortName: department.shortName,
      departmentSlug: department.slug,
    }

    const currentPlacements = placementsByTool.get(entry.toolId) ?? []
    currentPlacements.push(placement)
    placementsByTool.set(entry.toolId, currentPlacements)
  }

  return new Map(
    toolIds.map((toolId) => [
      toolId,
      buildSummary(placementsByTool.get(toolId) ?? []),
    ]),
  )
}

export async function getVisibleToolStorefrontSummary(
  toolId: string,
  viewer: ViewerContext,
) {
  const summaryMap = await getVisibleToolStorefrontSummaryMap([toolId], viewer)
  return summaryMap.get(toolId) ?? EMPTY_SUMMARY
}

export async function listAvailableStorefrontCollectionsForUser(
  user: ShareableUser,
) {
  const collections = await prisma.toolCollection.findMany({
    where:
      user.role === 'ADMIN'
        ? {
            departmentId: { not: null },
            visibility: { not: 'HIDDEN' },
          }
        : {
            departmentId: { not: null },
            visibility: { not: 'HIDDEN' },
            department: {
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
        },
      },
    },
  })

  return collections
    .filter((collection) => collection.department)
    .map((collection) => ({
      collectionId: collection.id,
      collectionName: collection.name,
      collectionSlug: collection.slug,
      visibility: resolveStorefrontVisibility(
        collection.visibility,
        collection.department!.visibility,
      ),
      departmentId: collection.department!.id,
      departmentName: collection.department!.name,
      departmentShortName: collection.department!.shortName,
      departmentSlug: collection.department!.slug,
    }))
    .sort((left, right) => {
      const departmentComparison = left.departmentShortName.localeCompare(right.departmentShortName)
      if (departmentComparison !== 0) return departmentComparison
      return left.collectionName.localeCompare(right.collectionName)
    })
}
