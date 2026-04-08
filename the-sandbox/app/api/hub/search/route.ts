import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { hubSearch, getRecentSearches, getPopularSearches } from '../../../lib/hub-search-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const url = new URL(req.url)
  const query = url.searchParams.get('q')?.trim()
  const limit = parseInt(url.searchParams.get('limit') ?? '10', 10)

  // If no query, return recent + popular searches for typeahead
  if (!query) {
    const [recent, popular] = await Promise.all([
      getRecentSearches(auth.user.id),
      getPopularSearches(),
    ])
    return NextResponse.json({ recent, popular })
  }

  const results = await hubSearch(query, { limit, userId: auth.user.id })
  return NextResponse.json(results, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
