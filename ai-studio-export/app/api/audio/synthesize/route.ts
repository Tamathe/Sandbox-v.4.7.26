import { NextRequest, NextResponse } from 'next/server'
import { OPENAI_AUDIO_VOICES } from '../../../lib/audio-experience'

const DAILY_CHARACTER_LIMIT = 50_000
const MAX_CHARS_PER_REQUEST = 1_500

const usageByUser = new Map<string, { dateKey: string; chars: number }>()

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function normalizeVoice(voice: string | null | undefined) {
  if (voice && OPENAI_AUDIO_VOICES.includes(voice as (typeof OPENAI_AUDIO_VOICES)[number])) {
    return voice
  }

  return 'alloy'
}

export async function POST(req: NextRequest) {
  try {
    const userEmail = req.headers.get('x-demo-user-email')
    if (!userEmail) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Audio synthesis is disabled until OPENAI_API_KEY is configured.' },
        { status: 503 }
      )
    }

    let rawBody: unknown
    try { rawBody = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
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

    const dateKey = getTodayKey()
    const usage = usageByUser.get(userEmail)
    if (!usage || usage.dateKey !== dateKey) {
      usageByUser.set(userEmail, { dateKey, chars: 0 })
    }

    const currentUsage = usageByUser.get(userEmail)!
    if (currentUsage.chars + normalizedText.length > DAILY_CHARACTER_LIMIT) {
      return NextResponse.json(
        { error: 'Daily audio limit reached. Please try again tomorrow.' },
        { status: 429 }
      )
    }

    const upstream = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
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
    currentUsage.chars += normalizedText.length

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('POST /api/audio/synthesize error:', error)
    return NextResponse.json({ error: 'Failed to synthesize audio' }, { status: 500 })
  }
}
