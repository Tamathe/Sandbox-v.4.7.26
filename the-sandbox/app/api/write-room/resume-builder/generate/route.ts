import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import {
  getInstantDraftPrompt,
  getFullRegenerationPrompt,
  type ResumeGenerateRequest,
} from '../../../../lib/resume-builder-service'

const anthropic = new Anthropic()

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody<ResumeGenerateRequest>(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  const { mode, preflight, interviewState } = body
  if (!mode || !preflight) {
    return NextResponse.json({ error: 'Missing mode or preflight' }, { status: 400 })
  }

  let systemPrompt: string
  let maxTokens: number

  switch (mode) {
    case 'instant-draft':
      systemPrompt = getInstantDraftPrompt(preflight)
      maxTokens = 1536
      break
    case 'full-regeneration':
      if (!interviewState) {
        return NextResponse.json({ error: 'interviewState required for regeneration' }, { status: 400 })
      }
      systemPrompt = getFullRegenerationPrompt(preflight, interviewState)
      maxTokens = 2048
      break
    default:
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120_000)

  const stream = anthropic.messages.stream(
    {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Generate the resume.' }],
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
            ctrl.enqueue(encoder.encode('\n\n_Request timed out. Please try again._'))
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
