import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getPulseHistory } from '../../../../lib/classroom-intelligence/classroom-intelligence-service'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { courseId } = await params
  const weeksParam = req.nextUrl.searchParams.get('weeks')
  const weeks = weeksParam ? parseInt(weeksParam, 10) : 12

  const history = await getPulseHistory(courseId, weeks)
  const latest = history.length > 0 ? history[0] : null

  return NextResponse.json({ history, latest }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
