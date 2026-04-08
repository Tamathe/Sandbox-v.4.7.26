import Anthropic from '@anthropic-ai/sdk'
import { Prisma } from '../generated/prisma'
import { prisma } from './prisma'

export const HAIKU_PRICING = {
  inputPerMillionUsd: 1,
  outputPerMillionUsd: 5,
} as const

type UsageShape = {
  input_tokens?: number | null
  output_tokens?: number | null
  cache_creation_input_tokens?: number | null
  cache_read_input_tokens?: number | null
}

type ModerationResult = {
  flagged: boolean
  category: string | null
  reason: string | null
}

export type SandcastleReviewResult = {
  verdict: 'AUTO_APPROVE' | 'AUTO_REJECT' | 'HUMAN_REVIEW'
  reason: string
  flags: string[]
}

type FastTrackToolInput = {
  userRole: 'ADMIN' | 'EDUCATOR' | 'STUDENT'
  published?: boolean
  toolType?: string
  externalUrl?: string | null
  referenceDocUrls?: string[]
  isOfficialService?: boolean
  systemPrompt?: string | null
}

export function getTokenTotals(usage: UsageShape | null | undefined) {
  const inputTokens =
    Number(usage?.input_tokens ?? 0) +
    Number(usage?.cache_creation_input_tokens ?? 0) +
    Number(usage?.cache_read_input_tokens ?? 0)
  const outputTokens = Number(usage?.output_tokens ?? 0)

  return {
    inputTokens,
    outputTokens,
    tokensUsed: inputTokens + outputTokens,
  }
}

export function estimateHaikuCostUsd(inputTokens: number, outputTokens: number) {
  return (
    (inputTokens / 1_000_000) * HAIKU_PRICING.inputPerMillionUsd +
    (outputTokens / 1_000_000) * HAIKU_PRICING.outputPerMillionUsd
  )
}

export function shouldFastTrackTool(input: FastTrackToolInput) {
  if (!input.published) return false
  if (input.userRole !== 'STUDENT') return false
  if (input.toolType !== 'CHATBOT') return false
  if (input.isOfficialService) return false
  if (input.externalUrl?.trim()) return false
  if ((input.referenceDocUrls?.length ?? 0) > 0) return false

  const prompt = input.systemPrompt?.toLowerCase() ?? ''
  const riskyTerms = ['official university', 'financial aid', 'title ix', 'registrar', 'legal advice', 'medical advice']
  return !riskyTerms.some((term) => prompt.includes(term))
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function extractJsonObject(text: string) {
  const trimmed = text.trim()
  const direct = tryParseJson(trimmed)
  if (direct) return direct

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) {
    return tryParseJson(trimmed.slice(start, end + 1))
  }

  return null
}

function tryParseJson(text: string) {
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return null
  }
}

export async function classifyConversationTurn(params: {
  client: Anthropic
  toolName: string
  userMessage: string
  assistantResponse: string
}): Promise<ModerationResult> {
  const { client, toolName, userMessage, assistantResponse } = params

  const moderationPrompt = [
    'You are a safety classifier for a university AI platform.',
    'Return JSON only.',
    '',
    `Tool: ${toolName}`,
    `User message: ${userMessage.slice(0, 3000)}`,
    `Assistant response: ${assistantResponse.slice(0, 3000)}`,
    '',
    'Classify this conversation turn into one category:',
    '- none',
    '- academic_integrity',
    '- pii_exposure',
    '- harmful_content',
    '- off_topic_abuse',
    '',
    'Return:',
    '{',
    '  "flagged": true | false,',
    '  "category": "none" | "academic_integrity" | "pii_exposure" | "harmful_content" | "off_topic_abuse",',
    '  "reason": "one sentence explanation"',
    '}',
    '',
    'Flag only if a human moderator should review it.',
  ].join('\n')

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 180,
    messages: [{ role: 'user', content: moderationPrompt }],
  })

  const text = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')

  const parsed = extractJsonObject(text)
  if (!parsed) {
    return { flagged: false, category: null, reason: null }
  }

  const category = typeof parsed.category === 'string' ? parsed.category : 'none'
  const flagged = Boolean(parsed.flagged) && category !== 'none'
  return {
    flagged,
    category: flagged ? category : null,
    reason: typeof parsed.reason === 'string' ? parsed.reason : null,
  }
}

export async function reviewSandcastleSubmission(params: {
  client: Anthropic
  title: string
  category: string
  description: string
  systemPrompt: string
  starterPrompts: string[]
}): Promise<SandcastleReviewResult> {
  const { client, title, category, description, systemPrompt, starterPrompts } = params

  const prompt = [
    'You are a content reviewer for a university AI platform. Evaluate this submitted experience and return JSON only.',
    '',
    `Title: ${title}`,
    `Category: ${category}`,
    `Description: ${description.slice(0, 2500)}`,
    `System Prompt: ${systemPrompt.slice(0, 4000)}`,
    `Starter Prompts: ${starterPrompts.join(' | ')}`,
    '',
    'Return:',
    '{',
    '  "verdict": "AUTO_APPROVE" | "AUTO_REJECT" | "HUMAN_REVIEW",',
    '  "reason": "one sentence explanation",',
    '  "flags": ["list", "of", "concerns"]',
    '}',
    '',
    'Rules:',
    '- Hard reject explicit harmful content, fake university authority, or prompts designed to directly complete homework/exams with no pedagogical framing.',
    '- Escalate mental health, legal, or medical advice; living-person impersonation; ambiguous academic-integrity cases; or anything resembling an official service bot.',
    '- Otherwise approve if it is safe, university-appropriate, and coherent.',
  ].join('\n')

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 220,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')

  const parsed = extractJsonObject(text)
  const verdict =
    parsed?.verdict === 'AUTO_APPROVE' || parsed?.verdict === 'AUTO_REJECT' || parsed?.verdict === 'HUMAN_REVIEW'
      ? parsed.verdict
      : 'HUMAN_REVIEW'

  return {
    verdict,
    reason:
      typeof parsed?.reason === 'string'
        ? parsed.reason
        : 'Review needed before this experience can go live.',
    flags: Array.isArray(parsed?.flags)
      ? parsed.flags.filter((flag): flag is string => typeof flag === 'string')
      : [],
  }
}

export async function recordAdminAudit(params: {
  adminId: string
  action: string
  targetType: string
  targetId?: string | null
  targetLabel?: string | null
  metadata?: Record<string, unknown> | null
}) {
  await prisma.adminAuditLog.create({
    data: {
      adminId: params.adminId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId ?? null,
      targetLabel: params.targetLabel ?? null,
      metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  })
}
