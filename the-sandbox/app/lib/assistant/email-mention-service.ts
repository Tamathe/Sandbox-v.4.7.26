/**
 * email-mention-service.ts
 *
 * Scans email bodies for the user's name (not in To/CC — in the body text)
 * and classifies intent: ACTION_REQUESTED, QUESTION, RECOGNITION, FYI_MENTION.
 * Phase 1: Regex + keyword classification. Phase 2: Haiku for ambiguous cases.
 */

export type { MentionType, EmailMention } from './types'
import type { MentionType, EmailMention } from './types'

interface EmailRecord {
  id: string
  fromName: string
  fromAddress: string
  subject: string
  body: string
  receivedAt: Date
}

interface UserName {
  first: string
  last: string
  full: string
  aliases?: string[]
}

/**
 * Build regex pattern that matches any variant of the user's name.
 * Looks for word boundaries to avoid partial matches.
 */
function buildNamePattern(name: UserName): RegExp {
  const variants = [
    name.full,
    name.first,
    name.last,
    ...(name.aliases ?? []),
  ].filter(Boolean).map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  // Sort by length descending so longer matches are preferred
  variants.sort((a, b) => b.length - a.length)

  return new RegExp(`\\b(${variants.join('|')})\\b`, 'gi')
}

/**
 * Extract the 2 sentences surrounding the name mention.
 */
function extractExcerpt(body: string, matchIndex: number): string {
  // Split into sentences (rough approximation)
  const sentences = body.split(/(?<=[.!?])\s+/)
  let charCount = 0

  for (let i = 0; i < sentences.length; i++) {
    const sentenceStart = charCount
    const sentenceEnd = charCount + sentences[i].length
    charCount = sentenceEnd + 1 // +1 for the space

    if (matchIndex >= sentenceStart && matchIndex < sentenceEnd) {
      // Return this sentence and the next one
      const start = Math.max(0, i - 1)
      const end = Math.min(sentences.length, i + 2)
      return sentences.slice(start, end).join(' ').trim()
    }
  }

  // Fallback: 200 chars around the match
  const start = Math.max(0, matchIndex - 100)
  const end = Math.min(body.length, matchIndex + 100)
  return body.slice(start, end).trim()
}

/**
 * Classify the mention type based on surrounding keywords.
 */
function classifyMention(excerpt: string): { type: MentionType; confidence: number; suggestedAction: string | null } {
  const lower = excerpt.toLowerCase()

  // ACTION keywords (strongest signal)
  const actionPatterns = [
    /can you\b/i, /could you\b/i, /would you\b/i, /please\b/i,
    /need you to\b/i, /your turn\b/i, /assigned to\b/i,
    /action required/i, /follow up with/i, /take care of/i,
    /send (?:me|us|them)/i, /draft (?:a|the)/i, /review (?:and|the)/i,
    /update (?:me|us|the)/i, /schedule\b/i, /prepare\b/i,
  ]
  const actionScore = actionPatterns.filter(p => p.test(excerpt)).length

  // QUESTION keywords
  const questionPatterns = [
    /\bhas \w+ (?:reviewed|approved|completed|submitted|responded)/i,
    /\bdid \w+ (?:send|review|approve|complete)/i,
    /\bwill \w+ (?:be|attend|join|send|handle)/i,
    /\?/,
  ]
  const questionScore = questionPatterns.filter(p => p.test(excerpt)).length

  // RECOGNITION keywords
  const recognitionPatterns = [
    /great work/i, /thanks to/i, /kudos/i, /shout.?out/i,
    /excellent job/i, /well done/i, /appreciate/i,
    /recognition/i, /congrat/i, /award/i,
  ]
  const recognitionScore = recognitionPatterns.filter(p => p.test(excerpt)).length

  // Determine type
  if (actionScore >= 2) return { type: 'ACTION_REQUESTED', confidence: 0.9, suggestedAction: 'Review and respond' }
  if (actionScore >= 1) return { type: 'ACTION_REQUESTED', confidence: 0.7, suggestedAction: 'Review and respond' }
  if (questionScore >= 2) return { type: 'QUESTION', confidence: 0.85, suggestedAction: 'Reply with status' }
  if (questionScore >= 1 && lower.includes('?')) return { type: 'QUESTION', confidence: 0.75, suggestedAction: 'Reply with answer' }
  if (recognitionScore >= 1) return { type: 'RECOGNITION', confidence: 0.8, suggestedAction: null }

  return { type: 'FYI_MENTION', confidence: 0.5, suggestedAction: null }
}

/**
 * Scan a batch of emails for mentions of the user's name in the body text.
 * Returns only emails where the user is mentioned by name (not just in To/CC).
 */
export function scanForMentions(
  emails: EmailRecord[],
  userName: UserName,
): EmailMention[] {
  const namePattern = buildNamePattern(userName)
  const mentions: EmailMention[] = []

  for (const email of emails) {
    // Skip if the email is FROM the user (they're mentioning themselves)
    if (email.fromAddress.toLowerCase().includes(userName.last.toLowerCase())) continue

    // Reset regex lastIndex
    namePattern.lastIndex = 0
    const match = namePattern.exec(email.body)

    if (match) {
      const excerpt = extractExcerpt(email.body, match.index)
      const classification = classifyMention(excerpt)

      mentions.push({
        emailId: email.id,
        from: email.fromName,
        fromAddress: email.fromAddress,
        subject: email.subject,
        mentionType: classification.type,
        excerpt,
        confidence: classification.confidence,
        suggestedAction: classification.suggestedAction,
        receivedAt: email.receivedAt,
      })
    }
  }

  // Sort: ACTION_REQUESTED first, then QUESTION, then RECOGNITION, then FYI
  const priority: Record<MentionType, number> = {
    ACTION_REQUESTED: 0,
    QUESTION: 1,
    RECOGNITION: 2,
    FYI_MENTION: 3,
  }
  mentions.sort((a, b) => priority[a.mentionType] - priority[b.mentionType])

  return mentions
}

/**
 * Get mention summary for briefing integration.
 */
export type { MentionSummary } from './types'
import type { MentionSummary } from './types'

export function getMentionSummary(mentions: EmailMention[]): MentionSummary {
  return {
    total: mentions.length,
    actionRequired: mentions.filter(m => m.mentionType === 'ACTION_REQUESTED').length,
    questions: mentions.filter(m => m.mentionType === 'QUESTION').length,
    recognitions: mentions.filter(m => m.mentionType === 'RECOGNITION').length,
    topMentions: mentions.filter(m => m.mentionType === 'ACTION_REQUESTED' || m.mentionType === 'QUESTION').slice(0, 5),
  }
}
