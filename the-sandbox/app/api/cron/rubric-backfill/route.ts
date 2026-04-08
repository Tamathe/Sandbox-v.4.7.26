import { type NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { backfillRubricBreakdowns } from '../../../lib/analytics/rubric-breakdown-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const denied = verifyCronSecret(req)
  if (denied) return denied

  // Find courses that have graded submissions missing rubric breakdowns
  const coursesWithGaps = await prisma.course.findMany({
    where: {
      assignments: {
        some: {
          submissions: {
            some: {
              gradebookEntry: { aiScore: { not: null } },
              rubricBreakdown: null,
            },
          },
        },
      },
    },
    select: { id: true },
  })

  let totalGenerated = 0
  const errors: string[] = []

  // Process sequentially — backfillRubricBreakdowns has internal concurrency of 3
  for (const course of coursesWithGaps) {
    try {
      const result = await backfillRubricBreakdowns(course.id)
      totalGenerated += result.generated
      errors.push(...result.errors)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`Course ${course.id}: ${msg}`)
      console.error('[CRON] rubric backfill error:', msg)
    }
  }

  return NextResponse.json({
    coursesProcessed: coursesWithGaps.length,
    generated: totalGenerated,
    errors,
  })
})
