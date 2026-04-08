import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../lib/prisma'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../lib/server-auth'
import { validateBody } from '../../lib/validate'
import { z } from 'zod'

const SandcastleChatSchema = z.object({
  messages: z.array(z.object({ role: z.string(), content: z.string() })).min(1),
  systemPrompt: z.string().min(1).max(12000),
})

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 503 })
    }

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const validation = validateBody(SandcastleChatSchema, parsed.data)
    if ('error' in validation) return validation.error
    const { messages, systemPrompt } = validation.value

    let enrichedSystemPrompt = systemPrompt
    const memories = await prisma.userMemory
      .findMany({
        where: { userId: user.id },
        select: { content: true },
        orderBy: { createdAt: 'asc' },
      })
      .catch(() => [])

    if (memories.length > 0) {
      const memoryBlock = `ABOUT THIS USER (use naturally to personalize - do not repeat back verbatim):\n${memories.map((memory) => `- ${memory.content}`).join('\n')}`
      enrichedSystemPrompt = `${systemPrompt}\n\n---\n${memoryBlock}\n---`
    }

    const client = new Anthropic()
    const stream = client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: enrichedSystemPrompt,
      messages: messages.map((message: { role: string; content: string }) => ({
        role: message.role as 'user' | 'assistant',
        content: message.content,
      })),
    }, { signal: AbortSignal.timeout(60_000) })

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
          console.error('Sandcastle stream error:', err)
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
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    console.error('POST /api/sandcastle error:', err)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
