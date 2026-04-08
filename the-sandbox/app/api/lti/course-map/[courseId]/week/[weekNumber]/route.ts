import { NextRequest, NextResponse } from 'next/server'
import { verifyWeekDeepLinkToken } from '../../../../../../lib/course-map-service'
import { withErrorHandling } from '../../../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; weekNumber: string }> }
) => {
    const { courseId, weekNumber } = await params
    const token = req.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 401 })
    }

    const payload = verifyWeekDeepLinkToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    // Verify token claims match route params
    if (payload.courseId !== courseId || String(payload.weekNumber) !== weekNumber) {
      return NextResponse.json({ error: 'Token does not match route' }, { status: 403 })
    }

    const redirectUrl = `/courses?course=${courseId}&tab=course-map&expandWeek=${weekNumber}`
    return NextResponse.redirect(new URL(redirectUrl, req.nextUrl.origin))
  })
