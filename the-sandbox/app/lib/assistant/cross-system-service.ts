// ─── Cross-System Reasoning Service ─────────────────────────
// Sprint 2 of Email × Sandy Intelligence Layer.
// Bridge helpers that let Sandy connect email ↔ calendar ↔ courses.
// These are utility functions called internally by Sandy's agent loop
// when she decides to cross-reference — no standalone API routes needed.

import { prisma } from '../prisma'
import { getCalendarProvider } from './providers'
import type { CalendarEvent } from './providers'

// ─── Types ──────────────────────────────────────────────────

export type { AssistantCourseContext, SenderContext, CrossSystemContext, CourseContext } from './types'
import type { SenderContext, CrossSystemContext } from './types'
import type { CourseContext } from '../types'

// ─── Calendar-Email Bridge ──────────────────────────────────

/**
 * Find calendar events that relate to an email's subject/body.
 * Scans events within `windowDays` for keyword overlap.
 */
export async function findRelatedCalendarEvents(
  userId: string,
  emailSubject: string,
  emailBody: string,
  windowDays: number = 7,
): Promise<CalendarEvent[]> {
  const calendarProvider = await getCalendarProvider()
  const now = new Date()
  const end = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000)

  let events: CalendarEvent[]
  try {
    events = await calendarProvider.getEvents(userId, now, end)
  } catch {
    return []
  }

  if (events.length === 0) return []

  // Extract keywords from subject + first 500 chars of body
  const searchText = `${emailSubject} ${emailBody.slice(0, 500)}`.toLowerCase()
  const keywords = extractKeywords(searchText)

  if (keywords.length === 0) return events.slice(0, 2) // No keywords → return nothing useful

  // Score each event by keyword overlap
  const scored = events
    .map((event) => {
      const eventText = `${event.title} ${event.description ?? ''} ${event.category ?? ''}`.toLowerCase()
      const matches = keywords.filter((kw) => eventText.includes(kw))
      return { event, score: matches.length }
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, 3).map((s) => s.event)
}

// ─── Course-Email Bridge ────────────────────────────────────

/**
 * Find course context for an email sender.
 * Checks if the sender is a platform user and returns their course relationships
 * relative to the current user.
 */
export async function findRelatedCourseContext(
  userId: string,
  senderEmail: string,
): Promise<CourseContext[]> {
  // Find sender on platform
  const sender = await prisma.user.findFirst({
    where: { email: senderEmail },
    select: {
      id: true,
      role: true,
      // Courses they teach
      courses: { select: { id: true, courseCode: true, title: true } },
      // Courses they're enrolled in
      courseEnrollments: {
        select: {
          course: { select: { id: true, courseCode: true, title: true } },
        },
      },
    },
  })

  if (!sender) return []

  // Get current user's course involvement
  const [userCourses, userEnrollments] = await Promise.all([
    prisma.course.findMany({
      where: { instructorId: userId },
      select: { id: true },
    }),
    prisma.courseEnrollment.findMany({
      where: { studentId: userId },
      select: { courseId: true },
    }),
  ])

  const userCourseIds = new Set([
    ...userCourses.map((c) => c.id),
    ...userEnrollments.map((e) => e.courseId),
  ])

  // Build context for courses where both users have involvement
  const contexts: CourseContext[] = []

  for (const course of sender.courses) {
    if (userCourseIds.has(course.id)) {
      contexts.push({
        courseId: course.id,
        courseCode: course.courseCode,
        title: course.title,
        relationship: 'instructor',
      })
    }
  }

  for (const enrollment of sender.courseEnrollments) {
    if (userCourseIds.has(enrollment.course.id)) {
      contexts.push({
        courseId: enrollment.course.id,
        courseCode: enrollment.course.courseCode,
        title: enrollment.course.title,
        relationship: 'enrolled',
      })
    }
  }

  return contexts
}

// ─── Full Cross-System Context Builder ──────────────────────

/**
 * Build a full cross-system context object for an email.
 * Combines sender lookup, calendar search, and course overlap
 * into a single context block Sandy can use for reasoning.
 */
export async function buildCrossSystemContext(
  userId: string,
  email: { fromAddress: string; fromName: string; subject: string; body: string },
): Promise<CrossSystemContext> {
  // Run all lookups in parallel
  const [relatedEvents, relatedCourses, sender] = await Promise.all([
    findRelatedCalendarEvents(userId, email.subject, email.body),
    findRelatedCourseContext(userId, email.fromAddress),
    prisma.user.findFirst({
      where: { email: email.fromAddress },
      select: { id: true, name: true, role: true },
    }),
  ])

  const senderContext: SenderContext = sender
    ? {
        isPlatformUser: true,
        userId: sender.id,
        name: sender.name ?? undefined,
        role: sender.role,
        courses: relatedCourses,
      }
    : {
        isPlatformUser: false,
        courses: [],
      }

  // Build a human-readable summary for Sandy's reasoning
  const summaryParts: string[] = []

  if (senderContext.isPlatformUser) {
    summaryParts.push(
      `Sender ${email.fromName} is a ${senderContext.role?.toLowerCase()} on the platform.`,
    )
  }

  if (relatedCourses.length > 0) {
    const courseList = relatedCourses
      .map((c) => `${c.courseCode} (${c.relationship === 'instructor' ? 'teaches' : 'enrolled'})`)
      .join(', ')
    summaryParts.push(`Shared courses: ${courseList}.`)
  }

  if (relatedEvents.length > 0) {
    const eventList = relatedEvents
      .map((e) => {
        const date = e.startTime.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
        return `${e.title} (${date})`
      })
      .join(', ')
    summaryParts.push(`Related calendar events: ${eventList}.`)
  }

  return {
    sender: senderContext,
    relatedEvents,
    relatedCourses,
    summary:
      summaryParts.length > 0
        ? summaryParts.join(' ')
        : 'No cross-system connections found for this email.',
  }
}

// ─── Helpers ────────────────────────────────────────────────

/** Extract meaningful keywords from text, filtering stopwords and short tokens. */
function extractKeywords(text: string): string[] {
  const stopwords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
    'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
    'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'not', 'only', 'own', 'same',
    'so', 'than', 'too', 'very', 'just', 'because', 'but', 'and', 'or',
    'if', 'while', 'about', 'up', 'your', 'you', 'me', 'my', 'i', 'we',
    'our', 'this', 'that', 'it', 'its', 'his', 'her', 'their', 'them',
    'he', 'she', 'they', 'what', 'which', 'who', 'whom', 'hi', 'hello',
    'dear', 'please', 'thank', 'thanks', 'regards', 'sincerely', 'best',
  ])

  return text
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopwords.has(w))
    .slice(0, 20) // Cap to avoid noise
}
