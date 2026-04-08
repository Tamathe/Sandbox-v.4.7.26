import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, parseRequestBody, isAuthFailure } from '../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../lib/api-utils'
import { getInterviewPrompt, type SurveyInterviewRequest } from '../../../../../../lib/staff/survey-intelligence-service'
import { streamHaikuInterview } from '../../../../../../lib/streaming'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response
  await params // consume params (projectId available for future use)

  const parsed = await parseRequestBody<SurveyInterviewRequest>(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data
  if (!body.messages || !body.preflight) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const systemPrompt = getInterviewPrompt(body)

  return streamHaikuInterview(systemPrompt, body.messages)
})
