import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getAudioAnalytics } from '../../../../lib/audio/audio-analytics-service'

export const GET = withErrorHandling(async (req: NextRequest, ctx: { params: Promise<{ courseId: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  if (auth.user.role !== 'EDUCATOR' && auth.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { courseId } = await ctx.params
  const analytics = await getAudioAnalytics(courseId)
  return NextResponse.json(analytics, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
