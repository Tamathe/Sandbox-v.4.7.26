// ─── Committee Service ────────────────────────────────────────
// CRUD + query helpers for committees and meeting prep.
// Committees are persistent entities with members, cadence, and
// running action items across meetings.

import { prisma } from '../prisma'
import { Prisma } from '../../generated/prisma'

// ── Types ────────────────────────────────────────────────────

export interface CommitteeMember {
  userId?: string | null
  name: string
  email: string
  role: 'member' | 'chair' | 'secretary' | 'ex-officio'
}

export interface CreateCommitteeInput {
  name: string
  description?: string
  type: string
  chairId: string
  members: CommitteeMember[]
  cadence?: string
  meetingDay?: string
  meetingTime?: string
  meetingLocation?: string
  agendaTemplate?: string
}

export interface UpcomingMeetingInfo {
  committee: Awaited<ReturnType<typeof prisma.committee.findFirst>>
  nextMeeting: Date | null
  openActionItems: number
  pendingMinutes: number
}

// ── Functions ────────────────────────────────────────────────

/**
 * Get committees where user is chair or a member (by userId in members JSON).
 */
export async function getCommittees(userId: string) {
  const all = await prisma.committee.findMany({
    where: { isActive: true },
    include: { meetings: { orderBy: { date: 'desc' }, take: 1 } },
    orderBy: { name: 'asc' },
  })

  // Filter to committees where user is chair or appears in members array
  return all.filter((c) => {
    if (c.chairId === userId) return true
    const members = c.members as CommitteeMember[] | null
    return members?.some((m) => m.userId === userId) ?? false
  })
}

/**
 * Get a single committee with its meeting history.
 */
export async function getCommittee(committeeId: string) {
  return prisma.committee.findUnique({
    where: { id: committeeId },
    include: {
      meetings: { orderBy: { date: 'desc' } },
      chair: { select: { id: true, name: true, email: true } },
    },
  })
}

/**
 * Create a new committee.
 */
export async function createCommittee(input: CreateCommitteeInput) {
  return prisma.committee.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      type: input.type,
      chairId: input.chairId,
      members: input.members as unknown as Prisma.InputJsonValue,
      cadence: input.cadence ?? null,
      meetingDay: input.meetingDay ?? null,
      meetingTime: input.meetingTime ?? null,
      meetingLocation: input.meetingLocation ?? null,
      agendaTemplate: input.agendaTemplate ?? null,
    },
  })
}

/**
 * Update an existing committee.
 */
export async function updateCommittee(
  committeeId: string,
  input: Partial<CreateCommitteeInput>
) {
  const data: Record<string, unknown> = {}
  if (input.name !== undefined) data.name = input.name
  if (input.description !== undefined) data.description = input.description
  if (input.type !== undefined) data.type = input.type
  if (input.chairId !== undefined) data.chairId = input.chairId
  if (input.members !== undefined) data.members = input.members as unknown as Prisma.InputJsonValue
  if (input.cadence !== undefined) data.cadence = input.cadence
  if (input.meetingDay !== undefined) data.meetingDay = input.meetingDay
  if (input.meetingTime !== undefined) data.meetingTime = input.meetingTime
  if (input.meetingLocation !== undefined) data.meetingLocation = input.meetingLocation
  if (input.agendaTemplate !== undefined) data.agendaTemplate = input.agendaTemplate

  return prisma.committee.update({
    where: { id: committeeId },
    data,
  })
}

/**
 * Get upcoming meetings for a user across all their committees.
 * Returns next meeting date per committee + open action count + pending minutes count.
 */
export async function getUpcomingMeetings(userId: string): Promise<UpcomingMeetingInfo[]> {
  const committees = await getCommittees(userId)
  const now = new Date()

  const results: UpcomingMeetingInfo[] = []

  for (const committee of committees) {
    // Count open action items
    const openActionItems = await prisma.committeeActionItem.count({
      where: { committeeId: committee.id, status: { in: ['open', 'in-progress'] } },
    })

    // Count meetings without finalized minutes
    const pendingMinutes = await prisma.committeeMeeting.count({
      where: { committeeId: committee.id, status: { not: 'finalized' } },
    })

    // Determine next meeting from cadence info
    const nextMeeting = computeNextMeeting(committee, now)

    results.push({
      committee,
      nextMeeting,
      openActionItems,
      pendingMinutes,
    })
  }

  return results.sort((a, b) => {
    if (!a.nextMeeting) return 1
    if (!b.nextMeeting) return -1
    return a.nextMeeting.getTime() - b.nextMeeting.getTime()
  })
}

/**
 * Pre-meeting context package: open action items, last meeting, suggested agenda.
 */
export async function getMeetingPrep(committeeId: string) {
  const [committee, openActionItems, lastMeeting] = await Promise.all([
    prisma.committee.findUniqueOrThrow({ where: { id: committeeId } }),
    prisma.committeeActionItem.findMany({
      where: { committeeId, status: { in: ['open', 'in-progress'] } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.committeeMeeting.findFirst({
      where: { committeeId, formattedMinutes: { not: null } },
      orderBy: { date: 'desc' },
    }),
  ])

  // Build suggested agenda from open items + recurring template
  const suggestedAgenda: string[] = []
  if (openActionItems.length > 0) {
    suggestedAgenda.push(`Review of ${openActionItems.length} open action item(s) from previous meeting(s)`)
  }
  if (committee.agendaTemplate) {
    const templateItems = committee.agendaTemplate.split('\n').filter((l) => l.trim())
    suggestedAgenda.push(...templateItems)
  }
  if (suggestedAgenda.length === 0) {
    suggestedAgenda.push('Old business', 'New business', 'Announcements')
  }

  return { committee, openActionItems, lastMeeting, suggestedAgenda }
}

// ── Agenda Management ────────────────────────────────────────

export interface AgendaItem {
  title: string
  description?: string
  timeMinutes?: number
}

/**
 * Update the draft agenda for the next meeting.
 */
export async function updateAgenda(committeeId: string, agenda: AgendaItem[]) {
  return prisma.committee.update({
    where: { id: committeeId },
    data: { nextAgenda: agenda as unknown as Prisma.InputJsonValue },
  })
}

/**
 * Get the next meeting's agenda, with fallbacks:
 * 1. Saved nextAgenda field
 * 2. Parse agendaTemplate (newline-separated titles)
 * 3. Carry forward open action items
 */
export async function getAgendaWithCarryForward(committeeId: string): Promise<AgendaItem[]> {
  const committee = await prisma.committee.findUnique({ where: { id: committeeId } })
  if (!committee) return []

  const savedAgenda = (committee.nextAgenda as AgendaItem[] | null) ?? []
  if (savedAgenda.length > 0) return savedAgenda

  if (committee.agendaTemplate) {
    return committee.agendaTemplate.split('\n').filter(Boolean).map(title => ({ title: title.trim() }))
  }

  const openItems = await prisma.committeeActionItem.findMany({
    where: { committeeId, status: { in: ['open', 'in-progress'] } },
    orderBy: { priority: 'asc' },
    take: 10,
  })
  if (openItems.length > 0) {
    return [
      { title: 'Review of Previous Action Items', description: `${openItems.length} open items to review` },
    ]
  }

  return []
}

// ── Internal helpers ─────────────────────────────────────────

const DAY_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
}

/**
 * Compute next meeting date from cadence + meetingDay.
 * Simple heuristic — not a full scheduling engine.
 */
export function computeNextMeeting(
  committee: { meetingDay?: string | null; cadence?: string | null },
  now: Date
): Date | null {
  if (!committee.meetingDay) return null
  const targetDay = DAY_MAP[committee.meetingDay.toLowerCase()]
  if (targetDay === undefined) return null

  const next = new Date(now)
  const currentDay = next.getDay()
  let daysUntil = (targetDay - currentDay + 7) % 7
  if (daysUntil === 0) daysUntil = 7 // next occurrence if today already passed

  if (committee.cadence === 'biweekly') {
    // For biweekly, just pick the next occurrence (simplified)
    daysUntil = daysUntil === 0 ? 14 : daysUntil
  } else if (committee.cadence === 'monthly') {
    // For monthly, roughly 4 weeks out
    daysUntil = daysUntil === 0 ? 28 : daysUntil + 21
  }

  next.setDate(next.getDate() + daysUntil)
  next.setHours(10, 0, 0, 0) // default meeting time
  return next
}
