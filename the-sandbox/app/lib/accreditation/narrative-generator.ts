import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import type { NarrativeGenerationInput } from './types'

const anthropic = new Anthropic()

/** Generate or regenerate a compliance narrative for a standard */
export async function generateNarrative(input: NarrativeGenerationInput): Promise<{
  content: string
  confidenceScore: number
  evidenceUsed: string[]
}> {
  const standard = await prisma.accreditationStandard.findUnique({
    where: { id: input.standardId },
  })
  if (!standard) throw new Error('Standard not found')

  const evidenceSummary = input.evidence.map(e =>
    `- **${e.title}** (${e.quality}): ${e.description}`
  ).join('\n')

  const gapSummary = input.gaps.length > 0
    ? `\n\n## Known Gaps\n${input.gaps.map(g => `- ${g.title} (${g.severity})`).join('\n')}`
    : ''

  const previousContext = input.previousNarrative
    ? `\n\n## Previous Narrative (for reference — improve, don't copy)\n${input.previousNarrative.slice(0, 2000)}`
    : ''

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `You are writing a SACSCOC accreditation compliance narrative for a university. Write a clear, evidence-based narrative that demonstrates compliance with the given standard.

## Standard
**${standard.standardNumber}: ${standard.standardTitle}**
${standard.description}

## Collected Evidence
${evidenceSummary}
${gapSummary}
${previousContext}

## Instructions
1. Write a 2-4 paragraph narrative in formal academic prose
2. Reference specific evidence by title
3. Use quantitative data from evidence descriptions where available
4. If gaps exist, acknowledge them and describe remediation plans
5. Focus on continuous improvement — SACSCOC values process over perfection
6. End with a forward-looking statement about ongoing evidence collection

## Format
Return ONLY the narrative text. No headers, no metadata. Write as if this will be inserted directly into the self-study report.

Also include a confidence line at the very end in this format:
<!--CONFIDENCE:0.X-->
where 0.X is your confidence (0.0-1.0) that this narrative would satisfy a peer reviewer.`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  const confidenceMatch = text.match(/<!--CONFIDENCE:([\d.]+)-->/)
  const confidenceScore = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5
  const content = text.replace(/<!--CONFIDENCE:[\d.]+-->/, '').trim()

  return {
    content,
    confidenceScore,
    evidenceUsed: input.evidence.map(e => e.title),
  }
}

/** Generate and persist a narrative draft */
export async function generateAndSaveNarrative(standardId: string, cycleId: string) {
  const evidence = await prisma.accreditationEvidence.findMany({
    where: { standardId, cycleId },
    orderBy: { qualityScore: 'desc' },
  })

  const gaps = await prisma.complianceGap.findMany({
    where: { standardId, cycleId, remediationStatus: { not: 'resolved' } },
  })

  const existing = await prisma.complianceNarrative.findFirst({
    where: { standardId, cycleId },
    orderBy: { version: 'desc' },
  })

  const result = await generateNarrative({
    standardId,
    cycleId,
    evidence: evidence.map(e => ({
      title: e.title,
      description: e.description,
      dataSnapshot: (e.dataSnapshot as Record<string, unknown>) ?? {},
      quality: e.quality,
      semesterCode: e.semesterCode,
    })),
    gaps: gaps.map(g => ({ title: g.title, severity: g.severity })),
    previousNarrative: existing?.draftContent ?? null,
  })

  const newVersion = (existing?.version ?? 0) + 1

  await prisma.complianceNarrative.create({
    data: {
      standardId,
      cycleId,
      status: 'AI_DRAFT',
      draftContent: result.content,
      version: newVersion,
      aiModel: 'claude-sonnet-4-6',
      evidenceUsed: result.evidenceUsed,
      confidenceScore: result.confidenceScore,
      generatedAt: new Date(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      versionHistory: [
        ...((existing?.versionHistory as any[] | null) ?? []),
        { version: newVersion, content: result.content, author: 'ai' as const, timestamp: new Date().toISOString() },
      ] as any,
    },
  })

  return { version: newVersion, confidenceScore: result.confidenceScore }
}
