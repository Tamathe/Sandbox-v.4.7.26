// ─── Email Thread Summarization Service ──────────────────────
// Summarizes email threads via Haiku, caches results in DB.
// Cache is invalidated when new messages arrive in the thread.

import { prisma } from '../prisma'
import { getThread } from './email-service'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export type { ThreadSummary } from './types'
import type { ThreadSummary } from './types'

export async function summarizeThread(
  userId: string,
  threadId: string,
  forceRefresh?: boolean
): Promise<ThreadSummary> {
  // 1. Fetch all emails in thread
  const emails = await getThread(userId, threadId)
  if (emails.length === 0) {
    throw new Error('Thread not found or empty')
  }

  const lastActivity = emails[emails.length - 1].receivedAt
  const messageCount = emails.length

  // 2. Check cache — if summary exists and no new messages since cachedAt, return cached
  if (!forceRefresh) {
    const cached = await prisma.assistantThreadSummary.findUnique({
      where: { userId_threadId: { userId, threadId } },
    })
    if (cached && cached.lastActivity >= lastActivity) {
      return {
        threadId: cached.threadId,
        messageCount: cached.messageCount,
        summary: cached.summary,
        keyDecisions: cached.keyDecisions,
        lastActivity: cached.lastActivity,
        needsResponse: cached.needsResponse,
        cachedAt: cached.cachedAt,
      }
    }
  }

  // 3. Fetch user name for personalized summary
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  })
  const userName = user?.name ?? 'the user'

  // 4. Build prompt with full thread chronologically
  const threadText = emails
    .map((e, i) => `--- Message ${i + 1} ---\nFrom: ${e.fromName} <${e.fromAddress}>\nDate: ${e.receivedAt.toISOString()}\nSubject: ${e.subject}\n\n${e.body}`)
    .join('\n\n')

  // 5. Call Haiku for summarization
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: `You summarize email threads concisely. Respond in valid JSON only, no markdown fences.`,
    messages: [{
      role: 'user',
      content: `Summarize this email thread in 2-3 sentences. List any decisions made or action items as short bullet strings. Note if the last message requires a response from ${userName}.

${threadText}

Respond as JSON:
{"summary": "...", "keyDecisions": ["...", "..."], "needsResponse": true/false}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  let parsed: { summary?: string; keyDecisions?: string[]; needsResponse?: boolean }
  try {
    parsed = JSON.parse(text)
  } catch {
    parsed = { summary: text.slice(0, 500), keyDecisions: [], needsResponse: false }
  }

  const result: ThreadSummary = {
    threadId,
    messageCount,
    summary: parsed.summary ?? 'Unable to generate summary.',
    keyDecisions: parsed.keyDecisions ?? [],
    lastActivity,
    needsResponse: parsed.needsResponse ?? false,
    cachedAt: new Date(),
  }

  // 6. Upsert cache
  await prisma.assistantThreadSummary.upsert({
    where: { userId_threadId: { userId, threadId } },
    create: {
      userId,
      threadId,
      messageCount: result.messageCount,
      summary: result.summary,
      keyDecisions: result.keyDecisions,
      needsResponse: result.needsResponse,
      lastActivity: result.lastActivity,
      cachedAt: result.cachedAt,
    },
    update: {
      messageCount: result.messageCount,
      summary: result.summary,
      keyDecisions: result.keyDecisions,
      needsResponse: result.needsResponse,
      lastActivity: result.lastActivity,
      cachedAt: result.cachedAt,
    },
  })

  return result
}
