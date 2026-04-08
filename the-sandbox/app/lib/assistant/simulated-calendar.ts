// ─── Simulated Calendar Provider ─────────────────────────────
// Reads/writes AssistantCalendarEvent via Prisma.
// Swap for GraphCalendarProvider when Azure arrives.

import { prisma } from '../prisma'
import type {
  CalendarProvider,
  CalendarEvent,
  FreeBusySlot,
  CreateEventInput,
} from './providers'
import { toCalendarEvent } from './provider-models'

export class SimulatedCalendarProvider implements CalendarProvider {
  async getEvents(userId: string, startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    const rows = await prisma.assistantCalendarEvent.findMany({
      where: {
        userId,
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      },
      orderBy: { startTime: 'asc' },
    })
    return rows.map(toCalendarEvent)
  }

  async getFreeBusy(userId: string, startDate: Date, endDate: Date): Promise<FreeBusySlot[]> {
    const rows = await prisma.assistantCalendarEvent.findMany({
      where: {
        userId,
        startTime: { lt: endDate },
        endTime: { gt: startDate },
      },
      orderBy: { startTime: 'asc' },
    })
    return rows.map(r => ({
      start: r.startTime,
      end: r.endTime,
      title: r.title,
    }))
  }

  async createEvent(userId: string, event: CreateEventInput): Promise<CalendarEvent> {
    const row = await prisma.assistantCalendarEvent.create({
      data: {
        userId,
        title: event.title,
        description: event.description ?? null,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location ?? null,
        attendees: event.attendees ?? [],
        isAllDay: event.isAllDay ?? false,
        category: event.category ?? 'meeting',
        source: 'sandy',
      },
    })
    return toCalendarEvent(row)
  }

  async deleteEvent(userId: string, eventId: string): Promise<void> {
    await prisma.assistantCalendarEvent.deleteMany({
      where: { id: eventId, userId },
    })
  }
}
