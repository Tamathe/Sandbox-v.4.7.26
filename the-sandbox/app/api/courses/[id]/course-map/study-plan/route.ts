import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { getStudyPlan, setPlanEntry, getStudyPlanStats } from '../../../../../lib/syllabus-architect/study-planner-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

/**
 * GET /api/courses/[id]/course-map/study-plan — get student's own plan
 */
export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth
  if (user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Students only' }, { status: 403 })
  }

  const [entries, stats] = await Promise.all([
    getStudyPlan(user.id, courseId),
    getStudyPlanStats(user.id, courseId),
  ])

  return NextResponse.json({ entries, stats })
})

/**
 * POST /api/courses/[id]/course-map/study-plan — add/update a plan entry
 * Body: { nodeId: string, targetDate: string }
 */
export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth
  if (user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Students only' }, { status: 403 })
  }

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { nodeId, targetDate, complete } = parsed.data as { nodeId?: string; targetDate?: string; complete?: boolean }

  if (!nodeId || typeof nodeId !== 'string') {
    return NextResponse.json({ error: 'nodeId is required' }, { status: 400 })
  }

  // Mark as complete
  if (complete) {
    const { markPlanComplete } = await import('../../../../../lib/syllabus-architect/study-planner-service')
    const ok = await markPlanComplete(user.id, courseId, nodeId)
    return NextResponse.json({ ok }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  if (!targetDate) {
    return NextResponse.json({ error: 'targetDate is required' }, { status: 400 })
  }

  const entry = await setPlanEntry(user.id, courseId, nodeId, new Date(targetDate))
  return NextResponse.json({ entry }, { status: 201 })
})
