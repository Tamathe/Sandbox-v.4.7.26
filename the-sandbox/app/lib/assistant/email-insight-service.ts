// ─── Email Insight Service ──────────────────────────────────
// Generates proactive email insights for Sandy briefing + concierge.
// Sprint 1 of Email × Sandy Intelligence Layer.

import { getInboxSummary, getInbox } from './email-service'
import { scanForMentions, getMentionSummary } from './email-mention-service'
import { getStaleThreads } from './email-followup-service'
import { prisma } from '../prisma'
import type { Email } from './providers'

export type { EmailInsight } from './types'
import type { EmailInsight } from './types'

/**
 * Generate 1–3 email insights for the Sandy briefing card.
 * Priority: urgent unread → action-requested mentions → general unread summary.
 */
export async function generateEmailInsights(userId: string): Promise<EmailInsight[]> {
  const insights: EmailInsight[] = []

  // Fetch inbox summary + recent emails in parallel
  const [summary, recentEmails, user] = await Promise.all([
    getInboxSummary(userId).catch(() => null),
    getInbox(userId, { limit: 20 }).catch(() => [] as Email[]),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
  ])

  if (!summary && recentEmails.length === 0) return insights

  const unreadEmails = recentEmails.filter(e => !e.isRead)
  const unreadCount = summary?.unread ?? unreadEmails.length

  // 1. High urgency: urgent unread emails
  const urgentEmails = summary?.urgent ?? []
  if (urgentEmails.length > 0) {
    const topUrgent = urgentEmails[0]
    insights.push({
      type: 'email-action',
      icon: 'AlertCircle',
      title: urgentEmails.length === 1
        ? `Urgent email from ${topUrgent.fromName}`
        : `${urgentEmails.length} urgent emails need attention`,
      detail: urgentEmails.length === 1
        ? topUrgent.subject
        : urgentEmails.map(e => `${e.fromName}: ${e.subject}`).join('; '),
      actionType: 'sandy-message',
      actionLabel: 'Let Sandy triage',
      sandyMessage: 'Triage my urgent emails — what needs my attention right now?',
      urgency: 'high',
    })
  }

  // 2. Medium urgency: action-requested mentions
  if (user?.name && unreadEmails.length > 0) {
    const nameParts = user.name.split(' ')
    const userName = {
      first: nameParts[0] ?? '',
      last: nameParts[nameParts.length - 1] ?? '',
      full: user.name,
    }
    const mentions = scanForMentions(
      unreadEmails.map(e => ({
        id: e.id,
        fromName: e.fromName,
        fromAddress: e.fromAddress,
        subject: e.subject,
        body: e.body,
        receivedAt: e.receivedAt,
      })),
      userName,
    )
    const mentionSummary = getMentionSummary(mentions)

    if (mentionSummary.actionRequired > 0 || mentionSummary.questions > 0) {
      const actionCount = mentionSummary.actionRequired + mentionSummary.questions
      insights.push({
        type: 'email-action',
        icon: 'Mail',
        title: `${actionCount} email${actionCount !== 1 ? 's' : ''} mention you and need a response`,
        detail: mentionSummary.topMentions
          .slice(0, 3)
          .map(m => `${m.from}: ${m.subject}`)
          .join('; '),
        actionType: 'sandy-message',
        actionLabel: 'Draft responses',
        sandyMessage: 'Help me respond to the emails that mention me and need a reply.',
        urgency: 'medium',
      })
    }
  }

  // 2.5. Medium urgency: stale follow-ups (approved drafts with no reply)
  try {
    const staleThreads = await getStaleThreads(userId)
    if (staleThreads.length > 0) {
      const top = staleThreads[0]
      insights.push({
        type: 'email-action',
        icon: 'Clock',
        title: staleThreads.length === 1
          ? `No reply from ${top.recipient} (${top.daysSinceApproval} days)`
          : `${staleThreads.length} emails awaiting replies`,
        detail: staleThreads.length === 1
          ? `Re: ${top.subject} — approved draft sent ${formatDaysAgo(top.daysSinceApproval)}`
          : staleThreads.slice(0, 3).map(t => `${t.recipient}: ${t.subject}`).join('; '),
        actionType: 'sandy-message',
        actionLabel: 'Draft follow-up',
        sandyMessage: staleThreads.length === 1
          ? `Draft a follow-up to ${top.recipient} about "${top.subject}"`
          : 'Help me follow up on emails that haven\'t gotten a reply yet.',
        urgency: 'medium',
      })
    }
  } catch {
    // Follow-up detection is non-critical
  }

  // 3. Low urgency: general unread summary (only if no higher-urgency insights)
  if (insights.length === 0 && unreadCount > 0) {
    const topCategories = summary?.categories
      .filter(c => c.unreadCount > 0)
      .sort((a, b) => b.unreadCount - a.unreadCount)
      .slice(0, 2)
      .map(c => c.category)
      .join(', ') ?? ''

    insights.push({
      type: 'email-action',
      icon: 'Mail',
      title: `${unreadCount} unread email${unreadCount !== 1 ? 's' : ''}`,
      detail: topCategories
        ? `Top categories: ${topCategories}`
        : 'Check your inbox for the latest messages.',
      actionType: 'sandy-message',
      actionLabel: 'Let Sandy triage',
      sandyMessage: 'Triage my inbox — what needs attention today?',
      urgency: 'low',
    })
  }

  // Cap at 3 insights
  return insights.slice(0, 3)
}

/**
 * Build a concise email intelligence block for Sandy's system prompt.
 * Used by concierge-service.ts to inject email awareness.
 */
export async function buildEmailIntelligenceBlock(userId: string): Promise<string | null> {
  const insights = await generateEmailInsights(userId)
  if (insights.length === 0) return null

  const summary = await getInboxSummary(userId).catch(() => null)
  const unreadCount = summary?.unread ?? 0

  const lines = [
    `\n\n## EMAIL INTELLIGENCE — SURFACE THIS NATURALLY`,
    `User has ${unreadCount} unread email${unreadCount !== 1 ? 's' : ''}.`,
    ...insights.map(i => `- ${i.title}: ${i.detail}`),
    `If the user hasn't mentioned their inbox, proactively weave in email status once — like a good assistant who's been watching their inbox.`,
    `Only surface ONCE per conversation. Do not recite this list — be warm and natural.`,
  ]

  return lines.join('\n')
}

// ─── Helpers ────────────────────────────────────────────────

function formatDaysAgo(days: number): string {
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  return weeks === 1 ? 'last week' : `${weeks} weeks ago`
}