/**
 * GET /api/cron/mei-refresh
 *
 * Daily cron: recomputes MEI scores for all published TOOL_ASSESSMENT
 * assignments with open assessment windows.
 *
 * Auth: CRON_SECRET Bearer token (timing-safe comparison, fail-closed).
 * Concurrency: processes up to 3 assignments in parallel; students sequential.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { computeMEI } from '../../../lib/mei-scoring-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const cronError = verifyCronSecret(request)
  if (cronError) return cronError

  const start = Date.now()
  const now = new Date()

  try {
    const assignments = await prisma.assignment.findMany({
      where: {
        isPublished: true,
        type: 'TOOL_ASSESSMENT',
        OR: [
          { assessmentWindowEnd: null },
          { assessmentWindowEnd: { gt: now } },
        ],
      },
      select: { id: true, courseId: true },
    })

    let processed = 0
    let scored = 0
    let errors = 0

    // Process assignments in chunks of 3
    for (let i = 0; i < assignments.length; i += 3) {
      const chunk = assignments.slice(i, i + 3)

      await Promise.all(
        chunk.map(async (assignment) => {
          processed++

          const enrollments = await prisma.courseEnrollment.findMany({
            where: { courseId: assignment.courseId },
            select: { studentId: true },
          })

          // Process students in parallel within each assignment
          const results = await Promise.allSettled(
            enrollments.map(enrollment => computeMEI(enrollment.studentId, assignment.id))
          )
          for (const r of results) {
            if (r.status === 'fulfilled' && r.value) {
              scored++
            } else {
              if (r.status === 'rejected') {
                console.error('[cron/mei-refresh] Error scoring student for assignment', assignment.id, r.reason)
              }
              errors++
            }
          }
        }),
      )
    }

    const durationMs = Date.now() - start

    return NextResponse.json({
      ok: true,
      processed,
      scored,
      errors,
      durationMs,
    }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  } catch (err) {
    console.error('[cron/mei-refresh] Fatal error:', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
})
