import { format } from 'date-fns'
import type { FacultyHomepageV2Data } from '../../lib/faculty/homepage-types'

export interface BriefingStats {
  unreadEmails: number
  todayEvents: number
  pendingTasks: number
  overdueTasks: number
  adviseeHoldCount: number
  committeeActionsDueSoon: number
}

export interface BriefingEmail {
  id: string
  fromAddress: string
  fromName: string
  subject: string
  body: string
  snippet: string | null
  category: string | null
  isRead: boolean
  receivedAt: string
  triage?: {
    emailId: string
    summary: string
    bucket: 'decision' | 'waiting' | 'fyi' | 'noise'
    quickReplies: string[]
    question: string | null
    deadline: string | null
  }
}

export interface BriefingCalendarEvent {
  id: string
  title: string
  description: string | null
  startTime: string
  endTime: string
  location: string | null
  attendees: string[]
  category: string | null
  annotation?: {
    note: string
    hasConflict: boolean
  }
}

export interface BriefingTask {
  id: string
  title: string
  dueAt: string | null
  status: string
  isOverdue: boolean
}

export interface BriefingData {
  greeting: string
  date: string
  stats: BriefingStats
  emails: BriefingEmail[]
  calendar: BriefingCalendarEvent[]
  tasks: BriefingTask[]
  facultyHomepageV2?: FacultyHomepageV2Data | null
  _studentGreetingOverride?: string
  _briefingChips?: string[]
  community?: {
    studyStreak: number
    sessionsThisWeek: number
    activeRoomsNow: number
    groupmatesStudying: string[]
  }
}

export function buildBriefingGreeting(data: BriefingData): { text: string; chips: string[] } {
  if (data._studentGreetingOverride) {
    // First-run intro can pass custom chips
    if (data._briefingChips && data._briefingChips.length > 0) {
      return { text: data._studentGreetingOverride, chips: data._briefingChips }
    }

    const overdue = data.tasks.filter(task => task.isOverdue)
    const chips: string[] = []
    if (overdue.length > 0) chips.push(`Help me with "${overdue[0].title.split(' (')[0]}"`)
    chips.push('Quiz me on my weakest topics')
    if (data.calendar.length > 0) chips.push("What's my day look like?")
    if (data.community?.groupmatesStudying && data.community.groupmatesStudying.length > 0) {
      chips.push(`Join ${data.community.groupmatesStudying[0]} studying now`)
    } else if (data.community?.studyStreak && data.community.studyStreak >= 2) {
      chips.push(`Keep my ${data.community.studyStreak}-day streak going`)
    } else if (chips.length < 3) {
      chips.push('Start a study session')
    }
    if (chips.length < 4) chips.push('Plan my study time')
    return { text: data._studentGreetingOverride, chips }
  }

  const chips: string[] = []
  const lines: string[] = [data.greeting]

  const unread = data.emails.filter(email => !email.isRead)
  const urgent = unread.find(email => email.triage?.bucket === 'decision' || email.category === 'urgent')
  const overdue = data.tasks.filter(task => task.isOverdue)
  const events = data.calendar
  const nextMeeting = events.find(
    event => event.category !== 'lecture' && event.category !== 'office-hours',
  )
  const facultyV2 = data.facultyHomepageV2
  const nextRecommendation = facultyV2?.recommendations.find(
    recommendation => recommendation.daysUntilDue >= 0 && recommendation.daysUntilDue <= 14,
  )
  const pendingGrading = facultyV2?.quickActions.pendingGradeCount ?? 0
  const committeeActionsDueSoon =
    facultyV2?.committees.reduce((sum, committee) => sum + committee.actionItemsDue, 0) ??
    data.stats.committeeActionsDueSoon ??
    0
  const adviseeHoldCount = facultyV2?.advisees.withHolds ?? data.stats.adviseeHoldCount ?? 0

  if (urgent) {
    const from = urgent.fromName || urgent.fromAddress.split('@')[0]
    const topic = urgent.triage?.summary
      ? truncate(urgent.triage.summary, 60)
      : truncate(urgent.subject, 60)
    lines.push(`${from} sent something that looks time-sensitive - "${topic}"`)
    if (urgent.triage?.deadline) {
      lines.push(`Deadline mentioned: ${urgent.triage.deadline}.`)
    }
    if (nextMeeting) {
      const time = formatEventTime(nextMeeting.startTime)
      lines.push(`You have ${nextMeeting.title} at ${time}, so there's a window to handle this first.`)
    }
    chips.push(`Draft a reply to ${from}`)
    if (unread.length > 1) chips.push("Let's walk through all my email")
  } else if (overdue.length > 0) {
    const first = overdue[0]
    lines.push(
      `"${truncate(first.title, 40)}" is overdue${overdue.length > 1 ? ` along with ${overdue.length - 1} other task${overdue.length > 2 ? 's' : ''}` : ''}. Want to knock ${overdue.length === 1 ? 'it' : 'one'} out?`,
    )
    chips.push(`Help me with "${truncate(first.title, 25)}"`)
    if (overdue.length > 1) chips.push('Show all overdue')
  } else if (nextMeeting) {
    const time = formatEventTime(nextMeeting.startTime)
    lines.push(`Your next key event is ${nextMeeting.title} at ${time}. Want me to pull together any prep?`)
    chips.push(`Prep me for ${truncate(nextMeeting.title, 25)}`)
  } else if (unread.length > 0) {
    lines.push(`${unread.length} email${unread.length > 1 ? 's' : ''} came in overnight - nothing urgent, but a few worth a look.`)
    chips.push('Walk through my emails')
  } else {
    lines.push("Nothing urgent today - rare breather. Good time to get ahead on things.")
  }

  if (!urgent && !nextMeeting && events.length > 0) {
    const time = formatEventTime(events[0].startTime)
    lines.push(`First up today: ${events[0].title} at ${time}.`)
  }

  const facultyPriorityLine =
    nextRecommendation
      ? `${nextRecommendation.studentName}'s recommendation for ${nextRecommendation.targetOrg} is due in ${nextRecommendation.daysUntilDue} days.`
      : committeeActionsDueSoon > 0
        ? `${committeeActionsDueSoon} committee action${committeeActionsDueSoon > 1 ? 's are' : ' is'} due.`
        : adviseeHoldCount > 0
          ? `${adviseeHoldCount} advisee${adviseeHoldCount > 1 ? 's have' : ' has'} registration holds.`
          : pendingGrading > 0
            ? `${pendingGrading} submissions are waiting for review.`
            : null

  if (facultyPriorityLine) {
    lines.push(facultyPriorityLine)
  }

  if (events.length > 0 && !chips.some(chip => chip.includes('schedule') || chip.includes('Prep'))) {
    chips.push("What's on my schedule?")
  }
  if (chips.length < 4 && pendingGrading > 0) {
    chips.push('Catch me up on grading')
  }
  if (chips.length < 4 && committeeActionsDueSoon > 0) {
    chips.push('Show committee actions')
  }
  if (chips.length < 4 && adviseeHoldCount > 0) {
    chips.push('Review advisee holds')
  }
  if (chips.length < 4 && nextRecommendation) {
    chips.push(`Start ${nextRecommendation.studentName.split(' ')[0]}'s recommendation`)
  }
  if (chips.length < 3 && unread.length > 0 && !chips.some(chip => chip.includes('email'))) {
    chips.push('Walk through my emails')
  }
  if (chips.length < 3) {
    chips.push('Catch me up on my courses')
  }

  return { text: lines.join('\n\n'), chips }
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

function formatEventTime(iso: string): string {
  try {
    return format(new Date(iso), 'h:mm a')
  } catch {
    return ''
  }
}
