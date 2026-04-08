import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { listVoiceSessions } from '../../../../lib/audio/voice-session-service'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const sessions = await listVoiceSessions(auth.user.id, 10)

  const sessionSummary = sessions.length
    ? sessions.map(s => `${s.type} (${s.status}, score: ${s.scores?.[0]?.score ?? 'N/A'})`).join('; ')
    : 'No prior sessions'

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `You are Sandy, an AI study assistant. Based on the student's recent voice tutoring sessions, suggest the best next mode.

Recent sessions: ${sessionSummary}

Available modes:
- socratic: Probing questions to deepen understanding
- rehearsal: Student explains a concept (Feynman Technique)
- walkthrough: Step-by-step guided teaching
- assessment: Timed oral quiz
- scenario: Professional role-play

Return JSON only: { "mode": "<mode_id>", "reason": "<one sentence why>" }`,
      },
    ],
  })

  try {
    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[^}]+\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return NextResponse.json(parsed)
    }
  } catch {
    // Fall through to default
  }

  return NextResponse.json({ mode: 'socratic', reason: 'Socratic dialogue is a great all-purpose study mode.' })
})
