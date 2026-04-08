import { NextRequest, NextResponse } from 'next/server'
import { requireStudentUser, isAuthFailure } from '../../../lib/server-auth'
import { getSuggestions } from '../../../lib/study-match-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireStudentUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    const courseId = req.nextUrl.searchParams.get('courseId')
    if (!courseId) {
      return NextResponse.json({ error: 'courseId query parameter is required' }, { status: 400 })
    }

    const suggestions = await getSuggestions(user.id, courseId)
    return NextResponse.json({ suggestions }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
