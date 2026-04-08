import { type NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { generateFacultyBriefing } from '../../../lib/analytics/briefing'
import { withErrorHandling } from '../../../lib/api-utils'

const STALE_HOURS = 24

export const POST = withErrorHandling(async (req: NextRequest) => {
  const denied = verifyCronSecret(req)
  if (denied) return denied

  const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000)

  // Find all educators who own at least one course
  const educators = await prisma.user.findMany({
    where: {
      role: { in: ['EDUCATOR', 'ADMIN'] },
      courses: { some: {} },
    },
    select: { id: true, courses: { select: { id: true } } },
  })

  // Build queue of (userId, courseId) pairs
  const queue = educators.flatMap(edu =>
    edu.courses.map(course => ({ userId: edu.id, courseId: course.id })),
  )

  // Check which pairs already have a fresh briefing
  const freshBriefings = await prisma.facultyBriefing.findMany({
    where: {
      stale: false,
      generatedAt: { gte: cutoff },
      OR: queue.map(({ userId, courseId }) => ({ userId, courseId })),
    },
    select: { userId: true, courseId: true },
  })

  const freshSet = new Set(
    freshBriefings.map(b => `${b.userId}:${b.courseId ?? ''}`),
  )

  const toRefresh = queue.filter(
    ({ userId, courseId }) => !freshSet.has(`${userId}:${courseId}`),
  )

  let refreshed = 0
  const skipped = queue.length - toRefresh.length
  const errors: string[] = []

  // Process with concurrency limit of 3
  for (let i = 0; i < toRefresh.length; i += 3) {
    const batch = toRefresh.slice(i, i + 3)
    const results = await Promise.allSettled(
      batch.map(({ userId, courseId }) => generateFacultyBriefing(userId, courseId)),
    )
    for (const result of results) {
      if (result.status === 'fulfilled') {
        refreshed++
      } else {
        const msg = result.reason instanceof Error ? result.reason.message : String(result.reason)
        errors.push(msg)
        console.error('[CRON] faculty briefing refresh error:', msg)
      }
    }
  }

  return NextResponse.json({ refreshed, skipped, errors })
})
