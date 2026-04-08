import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { comparePoliciesAcrossCourses } from '../../../lib/policy-comparison-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const user = auth.user

  if (user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const enrollments = await prisma.courseEnrollment.findMany({
    where: { studentId: user.id },
    select: { courseId: true },
  })

  if (enrollments.length === 0) {
    return NextResponse.json({ courses: [] }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  const courseIds = enrollments.map(e => e.courseId)

  const [courses, policies, gradingWeights] = await Promise.all([
    prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: { id: true, courseCode: true, title: true },
    }),
    prisma.coursePolicy.findMany({
      where: { courseId: { in: courseIds } },
    }),
    prisma.gradingWeight.findMany({
      where: { courseId: { in: courseIds } },
    }),
  ])

  const policyMap = new Map<string, typeof policies>()
  for (const p of policies) {
    const arr = policyMap.get(p.courseId) ?? []
    arr.push(p)
    policyMap.set(p.courseId, arr)
  }

  const weightMap = new Map<string, typeof gradingWeights>()
  for (const w of gradingWeights) {
    const arr = weightMap.get(w.courseId) ?? []
    arr.push(w)
    weightMap.set(w.courseId, arr)
  }

  const result = courses
    .map(c => ({
      courseId: c.id,
      courseCode: c.courseCode,
      title: c.title,
      policies: policyMap.get(c.id) ?? [],
      gradingWeights: weightMap.get(c.id) ?? [],
    }))
    .filter(c => c.policies.length > 0 || c.gradingWeights.length > 0)

  // Cross-course comparison (Task 30)
  const comparison = comparePoliciesAcrossCourses(
    result.map(c => ({
      courseCode: c.courseCode,
      policies: c.policies.map(p => ({ policyType: p.policyType, title: p.title, content: p.content })),
      gradingWeights: c.gradingWeights.map(w => ({ category: w.category, weight: w.weight })),
    })),
  )

  return NextResponse.json({ courses: result, comparison })
})
