// ─── Scheduling Service ──────────────────────────────────────
// Multi-party availability, rules evaluation, option generation.

import { prisma } from '../prisma'
import { getCalendarProvider } from './providers'
import type { CalendarEvent, FreeBusySlot } from './providers'
import { evaluateRules, type ActiveRule } from './rules-service'
import { addDays, startOfDay, endOfDay, format, setHours, setMinutes } from 'date-fns'

// ─── Types ───────────────────────────────────────────────────

export type { MeetingOption, FindTimeInput, BookMeetingInput } from './types'
import type { MeetingOption, FindTimeInput, BookMeetingInput } from './types'

// ─── Find Meeting Options ────────────────────────────────────

export async function findMeetingOptions(input: FindTimeInput): Promise<MeetingOption[]> {
  const calendar = await getCalendarProvider()

  // 1. Get requester's busy slots + rules
  const requesterBusy = await calendar.getFreeBusy(input.requesterId, input.startDate, input.endDate)
  const requesterRules = await evaluateRules(input.requesterId, 'scheduling')

  // 2. Try to find target user on platform
  let targetBusy: FreeBusySlot[] = []
  let targetRules: ActiveRule[] = []
  const targetUser = await prisma.user.findUnique({ where: { email: input.targetEmail } })

  if (targetUser) {
    targetBusy = await calendar.getFreeBusy(targetUser.id, input.startDate, input.endDate)
    targetRules = await evaluateRules(targetUser.id, 'scheduling')
  }

  // 3. Generate candidate slots (every 30-min increment during business hours)
  const candidates = generateCandidateSlots(input.startDate, input.endDate, input.durationMinutes)

  // 4. Filter out conflicts
  const allBusy = [...requesterBusy, ...targetBusy]
  const allRules = [...requesterRules, ...targetRules]

  const available = candidates.filter(slot => {
    if (hasConflict(slot.start, slot.end, allBusy)) return false
    if (violatesRules(slot.start, slot.end, allRules)) return false
    return true
  })

  // 5. Score and rank
  const scored = available.map((slot, i) => ({
    index: i + 1,
    start: slot.start,
    end: slot.end,
    label: formatSlotLabel(slot.start, slot.end),
    score: scoreSlot(slot.start),
  }))

  scored.sort((a, b) => b.score - a.score)

  // Return top 4 options, re-indexed
  return scored.slice(0, 4).map((opt, i) => ({ ...opt, index: i + 1 }))
}

// ─── Book a Meeting ──────────────────────────────────────────

export async function bookMeeting(input: BookMeetingInput): Promise<CalendarEvent> {
  const calendar = await getCalendarProvider()

  // Create event on requester's calendar
  const event = await calendar.createEvent(input.requesterId, {
    title: input.title,
    startTime: input.option.start,
    endTime: input.option.end,
    attendees: input.attendees,
    category: 'meeting',
  })

  if (event.source !== 'graph') {
    // Simulated calendars still need a mirrored attendee event because there is no external invite workflow.
    for (const email of input.attendees) {
      const attendee = await prisma.user.findUnique({ where: { email } })
      if (attendee && attendee.id !== input.requesterId) {
        await calendar.createEvent(attendee.id, {
          title: input.title,
          startTime: input.option.start,
          endTime: input.option.end,
          attendees: [email],
          category: 'meeting',
        })
      }
    }
  }

  // Log action
  await prisma.assistantActionLog.create({
    data: {
      userId: input.requesterId,
      actionType: 'schedule',
      summary: `Scheduled "${input.title}" on ${format(input.option.start, 'EEE MMM d, h:mm a')}`,
      metadata: {
        eventId: event.id,
        attendees: input.attendees,
        start: input.option.start.toISOString(),
        end: input.option.end.toISOString(),
      },
    },
  })

  return event
}

// ─── Internal Helpers ────────────────────────────────────────

function generateCandidateSlots(
  startDate: Date,
  endDate: Date,
  durationMinutes: number
): { start: Date; end: Date }[] {
  const slots: { start: Date; end: Date }[] = []
  let current = startOfDay(startDate)
  const end = endOfDay(endDate)

  while (current < end) {
    const day = current.getDay()
    // Skip weekends
    if (day !== 0 && day !== 6) {
      // Business hours: 8am - 5pm, every 30-min increment
      for (let hour = 8; hour < 17; hour++) {
        for (const minute of [0, 30]) {
          const slotStart = setMinutes(setHours(new Date(current), hour), minute)
          const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000)
          // Don't extend past 5pm
          if (slotEnd.getHours() < 17 || (slotEnd.getHours() === 17 && slotEnd.getMinutes() === 0)) {
            slots.push({ start: slotStart, end: slotEnd })
          }
        }
      }
    }
    current = addDays(current, 1)
  }

  return slots
}

function hasConflict(start: Date, end: Date, busy: FreeBusySlot[]): boolean {
  return busy.some(b => start < b.end && end > b.start)
}

function violatesRules(start: Date, end: Date, rules: ActiveRule[]): boolean {
  for (const rule of rules) {
    const s = rule.structured
    const dayOfWeek = start.getDay() === 0 ? 7 : start.getDay() // 1=Mon...7=Sun
    const hour = start.getHours()
    const endHour = end.getHours() + end.getMinutes() / 60

    if (s.type === 'recurring-block') {
      if (s.dayOfWeek === dayOfWeek) {
        const blockStart = parseTimeToHours(s.startTime as string)
        const blockEnd = parseTimeToHours(s.endTime as string)
        if (hour < blockEnd && endHour > blockStart) return true
      }
    }

    if (s.type === 'one-time-block' && s.date) {
      const blockDate = new Date(s.date as string)
      if (
        start.getFullYear() === blockDate.getFullYear() &&
        start.getMonth() === blockDate.getMonth() &&
        start.getDate() === blockDate.getDate()
      ) {
        return true
      }
    }

    if (s.type === 'time-constraint') {
      if (s.beforeHour && hour < (s.beforeHour as number)) return true
      if (s.afterHour && hour >= (s.afterHour as number)) return true
    }
  }
  return false
}

function parseTimeToHours(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h + (m || 0) / 60
}

function scoreSlot(start: Date): number {
  let score = 0
  const hour = start.getHours()
  const day = start.getDay()

  // Prefer mid-morning (10-11am)
  if (hour >= 10 && hour <= 11) score += 3
  // Then early afternoon (1-2pm)
  else if (hour >= 13 && hour <= 14) score += 2
  // Avoid early morning and late afternoon
  else if (hour < 9 || hour >= 16) score -= 1

  // Prefer earlier in the week
  if (day >= 1 && day <= 3) score += 1 // Mon-Wed
  if (day === 5) score -= 1 // Friday slightly deprioritized

  // Prefer sooner dates
  const daysFromNow = Math.floor((start.getTime() - Date.now()) / 86_400_000)
  score -= daysFromNow * 0.1

  return score
}

function formatSlotLabel(start: Date, end: Date): string {
  return `${format(start, 'EEEE MMM d, h:mm a')} – ${format(end, 'h:mm a')}`
}
