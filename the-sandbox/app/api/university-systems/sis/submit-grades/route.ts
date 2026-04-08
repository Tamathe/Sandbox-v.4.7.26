import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { submitGradesToSIS } from '../../../../lib/university-systems-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { courseId, grades } = parsed.data as { courseId?: string; grades?: { studentId: string; grade: string; lastAttendDate?: string | null }[] }

  if (!courseId || !Array.isArray(grades)) {
    return NextResponse.json({ error: 'courseId and grades array are required' }, { status: 400 })
  }

  const result = await submitGradesToSIS(courseId, grades)
  return NextResponse.json(result)
})
