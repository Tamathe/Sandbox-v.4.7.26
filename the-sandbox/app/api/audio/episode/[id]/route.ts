import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getEpisodeDetail, incrementListenCount } from '../../../../lib/audio/audio-hub-service'

export const GET = withErrorHandling(async (req: NextRequest, ctx: any) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { id } = await ctx.params
  const detail = await getEpisodeDetail(id, auth.user.id)
  if (!detail) return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
  incrementListenCount(id)
  return NextResponse.json(detail, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
