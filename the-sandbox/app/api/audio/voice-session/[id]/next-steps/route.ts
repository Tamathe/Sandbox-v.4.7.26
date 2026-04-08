import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../../lib/server-auth'
import { getVoiceSession } from '../../../../../lib/audio/voice-session-service'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const session = await getVoiceSession(id)
  if (!session || session.userId !== auth.user.id) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const scores = session.scores ?? []
  const scoresSummary = scores.length
    ? scores.map(s => `${s.dimension}: ${s.score}/10`).join(', ')
    : 'No scores available'

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `You are Sandy, an AI study assistant. A student just completed a ${session.type} voice tutoring session.

Scores: ${scoresSummary}
Summary: ${session.summary ?? 'No summary'}

Suggest what they should do next. Return JSON only:
{
  "suggestion": "<personalized 1-2 sentence suggestion>",
  "retryMode": "<recommended mode for retry: socratic|rehearsal|walkthrough|assessment|scenario>"
}`,
      },
    ],
  })

  try {
    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*?\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return NextResponse.json({
        suggestion: parsed.suggestion ?? '',
        relatedEpisodes: [],
        retryMode: parsed.retryMode ?? 'socratic',
      })
    }
  } catch {
    // Fall through to default
  }

  return NextResponse.json({
    suggestion: 'Great session! Try another mode to reinforce your learning.',
    relatedEpisodes: [],
    retryMode: 'socratic',
  })
})
