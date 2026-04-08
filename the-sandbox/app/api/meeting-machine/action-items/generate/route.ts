import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getGeneratePrompt, type MeetingGenerateRequest } from '../../../../lib/meeting-machine-elevation-service'

const anthropic = new Anthropic()

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody<MeetingGenerateRequest>(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  if (!body.preflight) {
    return NextResponse.json({ error: 'Missing preflight' }, { status: 400 })
  }

  // Ensure correct tool slug
  body.toolSlug = 'action-items' as MeetingGenerateRequest['toolSlug']

  const systemPrompt = getGeneratePrompt(body)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120_000)

  const stream = anthropic.messages.stream(
    {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: body.rawInput ? `Here are the meeting notes:\n${body.rawInput}` : 'Generate the content.' }],
    },
    { signal: controller.signal },
  )

  const encoder = new TextEncoder()

  return new Response(
    new ReadableStream({
      async start(ctrl) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              ctrl.enqueue(encoder.encode(event.delta.text))
            }
          }
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            ctrl.enqueue(encoder.encode('\n\n_Request timed out._'))
          }
        } finally {
          clearTimeout(timeout)
          ctrl.close()
        }
      },
    }),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' } },
  )
})
