import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireEducatorUser, isAuthFailure } from '../../../lib/server-auth'
import { getStudentBriefing, getSyntheticBriefing } from '../../../lib/faculty/student-briefing-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const studentId = req.nextUrl.searchParams.get('studentId')
  if (!studentId) {
    return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
  }

  const briefing = await getStudentBriefing(auth.user.id, studentId)

  // Fall back to synthetic data for demo
  if (!briefing) {
    const studentName = req.nextUrl.searchParams.get('studentName') ?? 'Maria Lopez'
    return NextResponse.json(getSyntheticBriefing(studentName, studentId))
  }

  return NextResponse.json(briefing, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
