// ─── Rules Service ───────────────────────────────────────────
// Parse natural language rules via Haiku → structured JSON.
// Evaluate active rules for scheduling/email contexts.

import { prisma } from '../prisma'
import Anthropic from '@anthropic-ai/sdk'
import type { AssistantRule } from '../../generated/prisma'

const anthropic = new Anthropic()

// ─── Types ───────────────────────────────────────────────────

export type { ParsedRule, ActiveRule } from './types'
import type { ParsedRule, ActiveRule } from './types'

// ─── Parse Natural Language → Structured Rule ────────────────

export async function parseRule(input: {
  userId: string
  naturalText: string
}): Promise<AssistantRule> {
  const parsed = await parseNaturalLanguage(input.naturalText)

  return prisma.assistantRule.create({
    data: {
      userId: input.userId,
      naturalText: input.naturalText,
      ruleType: parsed.ruleType,
      structured: parsed.structured as object,
      isActive: true,
      expiresAt: parsed.expiresAt ?? null,
    },
  })
}

async function parseNaturalLanguage(text: string): Promise<ParsedRule> {
  const today = new Date().toISOString().split('T')[0]

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: `You parse natural language scheduling/email rules into structured JSON.
Today's date is ${today}. Return ONLY valid JSON, no markdown fences.

Output schema:
{
  "ruleType": "calendar-block" | "calendar-preference" | "email-auto-draft" | "reminder" | "scheduling-constraint",
  "structured": {
    "type": "recurring-block" | "one-time-block" | "time-constraint" | "recurring-slot" | "email-trigger",
    "dayOfWeek"?: number (1=Mon...7=Sun),
    "daysOfWeek"?: number[],
    "date"?: "YYYY-MM-DD" (for one-time),
    "startTime"?: "HH:MM",
    "endTime"?: "HH:MM",
    "beforeHour"?: number,
    "afterHour"?: number,
    "recurrence"?: "daily" | "weekly" | "once",
    "maxPerDay"?: number,
    "triggerPattern"?: string (for email rules),
    "responseTemplate"?: string (for email rules),
    "description": string
  },
  "expiresAt"?: "YYYY-MM-DDTHH:MM:SSZ" (only for one-time rules, day after the event)
}`,
    messages: [{ role: 'user', content: text }],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Haiku')
  }

  try {
    const parsed = JSON.parse(content.text)
    return {
      ruleType: parsed.ruleType,
      structured: parsed.structured,
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined,
    }
  } catch {
    // Fallback: store as generic constraint
    return {
      ruleType: 'scheduling-constraint',
      structured: { type: 'time-constraint', description: text },
    }
  }
}

// ─── Evaluate Active Rules ───────────────────────────────────

export async function evaluateRules(
  userId: string,
  context: 'scheduling' | 'email'
): Promise<ActiveRule[]> {
  const now = new Date()
  const rules = await prisma.assistantRule.findMany({
    where: {
      userId,
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    orderBy: { createdAt: 'asc' },
  })

  const contextTypes: Record<string, string[]> = {
    scheduling: ['calendar-block', 'calendar-preference', 'scheduling-constraint'],
    email: ['email-auto-draft'],
  }

  const allowed = contextTypes[context] ?? []
  return rules
    .filter(r => allowed.includes(r.ruleType))
    .map(r => ({
      id: r.id,
      naturalText: r.naturalText,
      ruleType: r.ruleType,
      structured: r.structured as Record<string, unknown>,
    }))
}

// ─── CRUD Helpers ────────────────────────────────────────────

export async function getUserRules(userId: string): Promise<AssistantRule[]> {
  return prisma.assistantRule.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function toggleRule(ruleId: string, isActive: boolean): Promise<AssistantRule> {
  return prisma.assistantRule.update({
    where: { id: ruleId },
    data: { isActive },
  })
}

export async function deleteRule(ruleId: string): Promise<void> {
  await prisma.assistantRule.delete({ where: { id: ruleId } })
}
