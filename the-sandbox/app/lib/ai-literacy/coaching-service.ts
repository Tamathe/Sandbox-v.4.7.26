/**
 * AI Literacy Coaching — Sandy-mediated tier.
 * Provides comprehensive readiness assessment and recommended next steps.
 */

import { prisma } from '../prisma'

export interface CoachingBrief {
  readinessScore: number // 0-100
  stanceStatus: 'none' | 'completed'
  stance: string | null
  policyCoverage: number // 0-100
  coursesWithPolicy: number
  totalCourses: number
  coursesWithoutPolicy: string[] // course codes
  assignmentsScanned: number
  quickStartCompleted: boolean
  recommendedNextStep: {
    action: string
    reason: string
    path: string
  }
}

export async function getCoachingBrief(userId: string): Promise<CoachingBrief> {
  const [profile, courses, policies, stanceHistory] = await Promise.all([
    prisma.aILiteracyProfile.findUnique({ where: { userId } }),
    prisma.course.findMany({
      where: { instructorId: userId },
      select: { id: true, courseCode: true },
    }),
    prisma.courseAIPolicy.findMany({
      where: { course: { instructorId: userId } },
      select: { courseId: true },
    }),
    prisma.stanceHistory.count({ where: { userId } }),
  ])

  const policySet = new Set(policies.map(p => p.courseId))
  const coursesWithoutPolicy = courses
    .filter(c => !policySet.has(c.id))
    .map(c => c.courseCode)

  const totalCourses = courses.length
  const coursesWithPolicy = policies.length
  const policyCoverage = totalCourses > 0 ? Math.round((coursesWithPolicy / totalCourses) * 100) : 0

  const hasStance = !!profile?.stance
  const hasQuickStart = !!profile?.quickStartCompleted

  // Readiness score: weighted composite
  let readinessScore = 0
  if (hasStance) readinessScore += 30
  readinessScore += Math.round(policyCoverage * 0.5) // up to 50 points
  if (stanceHistory > 0) readinessScore += 10 // engagement bonus
  if (hasQuickStart) readinessScore += 10

  // Recommended next step
  let recommendedNextStep: CoachingBrief['recommendedNextStep']
  if (!hasStance) {
    recommendedNextStep = {
      action: 'Take the AI Stance Assessment',
      reason: 'Understanding your position on AI in teaching is the foundation for everything else.',
      path: '/ai-literacy/stance',
    }
  } else if (coursesWithoutPolicy.length > 0) {
    recommendedNextStep = {
      action: `Build an AI policy for ${coursesWithoutPolicy[0]}`,
      reason: `${coursesWithoutPolicy.length} course${coursesWithoutPolicy.length > 1 ? 's' : ''} still need${coursesWithoutPolicy.length === 1 ? 's' : ''} AI policies.`,
      path: '/ai-literacy/policy',
    }
  } else if (policyCoverage >= 100) {
    recommendedNextStep = {
      action: 'Scan your assignments for AI vulnerability',
      reason: 'All courses have policies — now check if your assignments align with them.',
      path: '/ai-literacy/assignments',
    }
  } else {
    recommendedNextStep = {
      action: 'Explore process-based assessment templates',
      reason: 'Shift from detection to visibility with checkpoint-based grading.',
      path: '/ai-literacy/process',
    }
  }

  return {
    readinessScore: Math.min(100, readinessScore),
    stanceStatus: hasStance ? 'completed' : 'none',
    stance: profile?.stance ?? null,
    policyCoverage,
    coursesWithPolicy,
    totalCourses,
    coursesWithoutPolicy,
    assignmentsScanned: 0, // Would need AssignmentAIAnalysis model to track
    quickStartCompleted: hasQuickStart,
    recommendedNextStep,
  }
}
