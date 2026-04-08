// ─── Minutes Generation Service ───────────────────────────────
// Core AI service that transforms raw meeting notes into formatted
// parliamentary minutes, structured action items, decisions, and
// previous action item review. Uses Sonnet for generation.

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import { Prisma } from '../../generated/prisma'
import { createAction } from './action-queue-service'

// ── Types ────────────────────────────────────────────────────

export interface GenerateMinutesInput {
  committeeId: string
  meetingDate: Date
  rawNotes: string
  inputType: 'notes' | 'transcript' | 'structured' | 'agenda-aligned'
  attendees?: string[]
  duration?: number
}

export interface ExtractedActionItem {
  action: string
  ownerName: string
  due: string | null
  priority: 'critical' | 'high' | 'medium' | 'low'
}

export interface ExtractedDecision {
  decision: string
  vote: string | null
  context: string
  movedBy: string | null
  secondedBy: string | null
}

export interface ActionReview {
  action: string
  owner: string
  status: 'complete' | 'in-progress' | 'not-started'
  notes: string | null
}

export interface GeneratedMinutes {
  meeting: Awaited<ReturnType<typeof prisma.committeeMeeting.create>>
  formattedMinutes: string
  actionItems: ExtractedActionItem[]
  decisions: ExtractedDecision[]
  previousActionReview: ActionReview[]
}

// ── Anthropic Client ────────────────────────────────────────

let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic()
  }
  return _anthropic
}

// ── Priority mapping ─────────────────────────────────────────

const PRIORITY_TO_P: Record<string, string> = {
  critical: 'P0',
  high: 'P1',
  medium: 'P2',
  low: 'P3',
}

// ── Main Functions ──────────────────────────────────────────

/**
 * Generate formatted minutes from raw notes using Sonnet.
 * 1. Fetches committee context + previous meeting action items
 * 2. Calls Sonnet to produce formatted minutes + structured data
 * 3. Creates CommitteeMeeting + CommitteeActionItem records
 * 4. Optionally pushes action items to StaffActionItem queue
 */
export async function generateMinutes(
  input: GenerateMinutesInput
): Promise<GeneratedMinutes> {
  // 1. Fetch committee details
  const committee = await prisma.committee.findUniqueOrThrow({
    where: { id: input.committeeId },
    include: { chair: { select: { id: true, name: true, email: true } } },
  })

  // 2. Get previous meeting's action items for review
  const previousMeeting = await prisma.committeeMeeting.findFirst({
    where: { committeeId: input.committeeId, formattedMinutes: { not: null } },
    orderBy: { date: 'desc' },
  })

  const openActions = await prisma.committeeActionItem.findMany({
    where: { committeeId: input.committeeId, status: { in: ['open', 'in-progress'] } },
    orderBy: { createdAt: 'asc' },
  })

  // 3. Determine meeting number
  const lastMeetingNumber = await prisma.committeeMeeting.findFirst({
    where: { committeeId: input.committeeId },
    orderBy: { meetingNumber: 'desc' },
    select: { meetingNumber: true },
  })
  const meetingNumber = (lastMeetingNumber?.meetingNumber ?? 0) + 1

  // 4. Build generation prompt
  const members = committee.members as Array<{ name: string; role: string }> | null
  const memberList = members?.map((m) => `${m.name} (${m.role})`).join(', ') ?? 'Unknown'

  const previousActionsContext = openActions.length > 0
    ? openActions.map((a) => `- ${a.action} (Owner: ${a.ownerName}, Status: ${a.status}${a.dueDate ? `, Due: ${a.dueDate.toISOString().split('T')[0]}` : ''})`).join('\n')
    : 'No open action items from previous meetings.'

  const dateStr = input.meetingDate.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const systemPrompt = `You are Sandy, the University of Kentucky's AI assistant. You generate professional meeting minutes from raw notes.

COMMITTEE: ${committee.name}
TYPE: ${committee.type}
CHAIR: ${committee.chair.name}
MEMBERS: ${memberList}
MEETING #: ${meetingNumber}
DATE: ${dateStr}
LOCATION: ${committee.meetingLocation ?? 'TBD'}
${committee.agendaTemplate ? `RECURRING AGENDA TEMPLATE:\n${committee.agendaTemplate}` : ''}

PREVIOUS ACTION ITEMS (for status review):
${previousActionsContext}

INPUT TYPE: ${input.inputType}
${input.attendees?.length ? `ATTENDEES OVERRIDE: ${input.attendees.join(', ')}` : ''}
${input.duration ? `DURATION: ${input.duration} minutes` : ''}

INSTRUCTIONS:
1. Generate formal parliamentary-style minutes in markdown format.
2. Include: Attendance table, Previous Action Item Review (with ✅/⏳/❌ status), Agenda Items with discussion summaries, Motions/Votes (exact counts), Action Items table, Decisions table.
3. Extract EVERY action item with: action description, owner name, due date (if mentioned or infer from context), priority (critical/high/medium/low).
4. Extract ALL decisions with: decision text, vote result (e.g. "5-1", "unanimous", "by consensus"), context, moved by, seconded by.
5. Review each previous action item and note its status based on what was discussed.
6. For transcripts: clean up filler words, attribute statements to speakers, organize by topic.
7. For rough notes: expand abbreviations, infer full sentences, structure into formal format.
8. End minutes with: "Minutes prepared by Sandy AI. Reviewed by: [Pending]"

RESPOND IN THIS EXACT JSON FORMAT:
{
  "formattedMinutes": "Full minutes in markdown format",
  "attendees": { "present": ["Name (Role)"], "absent": ["Name (Role)"] },
  "actionItems": [{ "action": "...", "ownerName": "...", "due": "YYYY-MM-DD or null", "priority": "critical|high|medium|low" }],
  "decisions": [{ "decision": "...", "vote": "5-1 or unanimous or null", "context": "...", "movedBy": "Name or null", "secondedBy": "Name or null" }],
  "previousActionReview": [{ "action": "...", "owner": "...", "status": "complete|in-progress|not-started", "notes": "..." }],
  "agendaItems": [{ "title": "...", "discussion": "...", "decisions": ["..."], "motions": ["..."] }]
}`

  // 5. Call Sonnet
  const anthropic = getAnthropic()
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: input.rawNotes }],
  })

  const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'

  let parsed: {
    formattedMinutes?: string
    attendees?: { present?: string[]; absent?: string[] }
    actionItems?: ExtractedActionItem[]
    decisions?: ExtractedDecision[]
    previousActionReview?: ActionReview[]
    agendaItems?: Array<{ title: string; discussion: string; decisions: string[]; motions: string[] }>
  }

  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
  } catch {
    parsed = { formattedMinutes: rawText, actionItems: [], decisions: [], previousActionReview: [] }
  }

  const formattedMinutes = parsed.formattedMinutes ?? rawText
  const actionItems = parsed.actionItems ?? []
  const decisions = parsed.decisions ?? []
  const previousActionReview = parsed.previousActionReview ?? []

  // 6. Create CommitteeMeeting record
  const meeting = await prisma.committeeMeeting.create({
    data: {
      committeeId: input.committeeId,
      meetingNumber,
      date: input.meetingDate,
      location: committee.meetingLocation,
      duration: input.duration ?? null,
      rawNotes: input.rawNotes,
      inputType: input.inputType,
      attendees: parsed.attendees ? (parsed.attendees as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      formattedMinutes,
      agendaItems: parsed.agendaItems ? (parsed.agendaItems as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      actionItems: actionItems as unknown as Prisma.InputJsonValue,
      decisions: decisions as unknown as Prisma.InputJsonValue,
      previousActionReview: previousActionReview as unknown as Prisma.InputJsonValue,
      status: 'draft',
      generatedBy: 'sandy',
    },
  })

  // 7. Action items are stored in the meeting JSON only — records are created
  //    through explicit user confirmation via ActionItemConfirmation UI.

  // 8. Update previous action item statuses based on AI review
  for (const review of previousActionReview) {
    const matching = openActions.find(
      (a) => a.ownerName === review.owner && a.action.toLowerCase().includes(review.action.toLowerCase().slice(0, 20))
    )
    if (matching && review.status === 'complete') {
      await prisma.committeeActionItem.update({
        where: { id: matching.id },
        data: { status: 'complete', completedAt: new Date(), notes: review.notes },
      })
    } else if (matching && review.status === 'in-progress') {
      await prisma.committeeActionItem.update({
        where: { id: matching.id },
        data: { status: 'in-progress', notes: review.notes },
      })
    }
  }

  return { meeting, formattedMinutes, actionItems, decisions, previousActionReview }
}

/**
 * Re-generate minutes from existing rawNotes + optional additional notes.
 * Preserves the same meeting record, overwrites generated content.
 */
export async function regenerateMinutes(
  meetingId: string,
  additionalNotes?: string
): Promise<GeneratedMinutes> {
  const existing = await prisma.committeeMeeting.findUniqueOrThrow({
    where: { id: meetingId },
  })

  if (!existing.rawNotes) {
    throw new Error('Meeting has no raw notes to regenerate from')
  }

  const combinedNotes = additionalNotes
    ? `${existing.rawNotes}\n\n--- Additional Notes ---\n${additionalNotes}`
    : existing.rawNotes

  // Delete old action items for this meeting before regenerating
  await prisma.committeeActionItem.deleteMany({
    where: { meetingId },
  })

  // Re-generate using the same pipeline
  const result = await generateMinutes({
    committeeId: existing.committeeId,
    meetingDate: existing.date,
    rawNotes: combinedNotes,
    inputType: existing.inputType as GenerateMinutesInput['inputType'],
    duration: existing.duration ?? undefined,
  })

  // The generateMinutes call created a new meeting record — delete it and
  // update the original instead. This preserves the meeting ID.
  if (result.meeting.id !== meetingId) {
    // Move action items to original meeting
    await prisma.committeeActionItem.updateMany({
      where: { meetingId: result.meeting.id },
      data: { meetingId },
    })

    // Copy generated content to original
    await prisma.committeeMeeting.update({
      where: { id: meetingId },
      data: {
        rawNotes: combinedNotes,
        formattedMinutes: result.formattedMinutes,
        attendees: result.meeting.attendees ? (result.meeting.attendees as Prisma.InputJsonValue) : Prisma.JsonNull,
        agendaItems: result.meeting.agendaItems ? (result.meeting.agendaItems as Prisma.InputJsonValue) : Prisma.JsonNull,
        actionItems: result.meeting.actionItems ? (result.meeting.actionItems as Prisma.InputJsonValue) : Prisma.JsonNull,
        decisions: result.meeting.decisions ? (result.meeting.decisions as Prisma.InputJsonValue) : Prisma.JsonNull,
        previousActionReview: result.meeting.previousActionReview ? (result.meeting.previousActionReview as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    })

    // Delete the temporary meeting
    await prisma.committeeMeeting.delete({ where: { id: result.meeting.id } })
  }

  // Return with the original meeting ID
  const updated = await prisma.committeeMeeting.findUniqueOrThrow({
    where: { id: meetingId },
  })

  return { ...result, meeting: updated }
}

/**
 * Update a committee action item's status.
 */
export async function updateActionItemStatus(
  actionId: string,
  status: string,
  notes?: string
) {
  return prisma.committeeActionItem.update({
    where: { id: actionId },
    data: {
      status,
      notes: notes ?? undefined,
      ...(status === 'complete' ? { completedAt: new Date() } : {}),
    },
  })
}

/**
 * Get committee meeting history for context injection.
 */
export async function getCommitteeHistory(
  committeeId: string,
  opts?: { limit?: number }
) {
  return prisma.committeeMeeting.findMany({
    where: { committeeId },
    orderBy: { date: 'desc' },
    take: opts?.limit ?? 10,
  })
}

/**
 * Get a single meeting by ID.
 */
export async function getMeeting(meetingId: string) {
  return prisma.committeeMeeting.findUnique({
    where: { id: meetingId },
    include: { committee: { select: { name: true, type: true } } },
  })
}

/**
 * Update a meeting (edit minutes, change status, etc.).
 */
export async function updateMeeting(
  meetingId: string,
  updates: { formattedMinutes?: string; status?: string; reviewedBy?: string; rawNotes?: string }
) {
  return prisma.committeeMeeting.update({
    where: { id: meetingId },
    data: {
      ...(updates.formattedMinutes !== undefined ? { formattedMinutes: updates.formattedMinutes } : {}),
      ...(updates.status !== undefined ? { status: updates.status } : {}),
      ...(updates.reviewedBy !== undefined ? { reviewedBy: updates.reviewedBy } : {}),
      ...(updates.rawNotes !== undefined ? { rawNotes: updates.rawNotes } : {}),
    },
  })
}

/**
 * Create a draft meeting record for live note-taking.
 */
export async function createMeetingDraft(committeeId: string) {
  const lastMeeting = await prisma.committeeMeeting.findFirst({
    where: { committeeId },
    orderBy: { meetingNumber: 'desc' },
    select: { meetingNumber: true },
  })
  const nextNumber = (lastMeeting?.meetingNumber ?? 0) + 1

  return prisma.committeeMeeting.create({
    data: {
      committeeId,
      meetingNumber: nextNumber,
      date: new Date(),
      status: 'draft',
      rawNotes: '',
      agendaItems: [],
      decisions: [],
      actionItems: [],
      attendees: [],
    },
  })
}

/**
 * Revise a single section of meeting minutes using Sonnet.
 * The full minutes are provided for context, but only the target section is rewritten.
 */
export async function reviseMinutesSection(
  sectionContent: string,
  instruction: string,
  fullMinutes: string
): Promise<string> {
  const anthropic = getAnthropic()
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: `You are revising a section of meeting minutes. Here is the full document for context:\n\n${fullMinutes}\n\nRevise ONLY the following section based on the user's instruction. Return ONLY the revised section in markdown format. Do not include any preamble or explanation.`,
    messages: [{ role: 'user', content: `Section to revise:\n\n${sectionContent}\n\nInstruction: ${instruction}` }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : sectionContent
  return text.trim()
}

/**
 * Create multiple CommitteeActionItem records from confirmed action items.
 */
export async function createActionItems(
  committeeId: string,
  meetingId: string,
  items: ExtractedActionItem[]
) {
  const created = []
  for (const item of items) {
    const record = await prisma.committeeActionItem.create({
      data: {
        committeeId,
        meetingId,
        action: item.action,
        ownerName: item.ownerName,
        dueDate: item.due ? new Date(item.due) : null,
        priority: item.priority,
        status: 'open',
      },
    })
    created.push(record)
  }

  // Push to StaffActionItem queue for the chair
  const committee = await prisma.committee.findUnique({
    where: { id: committeeId },
    select: { chairId: true, name: true },
  })
  if (committee) {
    const meeting = await prisma.committeeMeeting.findUnique({
      where: { id: meetingId },
      select: { meetingNumber: true },
    })
    for (const item of items) {
      try {
        await createAction({
          assigneeId: committee.chairId,
          submitterId: committee.chairId,
          type: 'committee-action',
          priority: PRIORITY_TO_P[item.priority] ?? 'P2',
          title: item.action,
          description: `Committee: ${committee.name} | Meeting #${meeting?.meetingNumber ?? '?'} | Owner: ${item.ownerName}${item.due ? ` | Due: ${item.due}` : ''}`,
          deadline: item.due ? new Date(item.due) : undefined,
          metadata: { meetingId, committeeId, ownerName: item.ownerName },
        })
      } catch {
        // Non-fatal — action queue push is best-effort
      }
    }
  }

  return created
}

/**
 * Get all non-complete action items for a committee.
 */
export async function getOpenActionItems(committeeId: string) {
  return prisma.committeeActionItem.findMany({
    where: { committeeId, status: { in: ['open', 'in-progress'] } },
    orderBy: [{ priority: 'asc' }, { dueDate: { sort: 'asc', nulls: 'last' } }],
  })
}
