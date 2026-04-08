import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { updateListeningHistory, addBookmark } from '../../../../lib/audio/audio-hub-service'

export const PATCH = withErrorHandling(async (req: NextRequest, ctx: any) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { episodeId } = await ctx.params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as any

  if (body.positionMs !== undefined) {
    await updateListeningHistory(
      auth.user.id,
      episodeId,
      body.positionMs,
      body.completedPct ?? 0,
    )
  }
  if (body.bookmark) {
    await addBookmark(auth.user.id, episodeId, body.bookmark)
  }
  return NextResponse.json({ ok: true })
})
