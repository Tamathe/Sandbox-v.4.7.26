import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { checkRateLimit } from '../../../lib/rate-limit'
import {
  getSession, appendTranscript, saveDebrief, buildSimulationPrompt,
  updateSessionPhase,
} from '../../../lib/practice-service'
import type { TranscriptMessage, DimensionScore } from '../../../lib/practice-service'

const anthropic = new Anthropic()

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const rateLimitError = await checkRateLimit(req, auth.user.id, 'CHAT', auth.user.role !== 'STUDENT')
  if (rateLimitError) return rateLimitError

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { sessionId, message } = parsed.data as { sessionId: string; message: string }
  if (!sessionId || !message) return NextResponse.json({ error: 'sessionId and message required' }, { status: 400 })

  const session = await getSession(sessionId)
  if (!session || session.userId !== auth.user.id) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const scenario = session.scenario
  const transcript = (session.transcript as TranscriptMessage[] | null) ?? []

  // Handle "I'm ready" to transition from BRIEFING to ACTIVE
  if (session.phase === 'BRIEFING' && message.toLowerCase().includes('ready')) {
    await updateSessionPhase(sessionId, 'ACTIVE')
    await appendTranscript(sessionId, { role: 'user', content: message })

    const activePrompt = buildSimulationPrompt(scenario, 'ACTIVE', 0)
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: activePrompt,
      messages: [{ role: 'user', content: `The student says they're ready. Begin the ${scenario.title} simulation. Stay in character as ${scenario.aiRole}. Open with your first line.` }],
    })

    const aiMessage = response.content[0].type === 'text' ? response.content[0].text : ''
    await appendTranscript(sessionId, { role: 'assistant', content: aiMessage })

    return NextResponse.json({ reply: aiMessage, phase: 'ACTIVE' }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  // BRIEFING phase — just respond as Sandy
  if (session.phase === 'BRIEFING') {
    await appendTranscript(sessionId, { role: 'user', content: message })
    const briefingPrompt = buildSimulationPrompt(scenario, 'BRIEFING', 0)
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: briefingPrompt,
      messages: [{ role: 'user', content: message }],
    })
    const aiMessage = response.content[0].type === 'text' ? response.content[0].text : ''
    await appendTranscript(sessionId, { role: 'assistant', content: aiMessage })
    return NextResponse.json({ reply: aiMessage, phase: 'BRIEFING' }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  // ACTIVE phase
  if (session.phase === 'ACTIVE') {
    await appendTranscript(sessionId, { role: 'user', content: message })

    // Check if we've hit the turn limit → debrief
    if (session.turnCount + 1 >= scenario.turnLimit) {
      // Run debrief
      const debriefPrompt = buildSimulationPrompt(scenario, 'DEBRIEF', session.turnCount + 1)
      const transcriptText = [...transcript, { role: 'user' as const, content: message }]
        .map(m => `${m.role === 'user' ? 'Student' : scenario.aiRole}: ${m.content}`)
        .join('\n\n')

      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: debriefPrompt,
        messages: [{ role: 'user', content: `Full transcript:\n\n${transcriptText}` }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
      let debrief: { dimensions: DimensionScore[]; overall: number; strengths: string[]; growthAreas: string[] }
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        debrief = jsonMatch ? JSON.parse(jsonMatch[0]) : { dimensions: [], overall: 5, strengths: [], growthAreas: [] }
      } catch {
        debrief = { dimensions: [], overall: 5, strengths: ['Completed the simulation'], growthAreas: ['Practice more'] }
      }

      await saveDebrief(sessionId, debrief)
      return NextResponse.json({ reply: null, phase: 'DEBRIEF', debrief }, {
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    // Normal active turn
    const activePrompt = buildSimulationPrompt(scenario, 'ACTIVE', session.turnCount + 1)
    const conversationMessages = [...transcript, { role: 'user' as const, content: message }]
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: activePrompt,
      messages: conversationMessages,
    })

    const aiMessage = response.content[0].type === 'text' ? response.content[0].text : ''
    await appendTranscript(sessionId, { role: 'assistant', content: aiMessage })

    return NextResponse.json({
      reply: aiMessage,
      phase: 'ACTIVE',
      turnCount: session.turnCount + 1,
      turnsRemaining: scenario.turnLimit - session.turnCount - 1,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  return NextResponse.json({ error: 'Session is in debrief phase' }, { status: 400 })
})
