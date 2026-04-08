import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { getCourseRiskHeatmap } from '../../../../../lib/success/success-service'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { courseId } = await params
  const heatmap = await getCourseRiskHeatmap(courseId)

  return NextResponse.json(heatmap, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
