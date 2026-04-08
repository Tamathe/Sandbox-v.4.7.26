import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { compareSections } from '../../../../lib/classroom-intelligence/cross-section-service'
import { getCurrentSemester } from '../../../../lib/classroom-intelligence/classroom-intelligence-service'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ courseCode: string }> }) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { courseCode } = await params
  const comparison = await compareSections(courseCode, getCurrentSemester())

  return NextResponse.json(comparison, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
