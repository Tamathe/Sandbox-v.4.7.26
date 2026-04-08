import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { getCampusAIPulse } from '../../../lib/ai-literacy/campus-pulse-service'

// GET — cohort overview by college/department
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  if (auth.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  // Get all colleges/departments with faculty count and readiness
  const users = await prisma.user.findMany({
    where: { role: 'EDUCATOR' },
    select: {
      id: true,
      college: true,
      department: true,
      aiLiteracyProfile: { select: { stance: true, quickStartCompleted: true } },
    },
  })

  // Group by college
  const collegeMap = new Map<string, {
    total: number
    withStance: number
    quickStartCompleted: number
  }>()

  for (const u of users) {
    const college = u.college ?? 'Unknown'
    const entry = collegeMap.get(college) ?? { total: 0, withStance: 0, quickStartCompleted: 0 }
    entry.total++
    if (u.aiLiteracyProfile?.stance) entry.withStance++
    if (u.aiLiteracyProfile?.quickStartCompleted) entry.quickStartCompleted++
    collegeMap.set(college, entry)
  }

  const cohorts = Array.from(collegeMap.entries())
    .map(([college, data]) => ({
      college,
      totalFaculty: data.total,
      withStance: data.withStance,
      stanceCoverage: data.total > 0 ? Math.round((data.withStance / data.total) * 100) : 0,
      quickStartCompleted: data.quickStartCompleted,
      quickStartRate: data.total > 0 ? Math.round((data.quickStartCompleted / data.total) * 100) : 0,
    }))
    .sort((a, b) => b.totalFaculty - a.totalFaculty)

  const pulse = await getCampusAIPulse()

  return NextResponse.json({ cohorts, pulse }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
