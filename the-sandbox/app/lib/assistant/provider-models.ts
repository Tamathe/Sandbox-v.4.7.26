import type {
  AssistantCalendarEvent,
  AssistantEmail,
} from '../../generated/prisma'
import type { CalendarEvent, Email } from './providers'

export function toCalendarEvent(row: AssistantCalendarEvent): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startTime: row.startTime,
    endTime: row.endTime,
    location: row.location,
    attendees: row.attendees,
    source: row.source,
    isAllDay: row.isAllDay,
    category: row.category,
  }
}

export function toEmail(row: AssistantEmail): Email {
  return {
    id: row.id,
    fromAddress: row.fromAddress,
    fromName: row.fromName,
    toAddresses: row.toAddresses,
    subject: row.subject,
    body: row.body,
    snippet: row.snippet,
    threadId: row.threadId,
    category: row.category,
    isRead: row.isRead,
    isStarred: row.isStarred,
    receivedAt: row.receivedAt,
    urgencyScore: row.urgencyScore,
    urgencyBucket: row.urgencyBucket,
    urgencyReasons: row.urgencyReasons,
  }
}
