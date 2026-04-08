import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../lib/prisma'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../lib/server-auth'
import { withErrorHandling } from '../../lib/api-utils'
import { checkRateLimit } from '../../lib/rate-limit'
import { validateBody } from '../../lib/validate'
import { getWorkshopTool } from '../../lib/workshop'
import { z } from 'zod'

const WorkshopSchema = z.object({
  slug: z.string().min(1),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).min(1),
  uploadedContent: z.string().optional(),
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const rateLimitError = await checkRateLimit(req, user.id, 'CHAT', user.role !== 'STUDENT')
  if (rateLimitError) return rateLimitError

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 503 })
  }

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const validation = validateBody(WorkshopSchema, parsed.data)
  if ('error' in validation) return validation.error
  const { slug, messages, uploadedContent } = validation.value

  const tool = getWorkshopTool(slug)
  if (!tool) {
    return NextResponse.json({ error: 'Workshop tool not found' }, { status: 404 })
  }

  // Build system prompt with optional uploaded content
  let systemPrompt = tool.systemPrompt
  if (uploadedContent) {
    systemPrompt += `\n\n---\nUPLOADED DOCUMENT CONTENT:\n${uploadedContent.slice(0, 50000)}\n---`
  }

  // Enrich with user memories (same pattern as Research Hub)
  const memories = await prisma.userMemory
    .findMany({
      where: { userId: user.id },
      select: { content: true },
      orderBy: { createdAt: 'asc' },
    })
    .catch(() => [])

  if (memories.length > 0) {
    const memoryBlock = `ABOUT THIS USER (use naturally to personalize):\n${memories.map(m => `- ${m.content}`).join('\n')}`
    systemPrompt = `${systemPrompt}\n\n---\n${memoryBlock}\n---`
  }

  // Stream response
  const client = new Anthropic()
  const modelId = tool.model === 'sonnet' ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001'

  const stream = client.messages.stream({
    model: modelId,
    max_tokens: 4096,
    system: systemPrompt,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
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
        console.error('Workshop stream error:', err)
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
