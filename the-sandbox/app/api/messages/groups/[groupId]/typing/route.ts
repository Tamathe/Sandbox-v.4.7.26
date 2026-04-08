import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../../lib/server-auth'
import { reportTyping, getTypingUsers } from '../../../../../lib/messages/typing-service'

// POST /api/messages/groups/[groupId]/typing — report typing
export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response
  const user = auth.user
  const { groupId } = await params

  const result = await reportTyping(user.id, groupId)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ ok: true }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

// GET /api/messages/groups/[groupId]/typing — fetch who's typing
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response
  const user = auth.user
  const { groupId } = await params

  const result = await getTypingUsers(user.id, groupId)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
