import { prisma } from '../prisma'
import {
  buildGraphUserPath,
  fromGraphDateTime,
  getGraphPrincipalForUser,
  graphJsonRequest,
  recordGraphSyncSuccess,
  toGraphDateTime,
} from './graph-client'
import type {
  CalendarEvent,
  CalendarProvider,
  CreateEventInput,
  FreeBusySlot,
} from './providers'
import { toCalendarEvent } from './provider-models'

type GraphCalendarDateTime = {
  dateTime?: string | null
  timeZone?: string | null
}

type GraphCalendarEvent = {
  id: string
  subject?: string | null
  bodyPreview?: string | null
  start?: GraphCalendarDateTime | null
  end?: GraphCalendarDateTime | null
  location?: { displayName?: string | null } | null
  attendees?: Array<{
    emailAddress?: { address?: string | null } | null
  }> | null
  isAllDay?: boolean | null
  categories?: string[] | null
}

type GraphCalendarListResponse = {
  value?: GraphCalendarEvent[]
}

function buildCalendarViewQuery(startDate: Date, endDate: Date) {
  const params = new URLSearchParams({
    startDateTime: startDate.toISOString(),
    endDateTime: endDate.toISOString(),
    $orderby: 'start/dateTime',
    $top: '100',
    $select: [
      'id',
      'subject',
      'bodyPreview',
      'start',
      'end',
      'location',
      'attendees',
      'isAllDay',
      'categories',
    ].join(','),
  })

  return params.toString()
}

async function syncCalendarEvents(userId: string, events: GraphCalendarEvent[]) {
  if (events.length === 0) return []

  const externalIds = events.map((event) => event.id)
  const existing = await prisma.assistantCalendarEvent.findMany({
    where: {
      userId,
      externalId: { in: externalIds },
    },
    select: {
      id: true,
      externalId: true,
    },
  })
  const existingByExternalId = new Map(
    existing.flatMap((row) =>
      row.externalId ? [[row.externalId, row.id] as const] : [],
    ),
  )

  const rows = await Promise.all(
    events.map(async (event) => {
      const data = {
        userId,
        title: event.subject?.trim() || 'Untitled event',
        description: event.bodyPreview?.trim() || null,
        startTime: fromGraphDateTime(event.start ?? {}),
        endTime: fromGraphDateTime(event.end ?? {}),
        location: event.location?.displayName?.trim() || null,
        attendees: (event.attendees ?? [])
          .map((attendee) => attendee.emailAddress?.address?.trim() ?? '')
          .filter(Boolean),
        source: 'graph',
        externalId: event.id,
        isAllDay: event.isAllDay ?? false,
        category:
          event.categories?.find((value) => value.trim().length > 0)?.trim() ?? null,
      } as const

      const existingId = existingByExternalId.get(event.id)
      if (existingId) {
        return prisma.assistantCalendarEvent.update({
          where: { id: existingId },
          data,
        })
      }

      return prisma.assistantCalendarEvent.create({ data })
    }),
  )

  return rows.map(toCalendarEvent)
}

export class GraphCalendarProvider implements CalendarProvider {
  async getEvents(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarEvent[]> {
    const userPrincipal = await getGraphPrincipalForUser(userId)
    const query = buildCalendarViewQuery(startDate, endDate)
    const response = await graphJsonRequest<GraphCalendarListResponse>(
      `${buildGraphUserPath(userPrincipal)}/calendarView?${query}`,
      {
        headers: {
          Prefer: 'outlook.timezone="UTC"',
        },
      },
    )

    const synced = await syncCalendarEvents(userId, response.value ?? [])
    await recordGraphSyncSuccess('OUTLOOK_GRAPH_ASSISTANT')

    return synced.sort(
      (left, right) => left.startTime.getTime() - right.startTime.getTime(),
    )
  }

  async getFreeBusy(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<FreeBusySlot[]> {
    const events = await this.getEvents(userId, startDate, endDate)
    return events.map((event) => ({
      start: event.startTime,
      end: event.endTime,
      title: event.title,
    }))
  }

  async createEvent(
    userId: string,
    event: CreateEventInput,
  ): Promise<CalendarEvent> {
    const userPrincipal = await getGraphPrincipalForUser(userId)
    const created = await graphJsonRequest<GraphCalendarEvent>(
      `${buildGraphUserPath(userPrincipal)}/events`,
      {
        method: 'POST',
        headers: {
          Prefer: 'outlook.timezone="UTC"',
        },
        body: {
          subject: event.title,
          body: event.description
            ? {
                contentType: 'text',
                content: event.description,
              }
            : undefined,
          start: {
            dateTime: toGraphDateTime(event.startTime),
            timeZone: 'UTC',
          },
          end: {
            dateTime: toGraphDateTime(event.endTime),
            timeZone: 'UTC',
          },
          location: event.location
            ? { displayName: event.location }
            : undefined,
          attendees: (event.attendees ?? []).map((address) => ({
            emailAddress: { address },
            type: 'required',
          })),
          isAllDay: event.isAllDay ?? false,
          categories: event.category ? [event.category] : undefined,
        },
      },
    )

    const [synced] = await syncCalendarEvents(userId, [created])
    await recordGraphSyncSuccess('OUTLOOK_GRAPH_ASSISTANT')

    if (!synced) {
      throw new Error('Microsoft Graph created an event, but local sync failed')
    }

    return synced
  }

  async deleteEvent(userId: string, eventId: string): Promise<void> {
    const userPrincipal = await getGraphPrincipalForUser(userId)
    const existing = await prisma.assistantCalendarEvent.findFirst({
      where: {
        userId,
        OR: [{ id: eventId }, { externalId: eventId }],
      },
      select: {
        id: true,
        externalId: true,
      },
    })
    const externalId = existing?.externalId ?? eventId

    await graphJsonRequest<void>(
      `${buildGraphUserPath(userPrincipal)}/events/${encodeURIComponent(externalId)}`,
      { method: 'DELETE' },
    )

    await prisma.assistantCalendarEvent.deleteMany({
      where: {
        userId,
        OR: [{ id: eventId }, { externalId }],
      },
    })

    await recordGraphSyncSuccess('OUTLOOK_GRAPH_ASSISTANT')
  }
}
