import { prisma } from './prisma'

const RECOMMENDED_CATEGORIES = ['late', 'attendance', 'grading', 'academic_integrity']

interface CourseNeedingAttention {
  courseCode: string
  title: string
  missingCategories: string[]
}

export interface AdminPolicyCoverage {
  totalCourses: number
  coursesWithPolicies: number
  coursesComplete: number
  coursesWeightsOk: number
  platformAckRate: number
  coursesNeedingAttention: CourseNeedingAttention[]
}

export async function getAdminPolicyCoverage(): Promise<AdminPolicyCoverage> {
  const [allCourses, policies, weights, acks, enrollments] = await Promise.all([
    prisma.course.findMany({ select: { id: true, courseCode: true, title: true } }),
    prisma.coursePolicy.findMany({ select: { courseId: true, policyType: true } }),
    prisma.gradingWeight.findMany({ select: { courseId: true, weight: true } }),
    prisma.coursePolicyAck.count(),
    prisma.courseEnrollment.count(),
  ])

  const totalCourses = allCourses.length

  // Group policies by course
  const policiesByCourse = new Map<string, Set<string>>()
  for (const p of policies) {
    const set = policiesByCourse.get(p.courseId) ?? new Set()
    set.add(p.policyType)
    policiesByCourse.set(p.courseId, set)
  }

  // Group weights by course
  const weightsByCourse = new Map<string, number>()
  for (const w of weights) {
    weightsByCourse.set(w.courseId, (weightsByCourse.get(w.courseId) ?? 0) + w.weight)
  }

  const coursesWithPolicies = policiesByCourse.size

  let coursesComplete = 0
  let coursesWeightsOk = 0
  const needsAttention: CourseNeedingAttention[] = []

  for (const course of allCourses) {
    const cats = policiesByCourse.get(course.id)
    if (!cats) continue

    const missing = RECOMMENDED_CATEGORIES.filter(c => !cats.has(c))
    if (missing.length === 0) {
      coursesComplete++
    } else {
      needsAttention.push({
        courseCode: course.courseCode,
        title: course.title,
        missingCategories: missing,
      })
    }

    const totalWeight = weightsByCourse.get(course.id) ?? 0
    const totalPct = Math.round(totalWeight * 100)
    if (totalPct >= 98 && totalPct <= 102) {
      coursesWeightsOk++
    }
  }

  // Sort by most missing categories first, limit to 20
  needsAttention.sort((a, b) => b.missingCategories.length - a.missingCategories.length)
  const coursesNeedingAttention = needsAttention.slice(0, 20)

  // Platform-wide ack rate: total acks / total enrollments in courses with policies
  const courseIdsWithPolicies = new Set(policiesByCourse.keys())
  let enrollmentsWithPolicies = enrollments // simplified: use total enrollments
  if (courseIdsWithPolicies.size > 0 && courseIdsWithPolicies.size < totalCourses) {
    enrollmentsWithPolicies = await prisma.courseEnrollment.count({
      where: { courseId: { in: [...courseIdsWithPolicies] } },
    })
  }

  const platformAckRate = enrollmentsWithPolicies > 0
    ? Math.round((acks / enrollmentsWithPolicies) * 100)
    : 0

  return {
    totalCourses,
    coursesWithPolicies,
    coursesComplete,
    coursesWeightsOk,
    platformAckRate,
    coursesNeedingAttention,
  }
}
