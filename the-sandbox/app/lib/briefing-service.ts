// ─── Morning Briefing Service ────────────────────────────────
// Aggregates calendar, email, and tasks into Sandy's daily briefing.
// One Haiku call triages all unread emails into buckets with summaries.

import { prisma } from './prisma'
import { getPendingClinicAssignments } from './virtual-clinic/encounter-service'
import Anthropic from '@anthropic-ai/sdk'
import { getCalendarProvider, getEmailProvider } from './assistant/providers'
import type { CalendarEvent, Email } from './assistant/providers'
import { getAdviseeStats } from './faculty/advisee-service'
import { getMyActionItems } from './faculty/committee-service'

const anthropic = new Anthropic()

// ─── Types ──────────────────────────────────────────────────

export interface EmailTriage {
  emailId: string
  summary: string
  bucket: 'decision' | 'waiting' | 'fyi' | 'noise'
  quickReplies: string[]
  question: string | null
  deadline: string | null
}

export interface CalendarAnnotation {
  eventId: string
  note: string
  hasConflict: boolean
}

export interface CommunityBriefing {
  studyStreak: number
  sessionsThisWeek: number
  activeRoomsNow: number
  groupmatesStudying: string[]
}

export interface BriefingData {
  greeting: string
  date: string
  stats: {
    unreadEmails: number
    todayEvents: number
    pendingTasks: number
    overdueTasks: number
    adviseeHoldCount: number
    committeeActionsDueSoon: number
  }
  emails: (Email & { triage?: EmailTriage })[]
  calendar: (CalendarEvent & { annotation?: CalendarAnnotation })[]
  tasks: {
    id: string
    title: string
    dueAt: Date | null
    status: string
    isOverdue: boolean
  }[]
  community?: CommunityBriefing
  _studentGreetingOverride?: string
}

// ─── Main Briefing Function ─────────────────────────────────

export async function getBriefing(userId: string): Promise<BriefingData> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, role: true, department: true },
  })

  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)
  const tomorrowEnd = new Date(todayEnd)
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1)

  const facultyStatsPromise =
    user?.role === 'EDUCATOR' || user?.role === 'ADMIN'
      ? Promise.all([getAdviseeStats(userId), getMyActionItems(userId)])
          .then(([adviseeStats, actionItems]) => ({
            adviseeHoldCount: adviseeStats.withHolds,
            committeeActionsDueSoon: actionItems.filter((item) => {
              if (!item.dueDate) return false
              const due = new Date(item.dueDate)
              const daysUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
              return daysUntilDue >= 0 && daysUntilDue <= 3
            }).length,
          }))
          .catch(() => ({
            adviseeHoldCount: 0,
            committeeActionsDueSoon: 0,
          }))
      : Promise.resolve({
          adviseeHoldCount: 0,
          committeeActionsDueSoon: 0,
        })

  // Parallel fetch: calendar, emails, tasks
  const [calendar, emailProvider, pendingTasks, overdueTasks, facultyStats] = await Promise.all([
    getCalendarProvider(),
    getEmailProvider(),
    prisma.assistantTask.findMany({
      where: { userId, status: 'pending', dueAt: { gte: now } },
      orderBy: { dueAt: 'asc' },
    }),
    prisma.assistantTask.findMany({
      where: { userId, status: 'pending', dueAt: { lt: now } },
      orderBy: { dueAt: 'asc' },
    }),
    facultyStatsPromise,
  ])

  const [events, allEmails] = await Promise.all([
    calendar.getEvents(userId, todayStart, tomorrowEnd),
    emailProvider.getInbox(userId, { limit: 50 }),
  ])

  // Split calendar into today vs tomorrow
  const todayEvents = events.filter(e => e.startTime >= todayStart && e.startTime <= todayEnd)
  const unreadEmails = allEmails.filter(e => !e.isRead)

  // Generate AI triage for unread emails
  let triageMap: Map<string, EmailTriage> = new Map()
  if (unreadEmails.length > 0) {
    triageMap = await triageEmails(unreadEmails, user?.name ?? 'User')
  }

  // Annotate calendar events
  const annotatedEvents = annotateCalendar(todayEvents)

  // Build greeting
  const hour = now.getHours()
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.name?.split(' ')[0] ?? 'there'
  const greeting = `${timeGreeting}, ${firstName}.`

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const dateStr = `${dayNames[now.getDay()]}, ${monthNames[now.getMonth()]} ${now.getDate()}`

  // Virtual Clinic assignments (students only, non-blocking)
  const clinicTasks: { id: string; title: string; dueAt: Date | null; status: string; isOverdue: boolean }[] = []
  if (user?.role === 'STUDENT') {
    try {
      const enrollments = await prisma.courseEnrollment.findMany({
        where: { studentId: userId },
        select: { courseId: true },
      })
      const pending = await getPendingClinicAssignments(
        userId,
        enrollments.map(e => e.courseId),
      )
      for (const a of pending) {
        clinicTasks.push({
          id: `vc-${a.id}`,
          title: a.title,
          dueAt: a.dueAt,
          status: 'pending',
          isOverdue: a.dueAt !== null && a.dueAt < now,
        })
      }
    } catch {
      // Non-fatal
    }
  }

  // Combine tasks (including Virtual Clinic assignments)
  const allTasks = [
    ...overdueTasks.map(t => ({ id: t.id, title: t.title, dueAt: t.dueAt, status: t.status, isOverdue: true })),
    ...clinicTasks.filter(t => t.isOverdue),
    ...pendingTasks.map(t => ({ id: t.id, title: t.title, dueAt: t.dueAt, status: t.status, isOverdue: false })),
    ...clinicTasks.filter(t => !t.isOverdue),
  ]

  // Community data (non-blocking)
  let community: CommunityBriefing | undefined
  try {
    const weekAgo = new Date(now.getTime() - 7 * 86400000)
    const [streakData, activeRooms, weekSessions] = await Promise.all([
      prisma.liveRoomParticipant.findMany({
        where: { userId },
        select: { joinedAt: true },
        orderBy: { joinedAt: 'desc' },
        take: 30,
      }),
      prisma.liveRoom.count({ where: { phase: { not: 'COMPLETE' } } }),
      prisma.liveRoomParticipant.count({ where: { userId, joinedAt: { gte: weekAgo } } }),
    ])

    // Simple streak calc
    const days = new Set(streakData.map(p => p.joinedAt.toISOString().slice(0, 10)))
    const today = now.toISOString().slice(0, 10)
    let streak = 0
    const d = new Date(today + 'T00:00:00Z')
    while (days.has(d.toISOString().slice(0, 10))) {
      streak++
      d.setUTCDate(d.getUTCDate() - 1)
    }
    // If not active today, check from yesterday
    if (streak === 0) {
      const y = new Date(now.getTime() - 86400000)
      const yd = new Date(y.toISOString().slice(0, 10) + 'T00:00:00Z')
      while (days.has(yd.toISOString().slice(0, 10))) {
        streak++
        yd.setUTCDate(yd.getUTCDate() - 1)
      }
    }

    // Find groupmates currently in active rooms
    const userGroups = await prisma.chatMembership.findMany({
      where: { userId },
      select: { groupId: true },
    })
    const groupIds = userGroups.map(g => g.groupId)
    const activeGroupmates = groupIds.length > 0
      ? await prisma.liveRoomParticipant.findMany({
          where: {
            userId: { not: userId },
            room: { phase: { not: 'COMPLETE' }, channel: { groupId: { in: groupIds } } },
          },
          select: { user: { select: { name: true } } },
          distinct: ['userId'],
          take: 5,
        })
      : []

    community = {
      studyStreak: streak,
      sessionsThisWeek: weekSessions,
      activeRoomsNow: activeRooms,
      groupmatesStudying: activeGroupmates.map(p => p.user.name),
    }
  } catch {
    // Non-fatal
  }

  return {
    greeting,
    date: dateStr,
    stats: {
      unreadEmails: unreadEmails.length,
      todayEvents: todayEvents.length,
      pendingTasks: pendingTasks.length,
      overdueTasks: overdueTasks.length,
      adviseeHoldCount: facultyStats.adviseeHoldCount,
      committeeActionsDueSoon: facultyStats.committeeActionsDueSoon,
    },
    emails: allEmails.map(e => ({
      ...e,
      triage: triageMap.get(e.id),
    })),
    calendar: annotatedEvents.map(({ event, annotation }) => ({
      ...event,
      annotation,
    })),
    tasks: allTasks,
    community,
  }
}

// ─── Email Triage (one Haiku call) ──────────────────────────

async function triageEmails(
  emails: Email[],
  userName: string,
): Promise<Map<string, EmailTriage>> {
  const emailSummaries = emails.map((e, i) => (
    `[${i}] id="${e.id}" from="${e.fromName}" subject="${e.subject}" category="${e.category}" snippet="${e.snippet ?? e.body.slice(0, 200)}"`
  )).join('\n')

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: `You are Sandy, an AI chief of staff triaging emails for ${userName}. For each email, provide:
1. A one-sentence summary in second person ("Dean Robinson needs your TEK-100 assessment data by next week.")
2. A bucket: "decision" (needs their input/action), "waiting" (someone expects a reply), "fyi" (informational), "noise" (newsletters, auto-notifications)
3. 2-3 quick reply options (short, natural phrases they could send as a reply)
4. Any extracted question the sender is asking (null if none)
5. Any extracted deadline (null if none)

Respond with ONLY valid JSON: an array of objects with keys: index, summary, bucket, quickReplies, question, deadline.
Be concise and direct. Use "you/your" not "the user".`,
      messages: [{
        role: 'user',
        content: `Triage these ${emails.length} unread emails:\n\n${emailSummaries}`,
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
    // Extract JSON from potential markdown code blocks
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return new Map()

    const triageResults = JSON.parse(jsonMatch[0]) as {
      index: number
      summary: string
      bucket: 'decision' | 'waiting' | 'fyi' | 'noise'
      quickReplies: string[]
      question: string | null
      deadline: string | null
    }[]

    const map = new Map<string, EmailTriage>()
    for (const result of triageResults) {
      const email = emails[result.index]
      if (email) {
        map.set(email.id, {
          emailId: email.id,
          summary: result.summary,
          bucket: result.bucket,
          quickReplies: result.quickReplies ?? [],
          question: result.question ?? null,
          deadline: result.deadline ?? null,
        })
      }
    }
    return map
  } catch {
    // Fallback: return empty triage (cards still show without AI summaries)
    return new Map()
  }
}

// ─── Calendar Annotations ───────────────────────────────────

function annotateCalendar(
  events: CalendarEvent[],
): { event: CalendarEvent; annotation: CalendarAnnotation }[] {
  // Detect conflicts (overlapping events)
  const sorted = [...events].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
  const conflicts = new Set<string>()

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].startTime < sorted[i].endTime) {
        conflicts.add(sorted[i].id)
        conflicts.add(sorted[j].id)
      }
    }
  }

  return sorted.map(event => {
    let note = ''

    // Category-specific notes
    if (event.category === 'office-hours') {
      note = 'Open drop-in hours — check for student questions in email.'
    } else if (event.attendees.length > 0) {
      const count = event.attendees.length
      note = `${count} attendee${count > 1 ? 's' : ''} — ${event.attendees.slice(0, 2).map(a => a.split('@')[0]).join(', ')}${count > 2 ? ` +${count - 2}` : ''}`
    } else if (event.category === 'personal') {
      note = 'Personal — protected time.'
    } else if (event.category === 'lecture') {
      note = event.description ?? 'Regular lecture session.'
    }

    return {
      event,
      annotation: {
        eventId: event.id,
        note,
        hasConflict: conflicts.has(event.id),
      },
    }
  })
}
