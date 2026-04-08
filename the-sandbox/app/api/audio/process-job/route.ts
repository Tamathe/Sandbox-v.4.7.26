import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '../../../lib/server-auth'
import { processNextAudioJob } from '../../../lib/audio-processor-service'
import { withErrorHandling } from '../../../lib/api-utils'

/**
 * POST /api/audio/process-job
 *
 * Secured by Bearer CRON_SECRET (same pattern as news-fetch).
 * Called fire-and-forget from POST /api/audio/generate when a new job is enqueued.
 * Claims and processes the next PENDING AudioGenerationJob.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const cronError = verifyCronSecret(request)
  if (cronError) return cronError

  const processed = await processNextAudioJob()

  if (!processed) {
    return NextResponse.json({ message: 'No pending jobs' })
  }

  return NextResponse.json({ message: 'Job processed' })
})
