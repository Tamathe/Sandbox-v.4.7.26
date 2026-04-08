import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../../../lib/server-auth'
import {
  sendGroupMessage,
  getGroupMessages,
} from '../../../../../../../lib/syllabus-architect/study-group-service'
import { withErrorHandling } from '../../../../../../../lib/api-utils'

/**
 * GET /api/courses/[id]/course-map/study-groups/[groupId]/messages
 *
 * Get messages for a study group. Optional ?before= for pagination.
 * Auth: any authenticated user.
 */
export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> },
) => {
  const { groupId } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const url = new URL(req.url)
  const before = url.searchParams.get('before') ?? undefined

  const messages = await getGroupMessages(groupId, 50, before)
  return NextResponse.json({ messages }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

/**
 * POST /api/courses/[id]/course-map/study-groups/[groupId]/messages
 *
 * Send a message in a study group.
 * Body: { content: string }
 * Auth: any authenticated user.
 */
export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> },
) => {
  const { groupId } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { content } = parsed.data as { content?: string }

  if (!content?.trim()) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  const message = await sendGroupMessage(groupId, user.id, content.trim())
  return NextResponse.json({ message }, { status: 201 })
})
