import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { browseEpisodes } from '../../../../lib/audio/audio-hub-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const url = req.nextUrl
  const query = url.searchParams.get('q') ?? undefined
  const tag = url.searchParams.get('tag') ?? undefined
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10), 50)
  const result = await browseEpisodes(query, tag, offset, limit)
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
