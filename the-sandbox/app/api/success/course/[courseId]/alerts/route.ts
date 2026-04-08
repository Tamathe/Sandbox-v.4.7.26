import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { getCourseAlerts } from '../../../../../lib/success/alert-service'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const { courseId } = await params
  const alerts = await getCourseAlerts(courseId, user.id, user.role)

  return NextResponse.json(alerts, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
