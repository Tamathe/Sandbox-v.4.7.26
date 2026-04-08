import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { searchMessages } from '../../../lib/messages/search-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const runtime = 'nodejs'

// GET /api/messages/search
// Searches message content across all conversations the user is a member of.
export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response
  const user = auth.user

  const url = request.nextUrl
  const q = url.searchParams.get('q')
  if (!q || q.trim().length < 2) {
    return NextResponse.json(
      { error: 'Search query must be at least 2 characters' },
      { status: 400 },
    )
  }

  const cursor = url.searchParams.get('cursor') || undefined
  const limitParam = parseInt(url.searchParams.get('limit') || '20', 10)
  const limit = Math.min(Math.max(1, isNaN(limitParam) ? 20 : limitParam), 50)
  const groupId = url.searchParams.get('groupId') || undefined

  const result = await searchMessages({
    userId: user.id,
    q: q.trim(),
    cursor,
    limit,
    groupId,
  })
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
