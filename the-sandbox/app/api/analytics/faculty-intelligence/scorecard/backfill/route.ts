import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { requireEducatorUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { backfillRubricBreakdowns } from '../../../../../lib/analytics/rubric-breakdown-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { courseId?: string }
  const courseId = body.courseId as string | undefined
  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
  }

  const result = await backfillRubricBreakdowns(courseId)
  return NextResponse.json(result)
})
