import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { prisma } from '../../../../lib/prisma'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth
  const searchParams = req.nextUrl.searchParams
  const requestedUserId = searchParams.get('userId')

  // Students see own data only; educators/admins can pass ?userId= for another student
  let targetUserId = user.id
  if (requestedUserId && requestedUserId !== user.id) {
    if (user.role !== 'EDUCATOR' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    targetUserId = requestedUserId
  }

  const now = new Date()

  const conceptStates = await prisma.conceptState.findMany({
    where: { userId: targetUserId },
    include: {
      course: { select: { id: true, courseCode: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  if (conceptStates.length === 0) {
    return NextResponse.json({ concepts: [] })
  }

  const slugs = [...new Set(conceptStates.map((cs) => cs.conceptSlug))]

  // Count sessions and get most recent touch per concept slug
  const sessionStats = await prisma.$queryRawUnsafe<
    { conceptSlug: string; sessionCount: bigint; lastTouchedAt: Date | null }[]
  >(
    `SELECT
       unnest."conceptSlug",
       COUNT(ts.id) AS "sessionCount",
       MAX(ts."startedAt") AS "lastTouchedAt"
     FROM (SELECT unnest($1::text[]) AS "conceptSlug") unnest
     LEFT JOIN "ToolSession" ts
       ON ts."userId" = $2
       AND unnest."conceptSlug" = ANY(ts."conceptsTouched")
     GROUP BY unnest."conceptSlug"`,
    slugs,
    targetUserId,
  ).catch(() => [] as { conceptSlug: string; sessionCount: bigint; lastTouchedAt: Date | null }[])

  const statsMap = new Map(
    sessionStats.map((s) => [
      s.conceptSlug,
      { sessionCount: Number(s.sessionCount), lastTouchedAt: s.lastTouchedAt },
    ]),
  )

  const concepts = conceptStates.map((cs) => {
    const stats = statsMap.get(cs.conceptSlug)
    return {
      conceptSlug: cs.conceptSlug,
      courseId: cs.courseId,
      courseCode: cs.course.courseCode,
      bloomHighWater: cs.bloomHighWater,
      nextReviewAt: cs.nextReviewAt?.toISOString() ?? null,
      missedReviews: cs.missedReviews,
      stabilityFactor: cs.stabilityFactor,
      isOverdue: cs.nextReviewAt ? cs.nextReviewAt < now : false,
      sessionCount: stats?.sessionCount ?? 0,
      lastTouchedAt: stats?.lastTouchedAt?.toISOString() ?? null,
    }
  })

  // Sort: overdue first, then by bloomHighWater desc
  concepts.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1
    if (!a.isOverdue && b.isOverdue) return 1
    return (b.bloomHighWater ?? 0) - (a.bloomHighWater ?? 0)
  })

  return NextResponse.json({ concepts }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
