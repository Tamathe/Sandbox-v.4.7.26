import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { getConversations } from '../../../lib/messages/conversations-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const runtime = 'nodejs'

// GET /api/messages/conversations
// Returns all conversations the authenticated user participates in, sorted by most recent message.
export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response
  const user = auth.user

  const url = request.nextUrl
  const cursor = url.searchParams.get('cursor') || undefined
  const limitParam = parseInt(url.searchParams.get('limit') || '20', 10)
  const limit = Math.min(Math.max(1, isNaN(limitParam) ? 20 : limitParam), 50)

  const result = await getConversations({ userId: user.id, cursor, limit })
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
