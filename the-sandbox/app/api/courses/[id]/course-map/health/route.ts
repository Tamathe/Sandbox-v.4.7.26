/**
 * POST /api/courses/[id]/course-map/health
 *
 * Computes an AI-powered health score for the course map based on
 * coverage, connectivity, sequencing, completeness, and balance.
 *
 * Auth: requireCourseOwner
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure } from '../../../../../lib/server-auth'
import { computeCourseMapHealth } from '../../../../../lib/syllabus-architect/health-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const health = await computeCourseMapHealth(courseId)

  return NextResponse.json(health)
})
