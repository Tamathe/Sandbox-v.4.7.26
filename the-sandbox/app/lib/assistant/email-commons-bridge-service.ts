// ─── Email ↔ Commons Bridge Service ───────────────────────
// Detects stalling email threads and suggests starting a Commons session.
// Uses Sprint 8's thread summary when available to avoid extra LLM calls.

import { prisma } from '../prisma'
import { getThread } from './email-service'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export type { ThreadStallSignal } from './types'
import type { ThreadStallSignal } from './types'

const NO_STALL: ThreadStallSignal = {
  threadId: '',
  participantCount: 0,
  messageCount: 0,
  isCircular: false,
  isDecisionBlocked: false,
  suggestedRoomType: null,
  suggestedTopic: '',
  suggestion: '',
}

export async function detectThreadStall(
  userId: string,
  threadId: string
): Promise<ThreadStallSignal> {
  // 1. Fetch thread
  const emails = await getThread(userId, threadId)
  if (emails.length < 4) {
    return { ...NO_STALL, threadId, messageCount: emails.length }
  }

  // 2. Count unique participants
  const participants = new Set<string>()
  for (const e of emails) {
    participants.add(e.fromAddress)
    for (const addr of e.toAddresses) participants.add(addr)
  }
  if (participants.size < 3) {
    return { ...NO_STALL, threadId, messageCount: emails.length, participantCount: participants.size }
  }

  // 3. Check if Sprint 8 cached summary exists — use it to avoid extra Haiku call
  const cachedSummary = await prisma.assistantThreadSummary.findUnique({
    where: { userId_threadId: { userId, threadId } },
  })

  // 4. Build thread text for analysis
  const threadText = emails
    .map((e, i) => `[${i + 1}] ${e.fromName}: ${e.subject}\n${e.body.slice(0, 200)}`)
    .join('\n---\n')

  const summaryHint = cachedSummary
    ? `\nExisting thread summary: "${cachedSummary.summary}"\nKey decisions: ${cachedSummary.keyDecisions.join('; ') || 'none'}\nNeeds response: ${cachedSummary.needsResponse}`
    : ''

  // 5. Use Haiku to detect stall
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: 'You analyze email threads for productivity. Respond in valid JSON only, no markdown fences.',
      messages: [{
        role: 'user',
        content: `This email thread has ${emails.length} messages and ${participants.size} participants.
${summaryHint}

Thread:
${threadText}

Is this thread productive or stalling? Are the same points being repeated? Is a decision blocked?
If stalling, suggest a Commons session type:
- Academic discussion → "TEACHBACK"
- Study group coordination → "STUDY"
- Quiz/exam prep → "CHALLENGE"
- Not applicable → null

Respond as JSON:
{"isCircular": true/false, "isDecisionBlocked": true/false, "suggestedRoomType": "STUDY"|"CHALLENGE"|"TEACHBACK"|null, "suggestedTopic": "short topic for the room", "suggestion": "one sentence explaining why a live room would help, or empty if not stalling"}`,
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    let parsed: {
      isCircular?: boolean
      isDecisionBlocked?: boolean
      suggestedRoomType?: string | null
      suggestedTopic?: string
      suggestion?: string
    }
    try {
      parsed = JSON.parse(text)
    } catch {
      return { ...NO_STALL, threadId, messageCount: emails.length, participantCount: participants.size }
    }

    const isStalling = parsed.isCircular || parsed.isDecisionBlocked
    const roomType = ['CHALLENGE', 'STUDY', 'TEACHBACK'].includes(parsed.suggestedRoomType ?? '')
      ? parsed.suggestedRoomType as 'CHALLENGE' | 'STUDY' | 'TEACHBACK'
      : null

    return {
      threadId,
      participantCount: participants.size,
      messageCount: emails.length,
      isCircular: parsed.isCircular ?? false,
      isDecisionBlocked: parsed.isDecisionBlocked ?? false,
      suggestedRoomType: isStalling ? roomType : null,
      suggestedTopic: parsed.suggestedTopic ?? emails[0].subject,
      suggestion: isStalling
        ? (parsed.suggestion || `This thread has ${participants.size} people and ${emails.length} messages — a live room could help resolve this faster.`)
        : '',
    }
  } catch {
    return { ...NO_STALL, threadId, messageCount: emails.length, participantCount: participants.size }
  }
}
