import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import {
  defineMilestone,
  removeMilestone,
  getMilestones,
  checkMilestoneCompletion,
} from '../../../../../lib/syllabus-architect/milestone-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

/**
 * GET /api/courses/[id]/course-map/milestones
 *
 * Get all milestones with optional student completion status.
 * Query: ?check=true to also run completion check.
 * Auth: any authenticated user.
 */
export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth
  const url = new URL(req.url)
  const check = url.searchParams.get('check')

  const studentId = user.role === 'STUDENT' ? user.id : undefined
  const summary = await getMilestones(courseId, studentId)

  // Optionally check for newly achieved milestones
  let newlyAchieved: Awaited<ReturnType<typeof checkMilestoneCompletion>> = []
  if (check === 'true' && user.role === 'STUDENT') {
    newlyAchieved = await checkMilestoneCompletion(courseId, user.id)
  }

  return NextResponse.json({ ...summary, newlyAchieved })
})

/**
 * POST /api/courses/[id]/course-map/milestones
 *
 * Create or update a milestone on a node.
 * Body: { nodeId, label, description? }
 * Auth: course owner.
 */
export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { nodeId, label, description } = parsed.data as { nodeId?: string; label?: string; description?: string }

  if (!nodeId || !label?.trim()) {
    return NextResponse.json({ error: 'nodeId and label are required' }, { status: 400 })
  }

  const milestone = await defineMilestone(courseId, nodeId, label.trim(), description)
  return NextResponse.json({ milestone }, { status: 201 })
})

/**
 * DELETE /api/courses/[id]/course-map/milestones
 *
 * Remove a milestone from a node.
 * Body: { nodeId }
 * Auth: course owner.
 */
export const DELETE = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { nodeId } = parsed.data as { nodeId?: string }

  if (!nodeId) {
    return NextResponse.json({ error: 'nodeId is required' }, { status: 400 })
  }

  await removeMilestone(courseId, nodeId)
  return NextResponse.json({ ok: true }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
