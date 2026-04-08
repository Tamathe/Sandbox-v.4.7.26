import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getContractGeneratePrompt, type ContractDrafterGenerateRequest } from '../../../../lib/contract-drafter-service'

const anthropic = new Anthropic()

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as ContractDrafterGenerateRequest
  if (!body.preflight || !body.contractDetails) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const systemPrompt = getContractGeneratePrompt(body)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120_000)
  const stream = anthropic.messages.stream(
    { model: 'claude-haiku-4-5-20251001', max_tokens: 4096, system: systemPrompt, messages: [{ role: 'user', content: 'Draft the contract now.' }] },
    { signal: controller.signal },
  )
  const encoder = new TextEncoder()
  return new Response(
    new ReadableStream({
      async start(ctrl) {
        try { for await (const event of stream) { if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') ctrl.enqueue(encoder.encode(event.delta.text)) } } catch {} finally { clearTimeout(timeout); ctrl.close() }
      },
    }),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' } },
  )
})
