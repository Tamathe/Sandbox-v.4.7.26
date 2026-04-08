import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { validateBody } from '../../../lib/validate'
import { z } from 'zod'
import { prisma } from '../../../lib/prisma'
import { getWellnessHubTool } from '../../../lib/wellness-hub'
import { getInsightPrompt, formatEntriesForPrompt } from '../../../lib/wellness-hub-service'

const InsightsSchema = z.object({
  slug: z.string().min(1),
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 503 })
  }

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const validation = validateBody(InsightsSchema, parsed.data)
  if ('error' in validation) return validation.error
  const { slug } = validation.value

  const tool = getWellnessHubTool(slug)
  if (!tool) {
    return NextResponse.json({ error: 'Unknown tool slug' }, { status: 400 })
  }

  // Fetch last 14 entries
  const entries = await prisma.wellnessEntry.findMany({
    where: { userId: user.id, toolSlug: slug },
    orderBy: { date: 'desc' },
    take: 14,
  })

  if (entries.length < 3) {
    return NextResponse.json(
      { error: 'Need at least 3 entries before AI can identify patterns' },
      { status: 400 },
    )
  }

  // Reverse to chronological for the prompt
  entries.reverse()

  const systemPrompt = getInsightPrompt(slug)
  const userMessage = formatEntriesForPrompt(entries, slug)

  const client = new Anthropic()
  const stream = client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  }, { signal: AbortSignal.timeout(60_000) })

  // Collect full insight to save to DB
  let fullInsight = ''
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            fullInsight += chunk.delta.text
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }

        // Save insight to the most recent entry
        if (fullInsight && entries.length > 0) {
          const mostRecent = entries[entries.length - 1]
          await prisma.wellnessEntry.update({
            where: { id: mostRecent.id },
            data: { aiInsight: fullInsight },
          }).catch(e => console.error('Failed to save insight:', e))
        }
      } catch (err) {
        console.error('Wellness insight stream error:', err)
        const userMsg = 'Something went wrong generating insights. Please try again.'
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
