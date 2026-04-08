import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { withErrorHandling } from '../../../lib/api-utils'

/**
 * GET /api/audio/transcript?episodeId=...
 *
 * Returns the plain-text transcript for a given AudioEpisode.
 * Used by the transcript display component for ADA compliance.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const episodeId = request.nextUrl.searchParams.get('episodeId')
  if (!episodeId) {
    return NextResponse.json({ error: 'episodeId is required' }, { status: 400 })
  }

  const episode = await prisma.audioEpisode.findUnique({
    where: { id: episodeId },
    select: { id: true, sourceName: true, transcript: true, transcriptFormat: true },
  })

  if (!episode) {
    return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
  }

  return NextResponse.json({
    episodeId: episode.id,
    sourceName: episode.sourceName,
    transcript: episode.transcript,
    transcriptFormat: episode.transcriptFormat,
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
