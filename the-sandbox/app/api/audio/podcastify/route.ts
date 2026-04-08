import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { canStudentGenerate } from '../../../lib/audio/audio-hub-service'
import { enqueueJob } from '../../../lib/audio-generation-queue'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as any

  const allowed = await canStudentGenerate(auth.user.id)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Daily limit reached (3 episodes per day)' },
      { status: 429 },
    )
  }

  const sourceText = (body.sourceText ?? '').slice(0, 10_000)
  if (!sourceText.trim()) {
    return NextResponse.json({ error: 'Source text is required' }, { status: 400 })
  }

  const result = await enqueueJob({
    requestedBy: auth.user.id,
    sourceText,
    sourceType: body.sourceType ?? 'custom_text',
    sourceName: body.sourceName ?? 'My Episode',
    duration: body.duration ?? '15min',
    voiceAId: body.voiceAId ?? '',
    voiceBId: body.voiceBId ?? '',
    courseId: body.courseId,
  })

  if (result.status === 'COMPLETED') {
    return NextResponse.json({
      episodeId: (result as any).episodeId,
      cdnUrl: (result as any).cdnUrl,
      status: 'CACHED',
    })
  }
  return NextResponse.json({ jobId: result.id, status: 'PENDING' }, { status: 202 })
})
