import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'

export async function GET(req: NextRequest) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const enrollments = await prisma.courseEnrollment.findMany({
    where: { studentId: user.id },
    include: {
      course: {
        select: {
          id: true,
          courseCode: true,
          title: true,
          instructor: { select: { name: true } },
          objectives: {
            select: { id: true, title: true, moduleNumber: true, orderIndex: true },
            orderBy: [{ moduleNumber: 'asc' }, { orderIndex: 'asc' }],
          },
        },
      },
    },
    orderBy: { enrolledAt: 'asc' },
  })

  // For each course, attach the student's progress
  const courseIds = enrollments.map((e) => e.courseId)
  const progress = await prisma.studentObjectiveProgress.findMany({
    where: { studentId: user.id, courseId: { in: courseIds } },
    select: { objectiveId: true, masteryLevel: true, courseId: true },
  })
  const progressMap = new Map(progress.map((p) => [p.objectiveId, p.masteryLevel]))

  const courses = enrollments.map((e) => {
    const objectives = e.course.objectives.map((o) => ({
      ...o,
      masteryLevel: (progressMap.get(o.id) ?? 'not_started') as string,
    }))
    const total = objectives.length
    const mastered = objectives.filter((o) => o.masteryLevel === 'mastered').length
    const struggling = objectives.filter((o) => o.masteryLevel === 'struggling').length
    // Next objective: first not_started by module order
    const nextObjective = objectives.find((o) => o.masteryLevel === 'not_started') ?? null
    return {
      courseId: e.courseId,
      courseCode: e.course.courseCode,
      title: e.course.title,
      instructorName: e.course.instructor.name,
      enrolledAt: e.enrolledAt,
      total,
      mastered,
      struggling,
      notStarted: total - mastered - struggling,
      completionPct: total > 0 ? Math.round((mastered / total) * 100) : 0,
      nextObjective,
    }
  })

  return NextResponse.json({ courses })
}
