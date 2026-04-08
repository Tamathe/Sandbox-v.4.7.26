/**
 * Insight Service — AI-generated poll insights via Anthropic Haiku.
 *
 * generatePollInsight() is called fire-and-forget from poll-service.ts
 * after closePoll(). Streams a 2–3 sentence pedagogical analysis, stores
 * the result in PollInsight, and publishes poll_insight_ready to the room bus.
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import { publishToRoom } from './room-bus'

const INSIGHT_SYSTEM_PROMPT =
  'You are an educational AI assistant. In 2–3 sentences, explain what this poll result reveals about student understanding. Be specific about the distribution and what it implies for teaching. Do not just repeat the numbers.'

export async function generatePollInsight(
  pollId: string,
  roomId: string,
  question: string,
  options: string[],
  totals: number[],
): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[InsightService] ANTHROPIC_API_KEY not set — skipping poll insight generation')
    return
  }

  const client = new Anthropic()
  const totalVotes = totals.reduce((a, b) => a + b, 0)
  const distribution = options
    .map((opt, i) => {
      const pct = totalVotes > 0 ? Math.round(((totals[i] ?? 0) / totalVotes) * 100) : 0
      return `"${opt}": ${totals[i] ?? 0} votes (${pct}%)`
    })
    .join(', ')

  const userMessage = `Poll question: "${question}"\nResults: ${distribution}\nTotal votes: ${totalVotes}`

  let insightText = ''
  const stream = client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system: INSIGHT_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  try {
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        insightText += chunk.delta.text
      }
    }
  } finally {
    if (insightText.trim()) {
      await prisma.pollInsight.upsert({
        where: { pollId },
        create: { pollId, insightText },
        update: { insightText },
      })
      publishToRoom(roomId, {
        type: 'poll_insight_ready',
        data: { pollId, insightText },
      })
    }
  }
}
