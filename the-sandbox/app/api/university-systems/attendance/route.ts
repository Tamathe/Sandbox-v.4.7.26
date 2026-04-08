import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { logAttendance, getAttendanceSummary } from '../../../lib/university-systems-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { courseId, records, date } = parsed.data as { courseId?: string; records?: { studentId: string; status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE' }[]; date?: string }

  if (!courseId || !Array.isArray(records)) {
    return NextResponse.json({ error: 'courseId and records array are required' }, { status: 400 })
  }

  const result = await logAttendance(courseId, auth.user.id, records, date)
  return NextResponse.json(result, { status: 201 })
})

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const courseId = req.nextUrl.searchParams.get('courseId')

  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }

  const result = await getAttendanceSummary(courseId)
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
