import { NextRequest, NextResponse } from 'next/server'
import { isAuthFailure, requireRequestUser, parseRequestBody } from '../../../lib/server-auth'
import { generateTimeline } from '../../../lib/uknow-insights-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { query?: string }
  const query = typeof body.query === 'string' ? body.query.trim() : ''
  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 })
  }

  const result = await generateTimeline(query, auth.user.id)
  return NextResponse.json(result)
})
