// Enrollment lifecycle — see docs/COURSE_PLATFORM_ARCHITECTURE.md §7, §9.

import { prisma } from '../prisma'
import type { User } from '../../generated/prisma'

export class EnrollmentError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export const EnrollmentService = {
  async enroll(user: User, courseId: string) {
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, status: true, instructorId: true } })
    if (!course) throw new EnrollmentError('Course not found', 404)
    // Owners and admins can preview drafts; students need PUBLISHED.
    const isPrivileged = user.role === 'ADMIN' || course.instructorId === user.id
    if (course.status !== 'PUBLISHED' && !isPrivileged) {
      throw new EnrollmentError('Course is not open for enrollment', 403)
    }
    return prisma.enrollment.upsert({
      where: { userId_courseId: { userId: user.id, courseId } },
      create: { userId: user.id, courseId, role: 'STUDENT' },
      update: {},
    })
  },

  async listForUser(user: User) {
    return prisma.enrollment.findMany({
      where: { userId: user.id },
      include: {
        course: {
          select: { id: true, slug: true, title: true, description: true, status: true, instructor: { select: { name: true } } },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    })
  },

  async requireEnrollment(user: User, courseId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    })
    if (!enrollment) throw new EnrollmentError('Not enrolled', 403)
    return enrollment
  },

  async markCompleteIfDone(enrollmentId: string) {
    // Sets completedAt when every lesson in the course has a COMPLETED LessonProgress for this enrollment
    // and every assessment has at least one passing submission.
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: { include: { modules: { include: { lessons: { include: { assessments: true } } } } } },
        progress: true,
        submissions: true,
      },
    })
    if (!enrollment || enrollment.completedAt) return enrollment

    const lessons = enrollment.course.modules.flatMap((m) => m.lessons)
    if (lessons.length === 0) return enrollment

    const completedLessonIds = new Set(
      enrollment.progress.filter((p) => p.status === 'COMPLETED').map((p) => p.lessonId),
    )
    const allLessonsDone = lessons.every((l) => completedLessonIds.has(l.id))
    if (!allLessonsDone) return enrollment

    const assessments = lessons.flatMap((l) => l.assessments)
    const passedAssessmentIds = new Set(
      enrollment.submissions
        .filter((s) => s.score != null && s.score >= 0.7) // default passing; per-assessment passingScore enforced upstream
        .map((s) => s.assessmentId),
    )
    const allAssessmentsPassed = assessments.every((a) => passedAssessmentIds.has(a.id))
    if (!allAssessmentsPassed) return enrollment

    return prisma.enrollment.update({ where: { id: enrollmentId }, data: { completedAt: new Date() } })
  },
}
