import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../lib/prisma'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../lib/server-auth'
import { withErrorHandling } from '../../lib/api-utils'
import { checkRateLimit } from '../../lib/rate-limit'
import { validateBody } from '../../lib/validate'
import { getResearchContext } from '../../lib/research-rag-service'
import { z } from 'zod'

const ResearchHubSchema = z.object({
  messages: z.array(z.object({ role: z.string(), content: z.string() })).min(1),
  systemPrompt: z.string().min(1).max(12000),
  sessionId: z.string().optional(),
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const rateLimitError = await checkRateLimit(req, user.id, 'GENERATE', user.role !== 'STUDENT')
  if (rateLimitError) return rateLimitError

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 503 })
  }

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const validation = validateBody(ResearchHubSchema, parsed.data)
  if ('error' in validation) return validation.error
  const { messages, systemPrompt, sessionId } = validation.value

  let enrichedSystemPrompt = systemPrompt

  // RAG: inject relevant chunks from uploaded documents
  if (sessionId) {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content ?? ''
    if (lastUserMessage) {
      try {
        const ragContext = await getResearchContext(sessionId, lastUserMessage)
        if (ragContext) {
          enrichedSystemPrompt += `\n\n---\n${ragContext}\n---`
        }
      } catch (err) {
        console.error('Research RAG retrieval error:', err)
      }
    }
  }
  const memories = await prisma.userMemory
    .findMany({
      where: { userId: user.id },
      select: { content: true },
      orderBy: { createdAt: 'asc' },
    })
    .catch(() => [])

  if (memories.length > 0) {
    const memoryBlock = `ABOUT THIS USER (use naturally to personalize):\n${memories.map(m => `- ${m.content}`).join('\n')}`
    enrichedSystemPrompt = `${systemPrompt}\n\n---\n${memoryBlock}\n---`
  }

  const client = new Anthropic()
  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: enrichedSystemPrompt,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
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
        console.error('Research Hub stream error:', err)
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
