import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { withErrorHandling } from '../../../../lib/api-utils'
import { prisma } from '../../../../lib/prisma'
import {
  isAuthFailure,
  parseRequestBody,
  requireRequestUser,
} from '../../../../lib/server-auth'
import { buildToolDeploymentSummary, type ToolDeploymentCourse } from '../../../../lib/tool-deployment'
import { getVisibleToolStorefrontSummary } from '../../../../lib/tool-storefronts'
import { validateBody } from '../../../../lib/validate'

const AssignCourseSchema = z.object({
  courseId: z.string().min(1),
})

function canManageCourse(
  course: { instructorId: string },
  user: { id: string; role: string },
) {
  if (user.role === 'ADMIN') return true
  return user.role === 'EDUCATOR' && course.instructorId === user.id
}

function mapCourse(course: {
  id: string
  courseCode: string
  title: string
  instructor: {
    name: string
  }
}): ToolDeploymentCourse {
  return {
    id: course.id,
    courseCode: course.courseCode,
    title: course.title,
    instructorName: course.instructor.name,
  }
}

async function getDeploymentPayload(toolId: string, user: { id: string; role: string }) {
  const [tool, linkedCourses, manageableCourses, storefront] = await Promise.all([
    prisma.tool.findUnique({
      where: { id: toolId },
      select: {
        id: true,
        creatorId: true,
        published: true,
        deploymentMode: true,
        approvalStatus: true,
        toolType: true,
        externalUrl: true,
        isOfficialService: true,
        requiresInstitutionalReview: true,
        reviewedAt: true,
        reviewExpiresAt: true,
        referenceDocUrls: true,
        _count: {
          select: {
            courseLinks: true,
          },
        },
      },
    }),
    prisma.courseToolLink.findMany({
      where:
        user.role === 'ADMIN'
          ? { toolId }
          : {
              toolId,
              course: {
                instructorId: user.id,
              },
            },
      include: {
        course: {
          select: {
            id: true,
            courseCode: true,
            title: true,
            instructor: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    }),
    user.role === 'ADMIN' || user.role === 'EDUCATOR'
      ? prisma.course.findMany({
          where: user.role === 'ADMIN' ? {} : { instructorId: user.id },
          select: {
            id: true,
            courseCode: true,
            title: true,
            instructor: {
              select: {
                name: true,
              },
            },
          },
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        })
      : Promise.resolve([]),
    getVisibleToolStorefrontSummary(toolId, {
      userId: user.id,
      userRole: user.role,
    }),
  ])

  if (!tool) {
    return {
      response: NextResponse.json({ error: 'Tool not found' }, { status: 404 }),
    }
  }

  const isPrivilegedViewer =
    user.role === 'ADMIN' || tool.creatorId === user.id

  if (!tool.published && !isPrivilegedViewer) {
    return {
      response: NextResponse.json({ error: 'Tool not found' }, { status: 404 }),
    }
  }

  const assignedCourseIds = new Set(linkedCourses.map((link) => link.course.id))
  const availableCourses = manageableCourses
    .filter((course) => !assignedCourseIds.has(course.id))
    .map(mapCourse)

  return {
    payload: {
      deployment: buildToolDeploymentSummary({
        published: tool.published,
        approvalStatus: tool.approvalStatus,
        deploymentMode: tool.deploymentMode,
        toolType: tool.toolType,
        externalUrl: tool.externalUrl,
        isOfficialService: tool.isOfficialService,
        requiresInstitutionalReview: tool.requiresInstitutionalReview,
        reviewedAt: tool.reviewedAt,
        reviewExpiresAt: tool.reviewExpiresAt,
        referenceDocUrls: tool.referenceDocUrls,
        courseLinkCount: tool._count.courseLinks,
        storefrontPlacementCount: storefront.placementCount,
        storefrontDepartmentCount: storefront.departmentCount,
      }),
      visibleAssignedCourses: linkedCourses.map((link) => mapCourse(link.course)),
      availableCourses,
      canAssign:
        (user.role === 'ADMIN' || user.role === 'EDUCATOR') &&
        !['REJECTED', 'SUSPENDED'].includes(tool.approvalStatus),
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
  const result = await getDeploymentPayload(id, auth.user)

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

  const validation = validateBody(AssignCourseSchema, parsed.data)
  if ('error' in validation) return validation.error

  const [tool, course] = await Promise.all([
    prisma.tool.findUnique({
      where: { id },
      select: {
        id: true,
        creatorId: true,
        published: true,
        approvalStatus: true,
      },
    }),
    prisma.course.findUnique({
      where: { id: validation.value.courseId },
      select: {
        id: true,
        instructorId: true,
      },
    }),
  ])

  if (!tool) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
  }

  if (!tool.published && auth.user.role !== 'ADMIN' && tool.creatorId !== auth.user.id) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
  }

  if (['REJECTED', 'SUSPENDED'].includes(tool.approvalStatus)) {
    return NextResponse.json(
      { error: 'This tool cannot be assigned to a course' },
      { status: 409 },
    )
  }

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  if (!canManageCourse(course, auth.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await prisma.courseToolLink.create({
      data: {
        courseId: course.id,
        toolId: tool.id,
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Tool is already assigned to that course' },
      { status: 409 },
    )
  }

  const result = await getDeploymentPayload(id, auth.user)
  if ('response' in result) return result.response

  return NextResponse.json(result.payload, { status: 201 })
})
