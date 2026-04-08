import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../lib/server-auth'
import { withErrorHandling } from '../../lib/api-utils'
import { validateBody } from '../../lib/validate'
import { z } from 'zod'
import { getWriteRoomTool } from '../../lib/write-room'
import { getSystemPrompt, buildUserMessage } from '../../lib/write-room-service'

const WriteRoomSchema = z.object({
  slug: z.string().min(1),
  formData: z.record(z.string(), z.string()),
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 503 })
  }

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const validation = validateBody(WriteRoomSchema, parsed.data)
  if ('error' in validation) return validation.error
  const { slug, formData } = validation.value

  const tool = getWriteRoomTool(slug)
  if (!tool) {
    return NextResponse.json({ error: 'Unknown tool slug' }, { status: 400 })
  }

  const systemPrompt = getSystemPrompt(slug)
  const userMessage = buildUserMessage(slug, formData)

  const client = new Anthropic()
  const stream = client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  }, { signal: AbortSignal.timeout(120_000) })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } catch (err) {
        console.error('Write Room stream error:', err)
        const isRateLimit = err instanceof Error && err.message.includes('429')
        const isTimeout = err instanceof Error && err.message.includes('abort')
        const userMsg = isRateLimit
          ? 'The AI service is temporarily busy. Please wait a moment and try again.'
          : isTimeout
          ? 'The request timed out. Please try again.'
          : 'Something went wrong. Please try again.'
        try { controller.enqueue(encoder.encode(`\n\n_${userMsg}_`)) } catch { /* ignore */ }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
})
