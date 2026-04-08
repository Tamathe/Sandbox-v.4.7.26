// ─── Email Follow-Up Service ────────────────────────────────
// Sprint 4 of Email × Sandy Intelligence Layer.
// Tracks approved drafts and alerts the user when a thread goes cold.
// "Prof. Smith hasn't responded to your email from Tuesday —
//  want me to draft a follow-up?"

import { prisma } from '../prisma'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

// ─── Types ──────────────────────────────────────────────────

export type { FollowUpCandidate } from './types'
import type { FollowUpCandidate } from './types'

// ─── Stale Thread Detection ─────────────────────────────────

/**
 * Find approved drafts where the thread has gone cold (no reply received).
 * Uses `updatedAt` as the approval timestamp since that's when status changed.
 */
export async function getStaleThreads(
  userId: string,
  thresholdDays: number = 3,
): Promise<FollowUpCandidate[]> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - thresholdDays)

  // Find approved drafts older than threshold
  const approvedDrafts = await prisma.assistantEmailDraft.findMany({
    where: {
      userId,
      status: 'approved',
      updatedAt: { lt: cutoff },
    },
    include: {
      email: {
        select: {
          id: true,
          threadId: true,
          subject: true,
          fromName: true,
          fromAddress: true,
        },
      },
    },
    orderBy: { updatedAt: 'asc' },
  })

  if (approvedDrafts.length === 0) return []

  // For each approved draft, check if the thread got a reply after approval
  const candidates: FollowUpCandidate[] = []

  for (const draft of approvedDrafts) {
    const email = draft.email

    // Check if any newer email exists in the same thread
    let hasReply = false
    if (email.threadId) {
      const newerInThread = await prisma.assistantEmail.count({
        where: {
          userId,
          threadId: email.threadId,
          receivedAt: { gt: draft.updatedAt },
        },
      })
      hasReply = newerInThread > 0
    }

    if (!hasReply) {
      const daysSince = Math.floor(
        (Date.now() - draft.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
      )

      candidates.push({
        emailId: email.id,
        draftId: draft.id,
        threadId: email.threadId,
        subject: email.subject,
        recipient: email.fromName,
        recipientAddress: email.fromAddress,
        approvedAt: draft.updatedAt,
        daysSinceApproval: daysSince,
        suggestedAction:
          daysSince >= 7
            ? 'Check if this was resolved offline'
            : 'Send a gentle follow-up',
      })
    }
  }

  return candidates
}

// ─── Follow-Up Draft Generation ─────────────────────────────

/**
 * Generate a follow-up draft for a stale thread.
 * References the original email + approved draft to write a tactful nudge.
 */
export async function generateFollowUpDraft(
  userId: string,
  originalEmailId: string,
  instruction?: string,
): Promise<{ draftId: string; body: string }> {
  // Fetch original email + the approved draft
  const email = await prisma.assistantEmail.findFirst({
    where: { id: originalEmailId, userId },
    include: {
      drafts: {
        where: { status: 'approved' },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!email) throw new Error('Original email not found')

  const approvedDraft = email.drafts[0]
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, role: true, department: true },
  })

  const daysSince = approvedDraft
    ? Math.floor(
        (Date.now() - approvedDraft.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
      )
    : 3

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system: `You are Sandy, drafting a follow-up email for ${user?.name ?? 'the user'} (${user?.role ?? 'Educator'}, ${user?.department ?? 'University of Kentucky'}).

This is a FOLLOW-UP to an email that was sent ${daysSince} days ago with no response. Be:
- Tactful and warm — assume the recipient is busy, not ignoring
- Brief — 2-3 sentences max
- Clear about what you're following up on
- Sign off as "${user?.name ?? 'the user'}" (not Sandy)
- Do NOT include a subject line — just the body`,
    messages: [{
      role: 'user',
      content: `Original email from ${email.fromName}:
Subject: ${email.subject}
${email.body.slice(0, 500)}

${approvedDraft ? `My approved reply (sent ${daysSince} days ago):\n${approvedDraft.body.slice(0, 500)}` : ''}
${instruction ? `\nSpecial instructions: ${instruction}` : ''}

Draft a follow-up.`,
    }],
  })

  const followUpBody = response.content[0].type === 'text' ? response.content[0].text : ''

  // Save as a new draft on the original email
  const draft = await prisma.assistantEmailDraft.create({
    data: {
      emailId: originalEmailId,
      userId,
      body: followUpBody,
      status: 'pending',
      context: 'Follow-up draft — no reply received',
    },
  })

  return { draftId: draft.id, body: followUpBody }
}
