import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getRefinePrompt, type LinkedInRefineRequest } from '../../../../lib/linkedin-optimizer-service'

const anthropic = new Anthropic()

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody<LinkedInRefineRequest>(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  const { currentContent, targetSection, instruction, preflight, interviewState } = body
  if (!currentContent || !targetSection || !instruction || !preflight || !interviewState) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const prompt = getRefinePrompt(body)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)

  const stream = anthropic.messages.stream(
    {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: targetSection === 'headline' ? 256 : 1024,
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
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
        } catch {
          // timeout or abort
        } finally {
          clearTimeout(timeout)
          ctrl.close()
        }
      },
    }),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' } },
  )
})
