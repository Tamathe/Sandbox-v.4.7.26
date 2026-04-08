import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../../lib/server-auth'
import { searchThreadMessages } from '../../../../../lib/messages/thread-search-service'

// GET /api/messages/groups/[groupId]/search?q=<query>&limit=20
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response
  const user = auth.user
  const { groupId } = await params

  const url = new URL(request.url)
  const q = url.searchParams.get('q') ?? ''
  const limit = parseInt(url.searchParams.get('limit') ?? '20', 10)

  const result = await searchThreadMessages(user.id, groupId, q, limit)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
