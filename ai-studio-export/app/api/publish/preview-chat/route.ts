import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { validateBody } from '../../../lib/validate'
import { z } from 'zod'

const PreviewChatSchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })).min(1),
  toolName: z.string().max(150).optional(),
  personaName: z.string().max(80).optional(),
  systemPrompt: z.string().max(12000).optional(),
})

type PreviewMessage = {
  role: 'user' | 'assistant'
  content: string
}

function buildFallbackPrompt(personaName?: string, toolName?: string) {
  const displayName = personaName?.trim() || 'a helpful AI tutor'
  const displayTool = toolName?.trim() || 'this learning tool'

  return `You are ${displayName}, the AI tutor for ${displayTool} inside The Sandbox at the University of Kentucky. Teach clearly, stay encouraging, and help the learner think step by step instead of jumping straight to the answer.`
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRequestUser(request)
    if (isAuthFailure(auth)) return auth.response

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Preview chat is unavailable because ANTHROPIC_API_KEY is not configured.' },
        { status: 503 }
      )
    }

    const parsed = await parseRequestBody(request)
    if ('error' in parsed) return parsed.error
    const validation = validateBody(PreviewChatSchema, parsed.data)
    if ('error' in validation) return validation.error
    const { messages, toolName, personaName, systemPrompt } = validation.value

    const anthropicMessages = messages
      .filter((m) => m.content.trim().length > 0)
      .map((m) => ({ role: m.role, content: m.content }))

    const client = new Anthropic()
    const stream = client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt?.trim() || buildFallbackPrompt(personaName, toolName),
      messages: anthropicMessages,
    }, { signal: AbortSignal.timeout(60_000) })

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }
        } catch (err) {
          console.error('Preview-chat stream error:', err)
          const isRateLimit = err instanceof Error && err.message.includes('429')
          const isAuth = err instanceof Error && (err.message.includes('401') || err.message.includes('authentication'))
          const isTimeout = err instanceof Error && err.message.includes('abort')
          const userMsg = isRateLimit
            ? 'The AI service is temporarily busy. Please wait a moment and try again.'
            : isAuth
            ? 'AI service configuration error. Please contact support.'
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
        'Cache-Control': 'no-cache, no-transform',
      },
    })
  } catch (error) {
    console.error('POST /api/publish/preview-chat error:', error)
    return NextResponse.json({ error: 'Failed to preview chat' }, { status: 500 })
  }
}
