// ─── Email Rule Learner ─────────────────────────────────────
// Sprint 3 of Email × Sandy Intelligence Layer.
// Mines draft approval/discard patterns to propose email rules.
// After N approved drafts with similar characteristics, Sandy
// suggests codifying the pattern as an AssistantRule.

import { prisma } from '../prisma'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

// ─── Types ──────────────────────────────────────────────────

export type { DraftPattern } from './types'
import type { DraftPattern } from './types'

// Minimum drafts per category before we analyze patterns
const MIN_DRAFTS_FOR_ANALYSIS = 5
// Minimum approval rate to propose a rule
const MIN_APPROVAL_RATE = 0.7

// ─── Pattern Analysis ───────────────────────────────────────

/**
 * Analyze a user's draft history to find consistent approval patterns.
 * Groups drafts by the original email's category, then for categories
 * with enough data and high approval rate, extracts tone patterns via Haiku.
 */
export async function analyzeDraftPatterns(userId: string): Promise<DraftPattern[]> {
  // 1. Fetch all resolved drafts with their parent email category
  const drafts = await prisma.assistantEmailDraft.findMany({
    where: {
      userId,
      status: { in: ['approved', 'discarded'] },
    },
    include: {
      email: { select: { category: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (drafts.length === 0) return []

  // 2. Group by email category
  const groups = new Map<string, { approved: string[]; total: number }>()
  for (const draft of drafts) {
    const cat = draft.email.category ?? 'uncategorized'
    const existing = groups.get(cat) ?? { approved: [], total: 0 }
    existing.total++
    if (draft.status === 'approved') {
      existing.approved.push(draft.body)
    }
    groups.set(cat, existing)
  }

  // 3. Analyze categories with enough data
  const patterns: DraftPattern[] = []

  for (const [category, data] of groups) {
    if (data.total < MIN_DRAFTS_FOR_ANALYSIS) continue

    const approvalRate = data.approved.length / data.total
    if (approvalRate < MIN_APPROVAL_RATE) continue

    // 4. Extract tone patterns from approved drafts via Haiku
    const sampleDrafts = data.approved.slice(0, 8) // cap to control token usage
    const toneAnalysis = await extractTonePatterns(category, sampleDrafts)

    patterns.push({
      category,
      commonTone: toneAnalysis.tone,
      approvalRate,
      sampleCount: data.total,
      proposedRule: toneAnalysis.proposedRule,
      confidence: calculateConfidence(approvalRate, data.total),
    })
  }

  return patterns.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Check if there are actionable rule suggestions for a user.
 * Lighter-weight than full analysis — just checks counts first.
 */
export async function hasNewPatterns(userId: string): Promise<boolean> {
  // Check if user has 5+ resolved drafts in any category
  const counts = await prisma.$queryRawUnsafe<{ category: string; cnt: bigint }[]>(
    `SELECT e.category, COUNT(d.id)::bigint as cnt
     FROM "AssistantEmailDraft" d
     JOIN "AssistantEmail" e ON d."emailId" = e.id
     WHERE d."userId" = $1 AND d.status IN ('approved', 'discarded')
     GROUP BY e.category
     HAVING COUNT(d.id) >= $2`,
    userId,
    MIN_DRAFTS_FOR_ANALYSIS,
  )

  if (counts.length === 0) return false

  // Check if user already has rules for these categories
  const existingRules = await prisma.assistantRule.findMany({
    where: { userId, ruleType: 'email-auto-draft', isActive: true },
    select: { structured: true },
  })

  const coveredCategories = new Set(
    existingRules
      .map((r) => {
        const structured = r.structured as Record<string, unknown>
        return (structured.learnedFromCategory as string) ?? null
      })
      .filter(Boolean),
  )

  // If any qualifying category doesn't have a learned rule yet
  return counts.some((c) => !coveredCategories.has(c.category ?? 'uncategorized'))
}

/**
 * Create an AssistantRule from a learned pattern.
 * Stores the pattern origin in the structured field so we don't
 * re-suggest the same pattern.
 */
export async function saveLearnedRule(
  userId: string,
  pattern: DraftPattern,
): Promise<{ id: string; naturalText: string }> {
  const rule = await prisma.assistantRule.create({
    data: {
      userId,
      naturalText: pattern.proposedRule,
      ruleType: 'email-auto-draft',
      structured: {
        type: 'email-trigger',
        triggerPattern: `category:${pattern.category}`,
        responseTemplate: pattern.commonTone,
        description: pattern.proposedRule,
        learnedFromCategory: pattern.category,
        learnedAt: new Date().toISOString(),
        approvalRate: pattern.approvalRate,
        sampleCount: pattern.sampleCount,
      },
      isActive: true,
    },
  })

  return { id: rule.id, naturalText: rule.naturalText }
}

// ─── Helpers ────────────────────────────────────────────────

async function extractTonePatterns(
  category: string,
  approvedDrafts: string[],
): Promise<{ tone: string; proposedRule: string }> {
  const samples = approvedDrafts
    .map((d, i) => `--- Draft ${i + 1} ---\n${d.slice(0, 400)}`)
    .join('\n\n')

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: `You analyze email drafts to find consistent tone/style patterns. Return ONLY valid JSON, no markdown fences.

Output schema:
{
  "tone": "2-5 word tone description (e.g. 'warm, includes next steps')",
  "proposedRule": "One natural language sentence describing the email rule. Start with 'When replying to...' Format: 'When replying to [category] emails, [specific style guidance]'"
}`,
    messages: [{
      role: 'user',
      content: `These ${approvedDrafts.length} drafts were approved for "${category}" emails. What tone/style pattern do they share?\n\n${samples}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  try {
    const parsed = JSON.parse(text)
    return {
      tone: parsed.tone ?? 'professional',
      proposedRule: parsed.proposedRule ?? `When replying to ${category} emails, maintain a consistent professional tone.`,
    }
  } catch {
    return {
      tone: 'professional',
      proposedRule: `When replying to ${category} emails, maintain a consistent professional tone.`,
    }
  }
}

function calculateConfidence(approvalRate: number, sampleCount: number): number {
  // More data + higher approval rate = higher confidence
  // Sigmoid-like curve: 5 drafts at 70% → ~0.5, 10 drafts at 90% → ~0.85
  const dataFactor = Math.min(sampleCount / 15, 1) // caps at 15 drafts
  const rateFactor = (approvalRate - MIN_APPROVAL_RATE) / (1 - MIN_APPROVAL_RATE)
  return Math.round((dataFactor * 0.4 + rateFactor * 0.6) * 100) / 100
}
