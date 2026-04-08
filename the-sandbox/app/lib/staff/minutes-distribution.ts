// ─── Minutes Distribution Service ─────────────────────────────
// Generates distribution email drafts from meeting minutes and
// handles marking minutes as distributed. Simulated for demo —
// future: send via Resend.

import { prisma } from '../prisma'
import type { CommitteeMember } from './committee-service'

// ── Types ────────────────────────────────────────────────────

export interface DistributionDraft {
  subject: string
  body: string
  recipients: string[]
  attachmentMarkdown: string
}

// ── Functions ────────────────────────────────────────────────

/**
 * Generate a distribution email draft from meeting + committee data.
 * Returns subject, body, recipients, and the full minutes as markdown.
 */
export async function generateDistributionDraft(
  meetingId: string
): Promise<DistributionDraft> {
  const meeting = await prisma.committeeMeeting.findUniqueOrThrow({
    where: { id: meetingId },
  })

  const committee = await prisma.committee.findUniqueOrThrow({
    where: { id: meeting.committeeId },
  })

  const members = committee.members as CommitteeMember[] | null
  const recipients = members?.map((m) => m.email).filter(Boolean) ?? []

  const dateStr = meeting.date.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  const subject = `${committee.name} Minutes — ${dateStr}`

  // Build action items summary
  const actionItems = (meeting.actionItems as Array<{ action: string; ownerName: string; due?: string }>) ?? []
  const actionSummary = actionItems.length > 0
    ? actionItems.map((a, i) => `${i + 1}. ${a.action} (${a.ownerName}${a.due ? ` — due ${a.due}` : ''})`).join('\n')
    : 'No action items.'

  // Build decisions summary
  const decisions = (meeting.decisions as Array<{ decision: string; vote?: string }>) ?? []
  const decisionSummary = decisions.length > 0
    ? decisions.map((d) => `- ${d.decision}${d.vote ? ` (Vote: ${d.vote})` : ''}`).join('\n')
    : ''

  const body = `Team,

Attached are the minutes from today's ${committee.name} meeting (Meeting #${meeting.meetingNumber}).

**Key Items:**
${decisionSummary ? `\nDecisions:\n${decisionSummary}\n` : ''}
Action Items:
${actionSummary}

Next meeting: ${committee.meetingDay ?? 'TBD'}, ${committee.meetingTime ?? 'TBD'} — ${committee.meetingLocation ?? 'TBD'}

Please review and let me know if any corrections are needed.

Best,
${committee.name} Chair`

  return {
    subject,
    body,
    recipients,
    attachmentMarkdown: meeting.formattedMinutes ?? '',
  }
}

/**
 * Mark minutes as distributed and record the timestamp.
 * Simulated for demo — future integration with Resend.
 */
export async function distributeMinutes(meetingId: string): Promise<void> {
  await prisma.committeeMeeting.update({
    where: { id: meetingId },
    data: {
      distributionStatus: 'distributed',
      distributedAt: new Date(),
    },
  })

  // Audit log
  const meeting = await prisma.committeeMeeting.findUniqueOrThrow({
    where: { id: meetingId },
    include: { committee: { select: { name: true, chairId: true } } },
  })

  await prisma.assistantActionLog.create({
    data: {
      userId: meeting.committee.chairId,
      actionType: 'minutes-distributed',
      summary: `Distributed minutes for ${meeting.committee.name} Meeting #${meeting.meetingNumber}`,
      metadata: {
        meetingId: meeting.id,
        committeeId: meeting.committeeId,
        meetingNumber: meeting.meetingNumber,
      },
    },
  })
}
