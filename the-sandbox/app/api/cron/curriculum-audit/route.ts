/**
 * POST /api/cron/curriculum-audit
 *
 * Nightly cron: runs all four curriculum detectors for every course that has at
 * least one enrollment.  Courses are processed sequentially to avoid hammering
 * the Haiku API with concurrent narrative-generation requests.
 *
 * Auth: CRON_SECRET Bearer token (timing-safe comparison, fail-closed).
 * Vercel cron schedule: daily at 03:00 UTC.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { verifyCronSecret } from '../../../lib/server-auth'
import { runCurriculumAudit } from '../../../lib/curriculum-audit'
import { withErrorHandling } from '../../../lib/api-utils'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (request: NextRequest) => {
  const cronError = verifyCronSecret(request)
  if (cronError) return cronError

  const start = Date.now()

  // Fetch all courses with at least 1 enrollment
  const enrolled = await prisma.courseEnrollment.groupBy({
    by: ['courseId'],
    _count: { id: true },
    having: { id: { _count: { gte: 1 } } },
  })
  const courseIds = enrolled.map((r) => r.courseId)

  let coursesAudited = 0
  let alertsCreated = 0

  // Process sequentially — Haiku narrative generation; parallel would spike rate limits
  for (const courseId of courseIds) {
    try {
      const newAlertIds = await runCurriculumAudit(courseId)
      alertsCreated += newAlertIds.length
      coursesAudited++
    } catch (err) {
      // Log and continue — one bad course must not abort the batch
      console.error(`[cron/curriculum-audit] Course ${courseId} failed:`, err)
    }
  }

  const durationMs = Date.now() - start
  return NextResponse.json({ ok: true, coursesAudited, alertsCreated, durationMs })
})
