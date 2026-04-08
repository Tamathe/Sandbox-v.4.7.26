/**
 * Campus AI Pulse — aggregated readiness metrics across the institution.
 * Computed on-the-fly from existing models (no separate snapshot table needed).
 */

import { prisma } from '../prisma'

export interface CampusAIPulse {
  totalCourses: number
  coursesWithPolicy: number
  policyCoverage: number // 0-100
  stanceDistribution: Record<string, number>
  totalRedesigns: number // StanceHistory entries (proxy for engagement)
  totalProfilesWithStance: number
  trendVsLastMonth: {
    policyCoverageChange: number // delta in percentage points
    newStances: number
  }
  departmentBreakdown: {
    department: string
    totalCourses: number
    withPolicy: number
    coverage: number
  }[]
}

export async function getCampusAIPulse(): Promise<CampusAIPulse> {
  const now = new Date()
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // All queries in parallel
  const [
    totalCourses,
    coursesWithPolicy,
    stanceGroups,
    totalProfilesWithStance,
    newStancesThisMonth,
    policiesLastMonth,
    departmentCourses,
  ] = await Promise.all([
    prisma.course.count(),
    prisma.courseAIPolicy.count(),
    prisma.aILiteracyProfile.groupBy({
      by: ['stance'],
      _count: { stance: true },
      where: { stance: { not: null } },
    }),
    prisma.aILiteracyProfile.count({ where: { stance: { not: null } } }),
    prisma.stanceHistory.count({ where: { createdAt: { gte: oneMonthAgo } } }),
    prisma.courseAIPolicy.count({ where: { createdAt: { lt: oneMonthAgo } } }),
    prisma.course.findMany({
      select: {
        instructor: { select: { department: true } },
        courseAIPolicy: { select: { id: true } },
      },
    }),
  ])

  // Stance distribution
  const stanceDistribution: Record<string, number> = {
    PROHIBIT: 0, CAUTIOUS: 0, GUIDED: 0, INTEGRATE: 0, REQUIRE: 0,
  }
  for (const g of stanceGroups) {
    if (g.stance) stanceDistribution[g.stance] = g._count.stance
  }

  // Policy coverage
  const policyCoverage = totalCourses > 0 ? Math.round((coursesWithPolicy / totalCourses) * 100) : 0

  // Trend: policy coverage change
  const lastMonthCoverage = totalCourses > 0 ? Math.round((policiesLastMonth / totalCourses) * 100) : 0
  const policyCoverageChange = policyCoverage - lastMonthCoverage

  // Department breakdown
  const deptMap = new Map<string, { total: number; withPolicy: number }>()
  for (const c of departmentCourses) {
    const dept = c.instructor.department ?? 'Unknown'
    const entry = deptMap.get(dept) ?? { total: 0, withPolicy: 0 }
    entry.total++
    if (c.courseAIPolicy) entry.withPolicy++
    deptMap.set(dept, entry)
  }

  const departmentBreakdown = Array.from(deptMap.entries())
    .map(([department, d]) => ({
      department,
      totalCourses: d.total,
      withPolicy: d.withPolicy,
      coverage: d.total > 0 ? Math.round((d.withPolicy / d.total) * 100) : 0,
    }))
    .sort((a, b) => b.totalCourses - a.totalCourses)

  return {
    totalCourses,
    coursesWithPolicy,
    policyCoverage,
    stanceDistribution,
    totalRedesigns: newStancesThisMonth, // reusing as engagement proxy
    totalProfilesWithStance,
    trendVsLastMonth: {
      policyCoverageChange,
      newStances: newStancesThisMonth,
    },
    departmentBreakdown,
  }
}
