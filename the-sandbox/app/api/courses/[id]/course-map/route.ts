/**
 * GET /api/courses/[id]/course-map
 *
 * Returns:
 * - Week-based course map (legacy: courseMap, version)
 * - Graph-based CourseMap from the Syllabus Architect pipeline (graphMap)
 *   with nested units (modules, lessons), nodes, edges
 * - ValidationReport from validateCourseMap()
 *
 * Auth: requireCourseOwner (educator/admin) OR enrolled student.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, requireCourseOwner, isAuthFailure } from '../../../../lib/server-auth'
import { getCourseMap, getCourseMapVersion } from '../../../../lib/course-map-service'
import { prisma } from '../../../../lib/prisma'
import { validateCourseMap } from '../../../../lib/syllabus-architect/validator'
import { withErrorHandling } from '../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params

  // Auth: course owner OR enrolled student
  const ownerAuth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(ownerAuth)) {
    // Not the owner — check if enrolled student
    const userAuth = await requireRequestUser(req)
    if (isAuthFailure(userAuth)) return userAuth.response

    const enrollment = await prisma.courseEnrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: userAuth.user.id,
          courseId,
        },
      },
    })
    if (!enrollment) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Fetch week-based map (legacy) + version
  const [courseMap, version] = await Promise.all([
    getCourseMap(courseId),
    getCourseMapVersion(courseId),
  ])

  // Fetch graph-based CourseMap from Syllabus Architect schema
  const graphMap = await prisma.courseMap.findUnique({
    where: { courseId },
    include: {
      units: {
        include: {
          modules: {
            include: { lessons: true },
          },
        },
        orderBy: { position: 'asc' },
      },
      nodes: true,
      edges: true,
    },
  })

  // Run validation if graph map exists
  let validation = null
  if (graphMap) {
    validation = await validateCourseMap(graphMap.id)
  }

  return NextResponse.json({ courseMap, version, graphMap, validation }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
