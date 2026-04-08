import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { generateFollowup } from '../../../lib/philanthropy/outreach-service'
import type { OutreachContext } from '../../../lib/philanthropy/outreach-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as OutreachContext
  if (!body.business) {
    return NextResponse.json({ error: 'No business provided' }, { status: 400 })
  }
  const followup = await generateFollowup(body)
  return NextResponse.json(followup)
})
