import { NextRequest, NextResponse } from 'next/server'
import { anthropic, HAIKU_MODEL, CHAT_MAX_TOKENS } from '../../../../../lib/virtual-clinic/ai-config'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { checkRateLimit } from '../../../../../lib/rate-limit'
import { getEncounter, appendToTranscript, updateTrackingMarkers, updateAffectState, getAffectState } from '../../../../../lib/virtual-clinic/encounter-service'
import { buildPatientSystemPrompt } from '../../../../../lib/virtual-clinic/patient-prompt-service'
import { computeAffectDelta, DEFAULT_AFFECT } from '../../../../../lib/virtual-clinic/affect-engine'
import type { EncounterPhase, TranscriptMessage } from '../../../../../lib/virtual-clinic/types'

const AI_RESPONSE_TIMEOUT_MS = 60_000
const MESSAGE_MAX_LENGTH = 10_000

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ encounterId: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const rateLimitError = await checkRateLimit(req, user.id, 'CHAT', user.role !== 'STUDENT')
  if (rateLimitError) return rateLimitError

  const { encounterId } = await params
  const encounter = await getEncounter(encounterId)

  if (encounter.userId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const phase = encounter.phase as EncounterPhase
  if (phase === 'COMPLETED') {
    return NextResponse.json({ error: 'Encounter is already completed' }, { status: 400 })
  }

  const parsed = await parseRequestBody<{ message: string }>(req)
  if ('error' in parsed) return parsed.error
  const { message } = parsed.data
  if (!message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }
  if (message.length > MESSAGE_MAX_LENGTH) {
    return NextResponse.json({ error: `Message exceeds ${MESSAGE_MAX_LENGTH.toLocaleString()} character limit` }, { status: 400 })
  }

  // Append user message to transcript
  const userMsg: TranscriptMessage = {
    role: 'user',
    content: message,
    phase,
    timestamp: new Date().toISOString(),
  }
  await appendToTranscript(encounterId, userMsg)

  // Build conversation history for the AI
  const transcript = (encounter.transcript as unknown ?? []) as TranscriptMessage[]
  const messages: { role: 'user' | 'assistant'; content: string }[] = [
    ...transcript.map((t) => ({ role: t.role, content: t.content })),
    { role: 'user' as const, content: message },
  ]

  // Get current affect state for personality modulation
  const currentAffect = getAffectState(encounter) ?? DEFAULT_AFFECT

  // Build phase-aware patient system prompt (with affect dynamics)
  const systemPrompt = buildPatientSystemPrompt(encounter.clinicalCase, phase, currentAffect)

  // Stream the AI patient response
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AI_RESPONSE_TIMEOUT_MS)

  const stream = anthropic.messages.stream(
    {
      model: HAIKU_MODEL,
      max_tokens: CHAT_MAX_TOKENS,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    },
    { signal: controller.signal },
  )

  const encoder = new TextEncoder()
  let fullResponse = ''

  return new Response(
    new ReadableStream({
      async start(ctrl) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              fullResponse += event.delta.text
              ctrl.enqueue(encoder.encode(event.delta.text))
            }
          }
        } catch (err: unknown) {
          // Timeout or abort — persist partial response and signal interruption to client
          const reason = err instanceof Error && err.name === 'AbortError' ? 'timeout' : 'error'
          if (reason === 'timeout') {
            ctrl.enqueue(encoder.encode('\n\n[Patient response was interrupted — please try again]'))
          }
        } finally {
          clearTimeout(timeout)

          // Persist the AI response to the transcript
          if (fullResponse) {
            const assistantMsg: TranscriptMessage = {
              role: 'assistant',
              content: fullResponse,
              phase,
              timestamp: new Date().toISOString(),
            }
            await appendToTranscript(encounterId, assistantMsg)
            await updateTrackingMarkers(encounterId, fullResponse)

            // Non-blocking affect update
            const recentMsgs = [...transcript.slice(-3), userMsg, assistantMsg]
            computeAffectDelta(recentMsgs, currentAffect, encounter.clinicalCase.personalityNotes)
              .then((newAffect) => updateAffectState(encounterId, newAffect))
              .catch(() => {}) // Non-critical — don't fail the chat
          }

          ctrl.close()
        }
      },
    }),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' } },
  )
})
