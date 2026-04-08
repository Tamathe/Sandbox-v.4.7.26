import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { getStudentAttendance } from '../../../../lib/university-systems-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const courseId = req.nextUrl.searchParams.get('courseId')
  const studentId = req.nextUrl.searchParams.get('studentId')

  if (!courseId || !studentId) {
    return NextResponse.json({ error: 'courseId and studentId are required' }, { status: 400 })
  }

  const result = await getStudentAttendance(courseId, studentId)
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
