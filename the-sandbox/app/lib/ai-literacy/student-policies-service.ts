import { prisma } from '../prisma'

export interface CourseWithPolicy {
  course: { id: string; title: string; code: string; instructor: string }
  policy: {
    id: string
    stance: string
    policyText: string
    publishedToStudents: boolean
    publishedAt: string | null
  } | null
  clarityScore: number | null
  hasTakenClarityCheck: boolean
}

export async function getEnrolledCoursePolicies(userId: string): Promise<CourseWithPolicy[]> {
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { studentId: userId },
    include: {
      course: {
        include: {
          instructor: { select: { name: true } },
          courseAIPolicy: {
            select: {
              id: true,
              stance: true,
              policyText: true,
              publishedToStudents: true,
              publishedAt: true,
            },
          },
        },
      },
    },
  })

  // For each course, check if the student has taken a clarity check
  const courseIds = enrollments.map((e) => e.courseId)
  const clarityResponses = await prisma.clarityCheckResponse.findMany({
    where: { userId, courseId: { in: courseIds } },
    select: { courseId: true, score: true },
    orderBy: { createdAt: 'desc' },
  })

  // Build a map of courseId → latest clarity score
  const clarityMap = new Map<string, number>()
  for (const r of clarityResponses) {
    if (!clarityMap.has(r.courseId)) {
      clarityMap.set(r.courseId, r.score)
    }
  }

  return enrollments.map((enrollment) => {
    const course = enrollment.course
    const policy = course.courseAIPolicy
    const clarityScore = clarityMap.get(course.id) ?? null

    return {
      course: {
        id: course.id,
        title: course.title,
        code: course.courseCode,
        instructor: course.instructor.name,
      },
      policy: policy
        ? {
            id: policy.id,
            stance: policy.stance,
            policyText: policy.policyText,
            publishedToStudents: policy.publishedToStudents,
            publishedAt: policy.publishedAt?.toISOString() ?? null,
          }
        : null,
      clarityScore,
      hasTakenClarityCheck: clarityScore !== null,
    }
  })
}
