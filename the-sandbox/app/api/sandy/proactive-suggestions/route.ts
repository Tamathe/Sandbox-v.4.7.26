import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { getProactiveSuggestions } from '../../../lib/proactive-suggestions-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth

  // Only EDUCATOR and ADMIN roles get suggestions
  if (user.role !== 'EDUCATOR' && user.role !== 'ADMIN') {
    return NextResponse.json({ suggestions: [] }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  const suggestions = await getProactiveSuggestions(user.id)
  return NextResponse.json({ suggestions }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
