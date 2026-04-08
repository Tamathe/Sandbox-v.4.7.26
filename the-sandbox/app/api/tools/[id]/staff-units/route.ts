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
  getStaffUnitInstallEligibility,
  getVisibleToolStaffUnitSummary,
  isStaffUnitDepartment,
  listAvailableStaffUnitCollectionsForUser,
} from '../../../../lib/tool-staff-units'
import { validateBody } from '../../../../lib/validate'

const InstallStaffUnitSchema = z.object({
  collectionId: z.string().min(1),
})

async function getStaffUnitPayload(
  toolId: string,
  user: { id: string; role: string },
) {
  const [tool, staffUnits, manageableCollections] = await Promise.all([
    prisma.tool.findUnique({
      where: { id: toolId },
      select: {
        id: true,
        creatorId: true,
        published: true,
        approvalStatus: true,
      },
    }),
    getVisibleToolStaffUnitSummary(toolId, {
      userId: user.id,
      userRole: user.role,
    }),
    listAvailableStaffUnitCollectionsForUser(user),
  ])

  if (!tool) {
    return {
      response: NextResponse.json({ error: 'Tool not found' }, { status: 404 }),
    }
  }

  const isPrivilegedViewer =
    user.role === 'ADMIN' || tool.creatorId === user.id

  if (!tool.published && !isPrivilegedViewer && staffUnits.departmentCount === 0) {
    return {
      response: NextResponse.json({ error: 'Tool not found' }, { status: 404 }),
    }
  }

  const assignedCollectionIds = new Set(
    staffUnits.placements.map((placement) => placement.collectionId),
  )
  const availableCollections = manageableCollections.filter(
    (collection) => !assignedCollectionIds.has(collection.collectionId),
  )

  const installEligibility = getStaffUnitInstallEligibility(tool)
  const installHint =
    installEligibility.canInstall
      ? manageableCollections.length === 0
        ? 'You do not manage any staff unit collections yet.'
        : availableCollections.length === 0
          ? 'This tool is already installed in every staff unit collection you can manage.'
          : null
      : installEligibility.reason

  return {
    payload: {
      staffUnits,
      visiblePlacements: staffUnits.placements,
      availableCollections,
      canInstall: installEligibility.canInstall,
      installHint,
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
  const result = await getStaffUnitPayload(id, auth.user)
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

  const validation = validateBody(InstallStaffUnitSchema, parsed.data)
  if ('error' in validation) return validation.error

  const [tool, collection] = await Promise.all([
    prisma.tool.findUnique({
      where: { id },
      select: {
        id: true,
        creatorId: true,
        published: true,
        approvalStatus: true,
      },
    }),
    prisma.toolCollection.findUnique({
      where: { id: validation.value.collectionId },
      select: {
        id: true,
        departmentId: true,
        department: {
          select: {
            categoryTags: true,
          },
        },
      },
    }),
  ])

  if (!tool) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
  }

  if (!tool.published && auth.user.role !== 'ADMIN' && tool.creatorId !== auth.user.id) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
  }

  const installEligibility = getStaffUnitInstallEligibility(tool)
  if (!installEligibility.canInstall) {
    return NextResponse.json(
      { error: installEligibility.reason },
      { status: 409 },
    )
  }

  if (!collection?.departmentId || !isStaffUnitDepartment(collection.department?.categoryTags)) {
    return NextResponse.json(
      { error: 'Staff unit collection not found' },
      { status: 404 },
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
      return NextResponse.json({ error: 'Staff unit editor access required' }, { status: 403 })
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
      { error: 'Tool is already installed in that staff unit collection' },
      { status: 409 },
    )
  }

  const result = await getStaffUnitPayload(id, auth.user)
  if ('response' in result) return result.response

  return NextResponse.json(result.payload, { status: 201 })
})
