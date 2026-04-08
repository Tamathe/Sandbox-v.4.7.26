// Assessment grading — auto / AI-suggested / manual flows.
// See docs/COURSE_PLATFORM_ARCHITECTURE.md §8.

import { prisma } from '../prisma'
import type { Assessment, User } from '../../generated/prisma'
import { CoursePermissionError, CourseValidationError } from './course-service'
import { EnrollmentService } from './enrollment-service'

type RubricChoiceQuestion = {
  id: string
  prompt: string
  choices: { id: string; text: string; correct?: boolean }[]
}

type RubricShortAnswerQuestion = {
  id: string
  prompt: string
  acceptableAnswers: string[] // case-insensitive match
}

type RubricFreeResponseCriterion = {
  id: string
  description: string
  maxPoints: number
}

type RubricShape = {
  questions?: (RubricChoiceQuestion | RubricShortAnswerQuestion)[]
  criteria?: RubricFreeResponseCriterion[]
}

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

function autoGrade(assessment: Assessment, payload: Record<string, unknown>): number {
  const rubric = assessment.rubric as RubricShape
  const questions = rubric.questions ?? []
  if (questions.length === 0) return 0
  let correct = 0
  for (const q of questions) {
    const answer = payload[q.id]
    if (answer == null) continue
    if ('choices' in q) {
      const expected = q.choices.find((c) => c.correct)?.id
      if (expected && answer === expected) correct++
    } else if ('acceptableAnswers' in q) {
      const a = typeof answer === 'string' ? normalize(answer) : ''
      if (q.acceptableAnswers.some((acc) => normalize(acc) === a)) correct++
    }
  }
  return correct / questions.length
}

export const AssessmentService = {
  async submit(user: User, assessmentId: string, payload: Record<string, unknown>) {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { lesson: { include: { module: { select: { courseId: true } } } } },
    })
    if (!assessment) throw new CourseValidationError('Assessment not found')

    const enrollment = await EnrollmentService.requireEnrollment(user, assessment.lesson.module.courseId)

    let score: number | null = null
    let gradingMode: 'AUTO' | 'AI_SUGGESTED' | 'MANUAL' = 'MANUAL'
    if (assessment.type === 'MULTIPLE_CHOICE' || assessment.type === 'SHORT_ANSWER') {
      score = autoGrade(assessment, payload)
      gradingMode = 'AUTO'
    } else {
      // FREE_RESPONSE — leave score null until educator (or AI suggestion) grades it.
      gradingMode = 'AI_SUGGESTED'
    }

    return prisma.submission.create({
      data: {
        assessmentId,
        enrollmentId: enrollment.id,
        userId: user.id,
        payload,
        score,
        gradingMode,
        gradedAt: score != null ? new Date() : null,
      },
    })
  },

  async grade(user: User, submissionId: string, score: number, gradingMode: 'MANUAL' | 'AI_SUGGESTED' = 'MANUAL') {
    const sub = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { assessment: { include: { lesson: { include: { module: { include: { course: true } } } } } } },
    })
    if (!sub) throw new CourseValidationError('Submission not found')
    const course = sub.assessment.lesson.module.course
    if (user.role !== 'ADMIN' && course.instructorId !== user.id) throw new CoursePermissionError()

    // Submissions are immutable; create a new row that supersedes the old one.
    return prisma.submission.create({
      data: {
        assessmentId: sub.assessmentId,
        enrollmentId: sub.enrollmentId,
        userId: sub.userId,
        payload: sub.payload as object,
        score,
        gradingMode,
        gradedById: user.id,
        gradedAt: new Date(),
        supersedesId: sub.id,
      },
    })
  },

  async gradebook(user: User, courseId: string) {
    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course) throw new CourseValidationError('Course not found')
    if (user.role !== 'ADMIN' && course.instructorId !== user.id) throw new CoursePermissionError()
    return prisma.submission.findMany({
      where: { assessment: { lesson: { module: { courseId } } }, supersededBy: null },
      include: {
        user: { select: { id: true, name: true, email: true } },
        assessment: { select: { id: true, type: true, lesson: { select: { id: true, title: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
  },
}
