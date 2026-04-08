import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import type { PeerReviewQuestion } from './types'

const anthropic = new Anthropic()

/** Generate simulated peer reviewer questions based on current compliance state */
export async function generatePeerReviewQuestions(cycleId: string): Promise<PeerReviewQuestion[]> {
  const standards = await prisma.accreditationStandard.findMany({
    where: { isActive: true },
    include: {
      evidence: { where: { cycleId } },
      gaps: { where: { cycleId, remediationStatus: { not: 'resolved' } } },
      narratives: { where: { cycleId }, orderBy: { version: 'desc' }, take: 1 },
    },
  })

  const complianceSummary = standards.map(std => {
    const evidenceCount = std.evidence.length
    const avgQuality = evidenceCount > 0
      ? (std.evidence.reduce((sum, e) => sum + (e.qualityScore ?? 0), 0) / evidenceCount).toFixed(2)
      : '0.00'
    const gapCount = std.gaps.length
    const narrative = std.narratives[0]

    return `Standard ${std.standardNumber} (${std.standardTitle}): ${evidenceCount} evidence items (avg quality: ${avgQuality}), ${gapCount} gaps, narrative: ${narrative?.status ?? 'NOT_STARTED'}`
  }).join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `You are simulating a SACSCOC peer review team visiting the University of Kentucky. Based on the compliance data below, generate 8-12 questions that peer reviewers would likely ask. Focus on:
1. Standards with gaps or weak evidence (these get the most scrutiny)
2. Standards where the narrative is missing or only AI-drafted
3. Cross-cutting themes (assessment, faculty qualifications, student support)
4. Follow-up questions that probe deeper than surface compliance

## Compliance State
${complianceSummary}

For each question, return JSON array:
[{
  "standard": "8.2a",
  "question": "...",
  "difficulty": "routine|probing|critical",
  "context": "Why a reviewer would ask this",
  "suggestedResponse": "Key points to include in the response"
}]

Return ONLY the JSON array.`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  try {
    return JSON.parse(jsonMatch[0])
  } catch {
    return []
  }
}
