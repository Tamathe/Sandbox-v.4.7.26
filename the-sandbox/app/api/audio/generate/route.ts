import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { enqueueJob } from '../../../lib/audio-generation-queue'
import { withErrorHandling } from '../../../lib/api-utils'

const VALID_DURATIONS = ['5min', '15min', '30min', 'full'] as const
type ValidDuration = (typeof VALID_DURATIONS)[number]

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const parsed = await parseRequestBody<Record<string, string | undefined>>(request)
  if ('error' in parsed) return parsed.error

  const {
    sourceText,
    sourceType,
    sourceName,
    duration,
    voiceAId,
    voiceBId,
    courseId,
    toolId,
  } = parsed.data

  if (!sourceText || typeof sourceText !== 'string' || sourceText.trim() === '') {
    return NextResponse.json({ error: 'sourceText must be a non-empty string' }, { status: 400 })
  }

  if (!VALID_DURATIONS.includes(duration as ValidDuration)) {
    return NextResponse.json(
      { error: `duration must be one of: ${VALID_DURATIONS.join(', ')}` },
      { status: 400 },
    )
  }

  const result = await enqueueJob({
    requestedBy: user.id,
    sourceText,
    sourceType: sourceType ?? 'custom_text',
    sourceName: sourceName ?? 'Untitled',
    duration: duration as string,
    voiceAId: voiceAId ?? '',
    voiceBId: voiceBId ?? '',
    courseId,
    toolId,
  })

  // Cache hit
  if (result.status === 'COMPLETED') {
    const hit = result as { status: 'COMPLETED'; episodeId: string; cdnUrl: string }
    return NextResponse.json({ episodeId: hit.episodeId, cdnUrl: hit.cdnUrl, status: 'CACHED' })
  }

  // New job — fire-and-forget background processing
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    fetch(`${baseUrl}/api/audio/process-job`, {
      method: 'POST',
      headers: { authorization: `Bearer ${cronSecret}` },
    }).catch(() => {
      // Intentional fire-and-forget — errors logged server-side by the worker
    })
  }

  return NextResponse.json({ jobId: result.id, status: 'PENDING' }, { status: 202 })
})
