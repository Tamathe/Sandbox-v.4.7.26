/**
 * POST /api/analytics/analyze-session
 *
 * On-demand AI analysis of a completed tool session.
 * Reads the ChatMessage transcript, asks Claude to extract a score + topic,
 * and writes the results as MetricEvent records (metricName: 'score' | 'topic').
 *
 * Called from ChatInterface after session end.
 * If ANTHROPIC_API_KEY is absent, falls back to a heuristic score.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireRequestUser, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'

interface AnalysisResult {
  score: number
  topic: string
  engagement: 'low' | 'medium' | 'high'
  flags: string[]
}

async function analyzeWithClaude(transcript: string, toolName: string): Promise<AnalysisResult> {
  const client = new Anthropic()

  const prompt = `You are an educational analytics engine. Analyze this AI tutoring session transcript for the tool "${toolName}".

Return ONLY valid JSON — no other text:
{
  "score": <integer 0-100>,
  "topic": "<primary topic covered, max 60 chars, specific not generic>",
  "engagement": "low" | "medium" | "high",
  "flags": ["confusion" | "off_topic" | "academic_integrity"]
}

Scoring guide:
- 85–100: Student demonstrates clear conceptual understanding
- 70–84: Mostly correct with minor gaps
- 50–69: Partial understanding, significant gaps
- <50: Significant confusion or minimal engagement

Topic should be the specific subject discussed (e.g. "Hearsay Exceptions — FRE 803"), not the tool name.
Flags array should be empty [] unless a concern is clearly present.

Transcript:
${transcript.slice(0, 12000)}`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  })

  const first = response.content[0]
  const text = first?.type === 'text' ? first.text : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in Claude response')

  let result: AnalysisResult
  try {
    result = JSON.parse(match[0]) as AnalysisResult
  } catch {
    console.warn('[analyze-session] Malformed JSON from Claude, using fallback score')
    return { score: 65, topic: 'General practice', engagement: 'medium', flags: [] }
  }
  // Clamp score to valid range
  result.score = Math.min(100, Math.max(0, Math.round(result.score)))
  return result
}

function heuristicScore(messages: { role: string; content: string }[]): AnalysisResult {
  const studentMessages = messages.filter((m) => m.role === 'user')
  const totalWords = studentMessages.reduce((sum, m) => sum + m.content.split(/\s+/).length, 0)
  // Rough engagement heuristic: more words → higher baseline score
  const baseScore = Math.min(95, 60 + Math.min(35, Math.floor(totalWords / 10)))
  return {
    score: baseScore,
    topic: 'General practice',
    engagement: studentMessages.length >= 4 ? 'high' : studentMessages.length >= 2 ? 'medium' : 'low',
    flags: [],
  }
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if ('response' in auth) return auth.response
  const { user } = auth

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { sessionId } = parsed.data as { sessionId: string }
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  // Verify session belongs to this user
  const session = await prisma.toolSession.findUnique({
    where: { id: sessionId },
    include: {
      tool: { select: { id: true, name: true } },
      chatMessages: {
        select: { role: true, content: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.userId && session.userId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Skip if no meaningful messages (welcome message only)
  const userMessages = session.chatMessages.filter((m) => m.role === 'user')
  if (userMessages.length === 0) {
    return NextResponse.json({ skipped: true, reason: 'No student messages' })
  }

  // Skip if already analyzed (score MetricEvent exists for this session)
  const existing = await prisma.metricEvent.findFirst({
    where: { sessionId, metricName: 'score' },
  })
  if (existing) {
    return NextResponse.json({ skipped: true, reason: 'Already analyzed' })
  }

  // Build transcript
  const transcript = session.chatMessages
    .map((m) => `[${m.role === 'user' ? 'STUDENT' : 'AI'}]: ${m.content}`)
    .join('\n\n')

  // Analyze
  let result: AnalysisResult
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      result = await analyzeWithClaude(transcript, session.tool.name)
    } catch (err) {
      console.warn('[analyze-session] Claude failed, falling back to heuristic:', err)
      result = heuristicScore(session.chatMessages)
    }
  } else {
    result = heuristicScore(session.chatMessages)
  }

  // Write MetricEvents
  await prisma.$transaction([
    prisma.metricEvent.create({
      data: {
        toolId:      session.tool.id,
        sessionId,
        metricName:  'score',
        metricValue: String(result.score),
      },
    }),
    prisma.metricEvent.create({
      data: {
        toolId:      session.tool.id,
        sessionId,
        metricName:  'topic',
        metricValue: result.topic,
      },
    }),
    prisma.metricEvent.create({
      data: {
        toolId:      session.tool.id,
        sessionId,
        metricName:  'engagement',
        metricValue: result.engagement,
      },
    }),
    ...(result.flags.length > 0
      ? [
          prisma.metricEvent.create({
            data: {
              toolId:      session.tool.id,
              sessionId,
              metricName:  'flags',
              metricValue: result.flags.join(','),
            },
          }),
        ]
      : []),
  ])

  return NextResponse.json({
    score:      result.score,
    topic:      result.topic,
    engagement: result.engagement,
    flags:      result.flags,
  })
})
