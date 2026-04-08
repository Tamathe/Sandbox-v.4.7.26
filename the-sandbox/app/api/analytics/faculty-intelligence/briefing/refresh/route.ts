import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { requireEducatorUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { generateFacultyBriefing } from '../../../../../lib/analytics/briefing'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { courseId?: string }
  const courseId = body?.courseId as string | undefined

  const briefing = await generateFacultyBriefing(user.id, courseId)

  return NextResponse.json({ briefing })
})
