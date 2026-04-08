import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { withErrorHandling } from '../../../../lib/api-utils'
import { prisma } from '../../../../lib/prisma'
import {
  isAuthFailure,
  parseRequestBody,
  requireRequestUser,
} from '../../../../lib/server-auth'
import {
  getStorefrontShareEligibility,
  getVisibleToolStorefrontSummary,
  listAvailableStorefrontCollectionsForUser,
} from '../../../../lib/tool-storefronts'
import { validateBody } from '../../../../lib/validate'

const ShareStorefrontSchema = z.object({
  collectionId: z.string().min(1),
})

async function getStorefrontPayload(
  toolId: string,
  user: { id: string; role: string },
) {
  const [tool, storefront, availableCollections] = await Promise.all([
    prisma.tool.findUnique({
      where: { id: toolId },
      select: {
        id: true,
        creatorId: true,
        published: true,
        approvalStatus: true,
      },
    }),
    getVisibleToolStorefrontSummary(toolId, {
      userId: user.id,
      userRole: user.role,
    }),
    listAvailableStorefrontCollectionsForUser(user),
  ])

  if (!tool) {
    return {
      response: NextResponse.json({ error: 'Tool not found' }, { status: 404 }),
    }
  }

  const isPrivilegedViewer =
    user.role === 'ADMIN' || tool.creatorId === user.id

  if (!tool.published && !isPrivilegedViewer && storefront.departmentCount === 0) {
    return {
      response: NextResponse.json({ error: 'Tool not found' }, { status: 404 }),
    }
  }

  const assignedCollectionIds = new Set(
    storefront.placements.map((placement) => placement.collectionId),
  )
  const shareableCollections = availableCollections.filter(
    (collection) => !assignedCollectionIds.has(collection.collectionId),
  )

  const shareEligibility = getStorefrontShareEligibility(tool)
  const shareHint =
    shareEligibility.canShare
      ? availableCollections.length === 0
        ? 'You do not manage any department storefront collections yet.'
        : shareableCollections.length === 0
          ? 'This tool is already shared to every storefront collection you can manage.'
          : null
      : shareEligibility.reason

  return {
    payload: {
      storefront,
      visiblePlacements: storefront.placements,
      availableCollections: shareableCollections,
      canShare: shareEligibility.canShare,
      shareHint,
    },
  }
}

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const result = await getStorefrontPayload(id, auth.user)
  if ('response' in result) return result.response

  return NextResponse.json(result.payload, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error

  const validation = validateBody(ShareStorefrontSchema, parsed.data)
  if ('error' in validation) return validation.error

  const [tool, collection] = await Promise.all([
    prisma.tool.findUnique({
      where: { id },
      select: {
        id: true,
        approvalStatus: true,
      },
    }),
    prisma.toolCollection.findUnique({
      where: { id: validation.value.collectionId },
      select: {
        id: true,
        visibility: true,
        departmentId: true,
      },
    }),
  ])

  if (!tool) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
  }

  const shareEligibility = getStorefrontShareEligibility(tool)
  if (!shareEligibility.canShare) {
    return NextResponse.json(
      { error: shareEligibility.reason },
      { status: 409 },
    )
  }

  if (!collection?.departmentId) {
    return NextResponse.json({ error: 'Storefront collection not found' }, { status: 404 })
  }

  if (collection.visibility === 'HIDDEN') {
    return NextResponse.json(
      { error: 'Hidden draft collections are not available for template sharing yet.' },
      { status: 409 },
    )
  }

  if (auth.user.role !== 'ADMIN') {
    const membership = await prisma.departmentMember.findUnique({
      where: {
        departmentId_userId: {
          departmentId: collection.departmentId,
          userId: auth.user.id,
        },
      },
      select: { role: true },
    })

    if (!membership || membership.role === 'VIEWER') {
      return NextResponse.json({ error: 'Department editor access required' }, { status: 403 })
    }
  }

  try {
    await prisma.collectionTool.create({
      data: {
        collectionId: collection.id,
        toolId: tool.id,
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Tool is already shared to that storefront collection' },
      { status: 409 },
    )
  }

  const result = await getStorefrontPayload(id, auth.user)
  if ('response' in result) return result.response

  return NextResponse.json(result.payload, { status: 201 })
})
