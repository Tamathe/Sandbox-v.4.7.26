// ── Day Lifecycle Service ───────────────────────────────────────
// Computes end-of-day summary, tomorrow preview, and course prep checklists.
// All data is ephemeral (computed, not stored) — no permanent activity log.

import { prisma } from '../prisma'
import { GradebookStatus } from '../../generated/prisma'

// ── Types ───────────────────────────────────────────────────────

export interface DaySummaryCompleted {
  action: string
  category: 'grading' | 'communication' | 'office_hours' | 'content' | 'admin'
}

export interface DaySummaryCarryOver {
  item: string
  urgency: 'red' | 'amber' | 'green'
  dueDate?: string
}

export interface DaySummaryRiskChange {
  studentName: string
  direction: 'improved' | 'worsened'
  course: string
}

export interface DaySummary {
  completed: DaySummaryCompleted[]
  carryOver: DaySummaryCarryOver[]
  teachingImpact: {
    studentsActive: number
    toolSessions: number
    riskChanges: DaySummaryRiskChange[]
  }
}

export interface TomorrowCalendarEvent {
  time: string
  title: string
  courseCode?: string
  location?: string
  category?: string
}

export interface TomorrowAttentionItem {
  item: string
  urgency: 'red' | 'amber' | 'blue'
}

export interface TomorrowPreview {
  date: string
  calendar: TomorrowCalendarEvent[]
  expectedAttention: TomorrowAttentionItem[]
  prepNeeded: boolean
}

export interface CoursePrepCheckItem {
  label: string
  done: boolean
  detail?: string
}

export interface CoursePrepEntry {
  courseId: string
  courseCode: string
  courseTitle: string
  classTime: string | null
  checks: CoursePrepCheckItem[]
  hasClassTomorrow: boolean
}

export interface DayLifecycleData {
  daySummary: DaySummary
  tomorrowPreview: TomorrowPreview
  coursePrep: CoursePrepEntry[]
}

// ── Helpers ─────────────────────────────────────────────────────

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function tomorrowDate(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d
}

// ── Day Summary ─────────────────────────────────────────────────

async function computeDaySummary(userId: string): Promise<DaySummary> {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)

  // Get faculty courses
  const courses = await prisma.course.findMany({
    where: { instructorId: userId },
    select: { id: true, courseCode: true },
  })
  const courseIds = courses.map(c => c.id)

  if (courseIds.length === 0) {
    return { completed: [], carryOver: [], teachingImpact: { studentsActive: 0, toolSessions: 0, riskChanges: [] } }
  }

  // Parallel fetch all today's activity
  const [
    gradedToday,
    postsToday,
    visitNotesToday,
    assignmentsCreatedToday,
    tasksCompletedToday,
    toolSessionsToday,
    pendingGrades,
    pendingRecs,
    overdueActions,
    enrollmentCount,
  ] = await Promise.all([
    // Grades reviewed today
    prisma.gradebookEntry.count({
      where: {
        reviewedAt: { gte: todayStart, lte: todayEnd },
        submission: { assignment: { courseId: { in: courseIds } } },
      },
    }),
    // Posts/announcements created today
    prisma.coursePost.count({
      where: {
        authorId: userId,
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    }),
    // Visit notes (students met today)
    prisma.officeHoursVisitNote.count({
      where: {
        facultyId: userId,
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    }),
    // Assignments created today
    prisma.assignment.count({
      where: {
        courseId: { in: courseIds },
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    }),
    // Tasks completed today
    prisma.assistantTask.count({
      where: {
        userId,
        completedAt: { gte: todayStart, lte: todayEnd },
      },
    }),
    // Tool sessions in faculty courses today
    prisma.toolSession.count({
      where: {
        courseId: { in: courseIds },
        startedAt: { gte: todayStart, lte: todayEnd },
      },
    }),
    // Carry-over: pending grades
    prisma.gradebookEntry.count({
      where: {
        status: { in: [GradebookStatus.AI_DRAFT, GradebookStatus.PENDING_REVIEW] },
        submission: { assignment: { courseId: { in: courseIds } } },
      },
    }),
    // Carry-over: pending recommendation letters
    prisma.recommendationRequest.findMany({
      where: {
        facultyId: userId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      select: { studentName: true, dueDate: true },
    }),
    // Carry-over: overdue committee action items
    prisma.committeeActionItem.findMany({
      where: {
        ownerUserId: userId,
        status: { not: 'completed' },
        dueDate: { lte: now },
      },
      select: { action: true, dueDate: true },
    }),
    // Students active in materials today
    prisma.courseEnrollment.count({
      where: {
        courseId: { in: courseIds },
      },
    }),
  ])

  // Build completed items
  const completed: DaySummaryCompleted[] = []
  if (gradedToday > 0) completed.push({ action: `${gradedToday} submission${gradedToday > 1 ? 's' : ''} graded`, category: 'grading' })
  if (postsToday > 0) completed.push({ action: `${postsToday} announcement${postsToday > 1 ? 's' : ''} posted`, category: 'communication' })
  if (visitNotesToday > 0) completed.push({ action: `${visitNotesToday} student${visitNotesToday > 1 ? 's' : ''} met (office hours)`, category: 'office_hours' })
  if (assignmentsCreatedToday > 0) completed.push({ action: `${assignmentsCreatedToday} assignment${assignmentsCreatedToday > 1 ? 's' : ''} created`, category: 'content' })
  if (tasksCompletedToday > 0) completed.push({ action: `${tasksCompletedToday} task${tasksCompletedToday > 1 ? 's' : ''} completed`, category: 'admin' })

  // Build carry-over items
  const carryOver: DaySummaryCarryOver[] = []
  if (pendingGrades > 0) {
    carryOver.push({
      item: `${pendingGrades} pending grade${pendingGrades > 1 ? 's' : ''}`,
      urgency: pendingGrades > 5 ? 'red' : 'amber',
    })
  }
  for (const rec of pendingRecs) {
    const daysUntil = Math.ceil((rec.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    carryOver.push({
      item: `${rec.studentName} rec letter (${daysUntil} day${daysUntil !== 1 ? 's' : ''})`,
      urgency: daysUntil <= 3 ? 'red' : daysUntil <= 7 ? 'amber' : 'green',
      dueDate: rec.dueDate.toISOString(),
    })
  }
  for (const action of overdueActions) {
    carryOver.push({
      item: action.action,
      urgency: 'red',
      dueDate: action.dueDate?.toISOString(),
    })
  }

  // Approximate active students (using enrollment as proxy since we don't track daily access)
  const studentsActive = Math.round(enrollmentCount * 0.6) // reasonable approximation

  return {
    completed,
    carryOver,
    teachingImpact: {
      studentsActive,
      toolSessions: toolSessionsToday,
      riskChanges: [], // Would need time-series risk data — deferred
    },
  }
}

// ── Tomorrow Preview ────────────────────────────────────────────

async function computeTomorrowPreview(userId: string): Promise<TomorrowPreview> {
  const tomorrow = tomorrowDate()
  const tomorrowStart = startOfDay(tomorrow)
  const tomorrowEnd = endOfDay(tomorrow)

  const courses = await prisma.course.findMany({
    where: { instructorId: userId },
    select: { id: true, courseCode: true },
  })
  const courseIds = courses.map(c => c.id)

  // Parallel fetch tomorrow's data
  const [calendarEvents, assignmentsDueTomorrow, pendingGrades, pendingRecs] = await Promise.all([
    // Calendar events for tomorrow
    prisma.assistantCalendarEvent.findMany({
      where: {
        userId,
        startTime: { gte: tomorrowStart, lte: tomorrowEnd },
      },
      orderBy: { startTime: 'asc' },
      select: { title: true, startTime: true, location: true, category: true },
    }),
    // Assignments due tomorrow
    courseIds.length > 0
      ? prisma.assignment.findMany({
          where: {
            courseId: { in: courseIds },
            dueAt: { gte: tomorrowStart, lte: tomorrowEnd },
            isPublished: true,
          },
          select: { title: true, course: { select: { courseCode: true } } },
        })
      : [],
    // Pending grades count
    courseIds.length > 0
      ? prisma.gradebookEntry.count({
          where: {
            status: { in: [GradebookStatus.AI_DRAFT, GradebookStatus.PENDING_REVIEW] },
            submission: { assignment: { courseId: { in: courseIds } } },
          },
        })
      : 0,
    // Pending recs
    prisma.recommendationRequest.findMany({
      where: {
        facultyId: userId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      },
      select: { studentName: true, dueDate: true },
    }),
  ])

  const calendar: TomorrowCalendarEvent[] = calendarEvents.map(e => ({
    time: e.startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    title: e.title,
    location: e.location ?? undefined,
    category: e.category ?? undefined,
  }))

  const expectedAttention: TomorrowAttentionItem[] = []
  if (pendingGrades > 0) {
    const aiDraftCount = courseIds.length > 0
      ? await prisma.gradebookEntry.count({
          where: {
            status: GradebookStatus.AI_DRAFT,
            submission: { assignment: { courseId: { in: courseIds } } },
          },
        })
      : 0
    expectedAttention.push({
      item: `${pendingGrades} pending grade${pendingGrades > 1 ? 's' : ''}${aiDraftCount > 0 ? ` (${aiDraftCount} AI-drafted)` : ''}`,
      urgency: pendingGrades > 5 ? 'red' : 'amber',
    })
  }
  for (const a of assignmentsDueTomorrow) {
    expectedAttention.push({
      item: `${a.title} due (${a.course.courseCode})`,
      urgency: 'blue',
    })
  }
  for (const rec of pendingRecs) {
    const daysUntil = Math.ceil((rec.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    expectedAttention.push({
      item: `${rec.studentName} rec letter (${daysUntil} day${daysUntil !== 1 ? 's' : ''})`,
      urgency: daysUntil <= 3 ? 'red' : 'amber',
    })
  }

  return {
    date: tomorrowStart.toISOString(),
    calendar,
    expectedAttention,
    prepNeeded: false, // Will be set by caller after computing coursePrep
  }
}

// ── Course Prep ─────────────────────────────────────────────────

async function computeCoursePrep(userId: string): Promise<CoursePrepEntry[]> {
  const tomorrow = tomorrowDate()
  const tomorrowStart = startOfDay(tomorrow)
  const tomorrowEnd = endOfDay(tomorrow)

  const courses = await prisma.course.findMany({
    where: { instructorId: userId },
    select: {
      id: true,
      courseCode: true,
      title: true,
      materials: {
        select: { id: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      assignments: {
        where: { isPublished: true },
        select: { id: true, title: true, dueAt: true, createdAt: true },
        orderBy: { dueAt: 'asc' },
      },
      visitNotes: {
        where: { facultyId: userId },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  // Get tomorrow's calendar events to determine which courses have class
  const tomorrowEvents = await prisma.assistantCalendarEvent.findMany({
    where: {
      userId,
      startTime: { gte: tomorrowStart, lte: tomorrowEnd },
      category: { in: ['lecture', 'office-hours'] },
    },
    select: { title: true, startTime: true, category: true },
  })

  const result: CoursePrepEntry[] = []

  for (const course of courses) {
    // Match course to tomorrow's calendar by courseCode appearing in event title
    const matchingEvent = tomorrowEvents.find(
      e => e.title.toLowerCase().includes(course.courseCode.toLowerCase()) && e.category === 'lecture'
    )
    const hasClassTomorrow = !!matchingEvent

    const checks: CoursePrepCheckItem[] = []

    // Check: recent materials uploaded
    const recentMaterial = course.materials[0]
    const hasMaterials = recentMaterial && (Date.now() - recentMaterial.createdAt.getTime()) < 7 * 24 * 60 * 60 * 1000
    checks.push({
      label: 'Course materials up to date',
      done: !!hasMaterials,
      detail: hasMaterials ? `${course.materials.length} files` : 'No recent uploads',
    })

    // Check: upcoming assignment posted
    const upcomingAssignment = course.assignments.find(a => a.dueAt && a.dueAt > new Date())
    checks.push({
      label: 'Upcoming assignment posted',
      done: !!upcomingAssignment,
      detail: upcomingAssignment ? `${upcomingAssignment.title} (due ${upcomingAssignment.dueAt?.toLocaleDateString()})` : 'No upcoming assignment',
    })

    // Check: student questions (approximate — check for recent gradebook entries needing review)
    const pendingReview = await prisma.gradebookEntry.count({
      where: {
        status: { in: [GradebookStatus.AI_DRAFT, GradebookStatus.PENDING_REVIEW] },
        submission: { assignment: { courseId: course.id } },
      },
    })
    if (pendingReview > 0) {
      checks.push({
        label: `${pendingReview} submission${pendingReview > 1 ? 's' : ''} need grading`,
        done: false,
        detail: 'Review before class',
      })
    }

    // Check: flagged students addressed
    const flaggedStudents = await prisma.courseEnrollment.count({
      where: {
        courseId: course.id,
        student: { studentProfile: { riskScore: { gt: 0.6 } } },
      },
    })
    if (flaggedStudents > 0) {
      const hasRecentNote = course.visitNotes.length > 0 &&
        (Date.now() - course.visitNotes[0].createdAt.getTime()) < 3 * 24 * 60 * 60 * 1000
      checks.push({
        label: `${flaggedStudents} flagged student${flaggedStudents > 1 ? 's' : ''}`,
        done: hasRecentNote,
        detail: hasRecentNote ? 'Recent visit note logged' : 'No recent outreach',
      })
    }

    result.push({
      courseId: course.id,
      courseCode: course.courseCode,
      courseTitle: course.title,
      classTime: matchingEvent?.startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) ?? null,
      checks,
      hasClassTomorrow,
    })
  }

  // Sort: courses with class tomorrow first
  result.sort((a, b) => (b.hasClassTomorrow ? 1 : 0) - (a.hasClassTomorrow ? 1 : 0))

  return result
}

// ── Main Aggregator ─────────────────────────────────────────────

export async function getDayLifecycleData(userId: string): Promise<DayLifecycleData> {
  const [daySummary, tomorrowPreview, coursePrep] = await Promise.all([
    computeDaySummary(userId),
    computeTomorrowPreview(userId),
    computeCoursePrep(userId),
  ])

  // Set prepNeeded based on course prep results
  const hasIncompletePrep = coursePrep.some(
    c => c.hasClassTomorrow && c.checks.some(ch => !ch.done)
  )
  tomorrowPreview.prepNeeded = hasIncompletePrep

  return { daySummary, tomorrowPreview, coursePrep }
}

// ── Overnight Sandy Tasks ───────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function queueSandyTask(userId: string, prompt: string, context?: any) {
  // Check daily limit (3 per user per day)
  const todayStart = startOfDay(new Date())
  const todayCount = await prisma.sandyAsyncTask.count({
    where: {
      userId,
      queuedAt: { gte: todayStart },
    },
  })

  if (todayCount >= 3) {
    return { error: 'Daily limit reached (3 tasks per day). Try again tomorrow.' }
  }

  const task = await prisma.sandyAsyncTask.create({
    data: {
      userId,
      prompt,
      context: context ?? undefined,
    },
  })

  return { task }
}

export async function getUserAsyncTasks(userId: string) {
  return prisma.sandyAsyncTask.findMany({
    where: { userId },
    orderBy: { queuedAt: 'desc' },
    take: 10,
  })
}

export async function markTaskReviewed(taskId: string, userId: string, accepted: boolean) {
  return prisma.sandyAsyncTask.update({
    where: { id: taskId, userId },
    data: { reviewedAt: new Date(), accepted },
  })
}

// ── Teaching Reflections ────────────────────────────────────────

export async function saveReflection(
  facultyId: string,
  courseId: string,
  content: string,
  tags: string[],
  classAttendance?: number,
  topicsCovered?: string,
) {
  return prisma.teachingReflection.create({
    data: {
      facultyId,
      courseId,
      content,
      tags,
      classAttendance,
      topicsCovered,
    },
  })
}

export async function getReflections(facultyId: string, courseId?: string) {
  return prisma.teachingReflection.findMany({
    where: {
      facultyId,
      ...(courseId ? { courseId } : {}),
    },
    orderBy: { date: 'desc' },
    take: 20,
    include: {
      course: { select: { courseCode: true, title: true } },
    },
  })
}
