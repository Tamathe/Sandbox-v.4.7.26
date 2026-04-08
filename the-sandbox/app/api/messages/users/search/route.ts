import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { searchUsers } from '../../../../lib/messages/user-search-service'
import { withErrorHandling } from '../../../../lib/api-utils'

// GET /api/messages/users/search?q=<query>&limit=20
export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const url = new URL(request.url)
  const query = url.searchParams.get('q') ?? ''
  const limit = parseInt(url.searchParams.get('limit') ?? '20', 10)

  const users = await searchUsers(auth.user.id, query, limit)
  return NextResponse.json({ users }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
