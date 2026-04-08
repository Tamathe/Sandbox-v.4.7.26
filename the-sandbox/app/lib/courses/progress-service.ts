// Per-lesson progress tracking — see docs/COURSE_PLATFORM_ARCHITECTURE.md §7.

import { prisma } from '../prisma'
import type { LessonProgressStatus, User } from '../../generated/prisma'
import { EnrollmentService, EnrollmentError } from './enrollment-service'

export const ProgressService = {
  async upsert(user: User, lessonId: string, status: LessonProgressStatus, score?: number) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { select: { courseId: true } } },
    })
    if (!lesson) throw new EnrollmentError('Lesson not found', 404)

    const enrollment = await EnrollmentService.requireEnrollment(user, lesson.module.courseId)

    const now = new Date()
    const progress = await prisma.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
      create: {
        enrollmentId: enrollment.id,
        lessonId,
        status,
        score,
        lastSeenAt: now,
        completedAt: status === 'COMPLETED' ? now : undefined,
      },
      update: {
        status,
        score: score ?? undefined,
        lastSeenAt: now,
        completedAt: status === 'COMPLETED' ? now : undefined,
      },
    })

    if (status === 'COMPLETED') {
      // Best-effort completion check; ignore failures.
      EnrollmentService.markCompleteIfDone(enrollment.id).catch((err) =>
        console.error('[course-platform] markCompleteIfDone failed', err),
      )
    }

    return progress
  },

  async forCourse(user: User, courseId: string) {
    const enrollment = await EnrollmentService.requireEnrollment(user, courseId)
    return prisma.lessonProgress.findMany({ where: { enrollmentId: enrollment.id } })
  },
}
