/**
 * GET /api/courses/[id]/syllabus-status
 *
 * Returns the syllabus import status for a course: parse job info,
 * CourseMap existence, validation status, and entity counts.
 *
 * Auth: requireCourseOwner OR enrolled student.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, requireCourseOwner, isAuthFailure } from '../../../../lib/server-auth'
import { prisma } from '../../../../lib/prisma'
import { validateCourseMap } from '../../../../lib/syllabus-architect/validator'
import { withErrorHandling } from '../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params

  // Auth: course owner OR enrolled student
  const ownerAuth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(ownerAuth)) {
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

  // Parallel queries for all status fields
  const [latestJob, courseMap, assignmentCount, objectiveCount] = await Promise.all([
    prisma.syllabusParseJob.findFirst({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, createdAt: true },
    }),
    prisma.courseMap.findUnique({
      where: { courseId },
      select: {
        id: true,
        _count: {
          select: {
            units: true,
            nodes: true,
            edges: true,
          },
        },
      },
    }),
    prisma.assignment.count({ where: { courseId } }),
    prisma.learningObjective.count({ where: { courseId } }),
  ])

  // Only run full validation when explicitly requested via ?validate=true
  // Otherwise return null (validation was already run at apply time)
  const url = new URL(req.url)
  let validationStatus: string | null = null
  if (courseMap && url.searchParams.get('validate') === 'true') {
    const report = await validateCourseMap(courseMap.id)
    validationStatus = report.status
  }

  return NextResponse.json({
    hasParseJob: !!latestJob,
    hasCourseMap: !!courseMap,
    parseJobStatus: latestJob?.status ?? null,
    validationStatus,
    lastParseDate: latestJob?.createdAt ?? null,
    unitCount: courseMap?._count.units ?? null,
    nodeCount: courseMap?._count.nodes ?? null,
    edgeCount: courseMap?._count.edges ?? null,
    assignmentCount,
    objectiveCount,
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
