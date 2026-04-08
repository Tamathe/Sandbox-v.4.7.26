import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
  }

  const parsed = await parseRequestBody<{ name: unknown; shortDescription: unknown; systemPrompt: unknown; intendedAudience: unknown; toolType: unknown }>(request)
  if ('error' in parsed) return parsed.error
  const { name, shortDescription, systemPrompt, intendedAudience, toolType } = parsed.data

  if (!shortDescription && !systemPrompt) {
    return NextResponse.json({ error: 'Need at least a short description or system prompt' }, { status: 400 })
  }

  const contextLines = [
    name && `Tool name: ${name}`,
    shortDescription && `Short description: ${shortDescription}`,
    intendedAudience && `Intended audience: ${intendedAudience}`,
    toolType === 'CHATBOT' && typeof systemPrompt === 'string' && `AI behavior: ${systemPrompt.slice(0, 400)}`,
  ].filter(Boolean).join('\n')

  const prompt = `You are writing the "Full Description" for an educational AI tool published on the University of Kentucky's AI tools marketplace. Write 2–3 short paragraphs (plain English, no headings, no bullet points) that:
1. Explain clearly what this tool does and what a student will experience
2. Describe the learning benefit or skill being practiced
3. Give a practical example of how a student might use it

Keep it under 200 words. Write for a student, not a developer. Do not start with "This tool".

Context:
${contextLines}

Write only the description, nothing else.`

  const client = new Anthropic()
  const stream = client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  }, { signal: AbortSignal.timeout(30_000) })

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
        console.error('generate-description stream error:', err)
        const isRateLimit = err instanceof Error && err.message.includes('429')
        const isTimeout = err instanceof Error && err.message.includes('abort')
        const userMsg = isRateLimit
          ? 'The AI service is temporarily busy. Please try again.'
          : isTimeout
          ? 'The request timed out. Please try again.'
          : 'Description generation failed. Please try again.'
        try { controller.enqueue(encoder.encode(userMsg)) } catch { /* ignore */ }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
  })
})
