import { NextRequest, NextResponse } from 'next/server'
import { requireStudentUser, isAuthFailure } from '../../lib/server-auth'
import { listTeachBackSessions } from '../../lib/teach-back-service'
import { withErrorHandling } from '../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireStudentUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    const courseId = req.nextUrl.searchParams.get('courseId') ?? undefined
    const result = await listTeachBackSessions(user.id, courseId)
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
