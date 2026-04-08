// ─── Email Tone Matching Service ─────────────────────────────
// Fetches the user's writing style baseline + recent approved drafts
// so Sandy can automatically match their established tone when drafting.
// No user interaction needed — tone consistency is built into the draft.

import { prisma } from '../prisma'

/**
 * Build a tone instruction string for injection into the draft system prompt.
 * Returns empty string if no baseline exists. Fast — no LLM call, just two DB queries.
 */
export async function getToneInstruction(userId: string): Promise<string> {
  const [baselineMemory, recentDrafts] = await Promise.all([
    prisma.userMemory.findFirst({
      where: { userId, category: 'WRITING_STYLE' },
      orderBy: { updatedAt: 'desc' },
      select: { content: true },
    }),
    prisma.assistantEmailDraft.findMany({
      where: { userId, status: 'approved' },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { body: true },
    }),
  ])

  const writingStyle = baselineMemory?.content ?? null
  const excerpts = recentDrafts.map(d => d.body.slice(0, 250))

  if (!writingStyle && excerpts.length === 0) return ''

  const parts: string[] = []

  if (writingStyle) {
    parts.push(`The user's established writing style: ${writingStyle}`)
  }

  if (excerpts.length > 0) {
    parts.push(
      `Here are excerpts from their recent approved emails — match this tone and voice:\n${excerpts.map((e, i) => `Example ${i + 1}: "${e}"`).join('\n')}`
    )
  }

  parts.push('Write the draft in the same tone, voice, and level of formality as the examples above. Do not deviate toward more formal or more casual unless the user explicitly asks.')

  return parts.join('\n\n')
}
