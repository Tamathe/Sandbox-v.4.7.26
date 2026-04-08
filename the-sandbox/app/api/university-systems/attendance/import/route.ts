import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { importAttendanceCSV } from '../../../../lib/university-systems-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { courseId, csvContent } = parsed.data as { courseId?: string; csvContent?: string }

  if (!courseId || !csvContent) {
    return NextResponse.json({ error: 'courseId and csvContent are required' }, { status: 400 })
  }

  const result = await importAttendanceCSV(courseId, auth.user.id, csvContent)
  return NextResponse.json(result, { status: 201 })
})
