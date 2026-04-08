import { AssessmentScope } from '../../generated/prisma'
import { prisma } from '../prisma'

export interface FacultyAssessmentDeadlineItem {
  id: string
  title: string
  dueDate: string
  scope: AssessmentScope
  courseCode: string | null
  progress: string | null
}

const fallbackDeadlines: FacultyAssessmentDeadlineItem[] = [
  {
    id: 'assessment-sacscoc',
    title: 'SACSCOC Outcome Report',
    dueDate: new Date('2026-04-15T17:00:00-04:00').toISOString(),
    scope: AssessmentScope.INSTITUTION,
    courseCode: null,
    progress: 'TEK-100 data needed',
  },
  {
    id: 'assessment-midterm-grades',
    title: 'Mid-semester grades',
    dueDate: new Date('2026-03-31T17:00:00-04:00').toISOString(),
    scope: AssessmentScope.COURSE,
    courseCode: 'TEK-100',
    progress: '12 of 28 entered',
  },
]

function getFallbackDeadlines(): FacultyAssessmentDeadlineItem[] {
  return fallbackDeadlines
}

export async function getUpcomingDeadlines(userId: string): Promise<FacultyAssessmentDeadlineItem[]> {
  try {
    const [user, courses] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { department: true },
      }),
      prisma.course.findMany({
        where: { instructorId: userId },
        select: { id: true, courseCode: true },
      }),
    ])

    const courseIds = courses.map((course) => course.id)
    const deadlines = await prisma.assessmentDeadline.findMany({
      where: {
        OR: [
          courseIds.length > 0 ? { courseId: { in: courseIds } } : undefined,
          user?.department ? { department: user.department } : undefined,
          { scope: AssessmentScope.INSTITUTION },
        ].filter(Boolean) as object[],
      },
      include: {
        course: {
          select: { courseCode: true },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      take: 6,
    })

    if (deadlines.length === 0) return getFallbackDeadlines()

    return deadlines.map((deadline) => ({
      id: deadline.id,
      title: deadline.title,
      dueDate: deadline.dueDate.toISOString(),
      scope: deadline.scope,
      courseCode: deadline.course?.courseCode ?? null,
      progress: deadline.progressLabel ?? null,
    }))
  } catch (error) {
    console.warn('[faculty/assessment-service] Falling back to synthetic deadlines', error)
    return getFallbackDeadlines()
  }
}
