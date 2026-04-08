import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import {
  createStudyGroup,
  getStudyGroups,
  getStudyGroupMembers,
  joinStudyGroup,
  leaveStudyGroup,
  getGroupProgress,
  getNodeGroupCounts,
} from '../../../../../lib/syllabus-architect/study-group-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

/**
 * GET /api/courses/[id]/course-map/study-groups
 *
 * List all study groups for a course. Optional ?groupId= for detail view.
 * Optional ?nodeCounts=true for node badge data.
 * Auth: any authenticated user.
 */
export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const url = new URL(req.url)
  const groupId = url.searchParams.get('groupId')
  const nodeCounts = url.searchParams.get('nodeCounts')

  // Return node group counts for badge display
  if (nodeCounts === 'true') {
    const counts = await getNodeGroupCounts(courseId)
    return NextResponse.json({ counts: Object.fromEntries(counts) }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  // Return single group detail
  if (groupId) {
    const [detail, progress] = await Promise.all([
      getStudyGroupMembers(groupId),
      getGroupProgress(groupId),
    ])
    if (!detail) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }
    return NextResponse.json({ group: detail, progress })
  }

  // List all groups
  const groups = await getStudyGroups(courseId)
  return NextResponse.json({ groups }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

/**
 * POST /api/courses/[id]/course-map/study-groups
 *
 * Create a study group or join/leave one.
 * Body: { action: 'create', nodeId, name } | { action: 'join'|'leave', groupId }
 * Auth: any authenticated user.
 */
export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { action?: string; nodeId?: string; name?: string; groupId?: string }
  const { action } = body

  if (action === 'create') {
    const { nodeId, name } = body
    if (!nodeId || !name?.trim()) {
      return NextResponse.json({ error: 'nodeId and name are required' }, { status: 400 })
    }
    const group = await createStudyGroup(courseId, nodeId, user.id, name.trim())
    return NextResponse.json({ group }, { status: 201 })
  }

  if (action === 'join') {
    const { groupId } = body
    if (!groupId) {
      return NextResponse.json({ error: 'groupId is required' }, { status: 400 })
    }
    const joined = await joinStudyGroup(groupId, user.id)
    return NextResponse.json({ ok: true, joined })
  }

  if (action === 'leave') {
    const { groupId } = body
    if (!groupId) {
      return NextResponse.json({ error: 'groupId is required' }, { status: 400 })
    }
    const left = await leaveStudyGroup(groupId, user.id)
    return NextResponse.json({ ok: true, left })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
})
