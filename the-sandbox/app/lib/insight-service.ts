// Class Intelligence — semantic clustering of student messages for educator tool insights.
// Uses Claude Sonnet (claude-sonnet-4-6) for semantic analysis; Haiku lacks sufficient
// reasoning depth for accurate misconception identification.

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'

const anthropic = new Anthropic()

export interface ToolInsight {
  topQuestions:   { question: string; count: number }[]
  misconceptions: { topic: string; frequency: string }[]
  avgMessageCount: number
  completionRate:  number   // sessions with score > 0.5 / total sessions
  totalSessions:   number
  generatedAt:     Date
}

/**
 * Generate class-wide insights for a tool.
 *
 * @param toolId   - The tool to analyse.
 * @param courseId - Optional: restrict to sessions from one course.
 * @param since    - Only consider sessions that started on or after this date.
 */
export async function generateToolInsights(
  toolId: string,
  courseId: string | null,
  since: Date,
): Promise<ToolInsight> {
  // ── 1. Fetch matching sessions ─────────────────────────────────────────────
  const sessions = await prisma.toolSession.findMany({
    where: {
      toolId,
      ...(courseId ? { courseId } : {}),
      startedAt: { gte: since },
      sensitiveSession: false,          // FERPA: exclude flagged sessions
    },
    select: {
      score:        true,
      messageCount: true,
      chatMessages: {
        where:   { role: 'user' },
        select:  { content: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  const totalSessions = sessions.length

  // Return an empty result when there is no data to analyse
  if (totalSessions === 0) {
    return {
      topQuestions:    [],
      misconceptions:  [],
      avgMessageCount: 0,
      completionRate:  0,
      totalSessions:   0,
      generatedAt:     new Date(),
    }
  }

  // ── 2. Compute numeric stats ───────────────────────────────────────────────
  const totalMessages    = sessions.reduce((sum, s) => sum + s.messageCount, 0)
  const avgMessageCount  = Math.round(totalMessages / totalSessions)

  const scoredSessions   = sessions.filter((s) => s.score !== null)
  const completionRate   = scoredSessions.length > 0
    ? scoredSessions.filter((s) => (s.score ?? 0) > 0.5).length / scoredSessions.length
    : 0

  // ── 3. Collect up to 200 user messages (token budget guard) ───────────────
  const allMessages: string[] = []
  outer:
  for (const session of sessions) {
    for (const msg of session.chatMessages) {
      allMessages.push(msg.content.slice(0, 300))   // truncate very long messages
      if (allMessages.length >= 200) break outer
    }
  }

  // ── 4. Call Claude Sonnet for semantic clustering ─────────────────────────
  const prompt = `You are an educational data analyst. Below are up to ${allMessages.length} student messages sent to an AI learning tool. Analyse them and return a JSON summary.

Return ONLY valid JSON — no markdown, no commentary — in exactly this shape:
{
  "topQuestions": [
    { "question": "<concise label for the topic>", "count": <approximate number of students who asked about this> }
  ],
  "misconceptions": [
    { "topic": "<brief label>", "frequency": "high" | "medium" | "low" }
  ]
}

Rules:
- topQuestions: up to 5 entries, ordered by frequency descending.
- misconceptions: up to 3 entries where students showed confused or incorrect understanding.
- If fewer patterns exist, return fewer entries; never pad with invented data.
- counts are estimates based on how many of the ${totalSessions} sessions touched that topic.

Student messages:
${allMessages.map((m, i) => `[${i + 1}] ${m}`).join('\n')}`

  let topQuestions:   ToolInsight['topQuestions']   = []
  let misconceptions: ToolInsight['misconceptions'] = []

  try {
    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1024,
      messages:   [{ role: 'user', content: prompt }],
    })

    const raw       = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed   = JSON.parse(jsonMatch[0]) as Partial<ToolInsight>
      topQuestions   = (parsed.topQuestions   ?? []).slice(0, 5)
      misconceptions = (parsed.misconceptions ?? []).slice(0, 3)
    }
  } catch {
    // Non-fatal — return stats-only result rather than crashing the route
  }

  return {
    topQuestions,
    misconceptions,
    avgMessageCount,
    completionRate,
    totalSessions,
    generatedAt: new Date(),
  }
}
