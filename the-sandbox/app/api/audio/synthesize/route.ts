import { NextRequest, NextResponse } from 'next/server'
import { OPENAI_AUDIO_VOICES } from '../../../lib/audio-experience'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { checkRateLimit } from '../../../lib/rate-limit'
import { withErrorHandling } from '../../../lib/api-utils'

const MAX_CHARS_PER_REQUEST = 1_500

function normalizeVoice(voice: string | null | undefined) {
  if (voice && OPENAI_AUDIO_VOICES.includes(voice as (typeof OPENAI_AUDIO_VOICES)[number])) {
    return voice
  }

  return 'alloy'
}

export const POST = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response
    const authedUser = auth.user

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Audio synthesis is disabled until OPENAI_API_KEY is configured.' },
        { status: 503 }
      )
    }

    const rateLimitError = await checkRateLimit(req, authedUser.id, 'AUDIO')
    if (rateLimitError) return rateLimitError

    const parsedBody = await parseRequestBody(req)
    if ('error' in parsedBody) return parsedBody.error
    const rawBody = parsedBody.data
    const { default: z } = await import('zod')
    const AudioBodySchema = z.object({
      text: z.string().min(1).max(MAX_CHARS_PER_REQUEST),
      voice: z.string().max(50).optional(),
      speed: z.number().min(0.25).max(4).optional(),
    })
    const bodyValidation = AudioBodySchema.safeParse(rawBody)
    if (!bodyValidation.success) {
      return NextResponse.json(
        { error: `text is required and must be ${MAX_CHARS_PER_REQUEST} characters or fewer.` },
        { status: 400 }
      )
    }
    const { text, voice, speed } = bodyValidation.data
    const normalizedText = text.trim()
    if (!normalizedText) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    const upstream = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: normalizedText,
        voice: normalizeVoice(voice),
        response_format: 'mp3',
        speed: typeof speed === 'number' ? Math.min(Math.max(speed, 0.25), 4) : 1,
      }),
    })

    if (!upstream.ok) {
      const errorText = await upstream.text()
      console.error('POST /api/audio/synthesize upstream error:', errorText)
      return NextResponse.json({ error: 'Audio synthesis failed' }, { status: 502 })
    }

    const audioBuffer = await upstream.arrayBuffer()

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  })
