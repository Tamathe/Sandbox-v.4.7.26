import { prisma } from '../prisma'

export type TimelineItemStatus = 'submitted' | 'graded' | 'upcoming' | 'due-soon' | 'overdue'

export interface TimelineItem {
  id: string
  title: string
  category: string
  type: string
  dueAt: string
  pointsPossible: number | null
  status: TimelineItemStatus
  score: number | null
  weekNumber: number | null
  hasRubric: boolean
  submittedAt: string | null
}

export interface TimelineWeek {
  weekNumber: number
  title: string
  startDate: string | null
  endDate: string | null
}

export interface CourseTimelineData {
  weeks: TimelineWeek[]
  items: TimelineItem[]
  currentWeek: number
  semesterStart: string
  semesterEnd: string
}

function computeStatus(
  dueAt: Date,
  submission: { submittedAt: Date; gradebookEntry: { aiScore: number | null; facultyScore: number | null } | null } | null,
  now: Date,
): { status: TimelineItemStatus; score: number | null; submittedAt: string | null } {
  if (submission) {
    const score = submission.gradebookEntry?.facultyScore ?? submission.gradebookEntry?.aiScore ?? null
    const submittedAt = submission.submittedAt.toISOString()
    if (submission.gradebookEntry) {
      return { status: 'graded', score, submittedAt }
    }
    return { status: 'submitted', score: null, submittedAt }
  }

  const hoursUntilDue = (dueAt.getTime() - now.getTime()) / (1000 * 60 * 60)
  if (hoursUntilDue < 0) return { status: 'overdue', score: null, submittedAt: null }
  if (hoursUntilDue <= 48) return { status: 'due-soon', score: null, submittedAt: null }
  return { status: 'upcoming', score: null, submittedAt: null }
}

function computeCurrentWeek(weeks: { startDate: Date | null; endDate: Date | null; weekNumber: number }[], now: Date): number {
  for (const w of weeks) {
    if (w.startDate && w.endDate && now >= w.startDate && now <= w.endDate) {
      return w.weekNumber
    }
  }
  const sorted = weeks.filter(w => w.startDate).sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime())
  if (sorted.length === 0) return 0
  if (now < sorted[0].startDate!) return 0
  return sorted[sorted.length - 1].weekNumber
}

export async function getCourseTimeline(courseId: string, userId: string): Promise<CourseTimelineData> {
  const now = new Date()

  const [weeks, assignments] = await Promise.all([
    prisma.courseWeek.findMany({
      where: { courseId },
      orderBy: { orderIndex: 'asc' },
      select: { weekNumber: true, title: true, startDate: true, endDate: true },
    }),
    prisma.assignment.findMany({
      where: { courseId, isPublished: true, dueAt: { not: null } },
      orderBy: { dueAt: 'asc' },
      select: {
        id: true,
        title: true,
        category: true,
        type: true,
        dueAt: true,
        pointsPossible: true,
        rubricId: true,
        week: { select: { weekNumber: true } },
        submissions: {
          where: { studentId: userId },
          take: 1,
          select: {
            submittedAt: true,
            gradebookEntry: {
              select: { aiScore: true, facultyScore: true },
            },
          },
        },
      },
    }),
  ])

  const timelineWeeks: TimelineWeek[] = weeks.map(w => ({
    weekNumber: w.weekNumber,
    title: w.title,
    startDate: w.startDate?.toISOString() ?? null,
    endDate: w.endDate?.toISOString() ?? null,
  }))

  const items: TimelineItem[] = assignments.map(a => {
    const sub = a.submissions[0] ?? null
    const { status, score, submittedAt } = computeStatus(a.dueAt!, sub, now)
    return {
      id: a.id,
      title: a.title,
      category: a.category ?? 'other',
      type: a.type,
      dueAt: a.dueAt!.toISOString(),
      pointsPossible: a.pointsPossible,
      status,
      score,
      weekNumber: a.week?.weekNumber ?? null,
      hasRubric: !!a.rubricId,
      submittedAt,
    }
  })

  const weeksWithDates = weeks.filter(w => w.startDate && w.endDate)
  const currentWeek = computeCurrentWeek(
    weeks.map(w => ({ startDate: w.startDate, endDate: w.endDate, weekNumber: w.weekNumber })),
    now,
  )

  const startDates = weeksWithDates.map(w => w.startDate!.getTime())
  const endDates = weeksWithDates.map(w => w.endDate!.getTime())
  const semesterStart = startDates.length > 0 ? new Date(Math.min(...startDates)).toISOString() : now.toISOString()
  const semesterEnd = endDates.length > 0 ? new Date(Math.max(...endDates)).toISOString() : now.toISOString()

  return { weeks: timelineWeeks, items, currentWeek, semesterStart, semesterEnd }
}
