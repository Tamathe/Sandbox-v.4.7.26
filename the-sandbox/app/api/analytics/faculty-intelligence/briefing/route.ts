import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireEducatorUser, isAuthFailure } from '../../../../lib/server-auth'
import { prisma } from '../../../../lib/prisma'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const courseId = req.nextUrl.searchParams.get('courseId') ?? undefined

  const briefing = await prisma.facultyBriefing.findFirst({
    where: {
      userId: user.id,
      stale: false,
      ...(courseId ? { courseId } : {}),
    },
    orderBy: { generatedAt: 'desc' },
  })

  if (!briefing) {
    return NextResponse.json({ briefing: null, needsGeneration: true })
  }

  return NextResponse.json({ briefing }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})