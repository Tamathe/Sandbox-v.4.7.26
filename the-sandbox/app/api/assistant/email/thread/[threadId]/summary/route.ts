import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../../../lib/server-auth'
import { summarizeThread } from '../../../../../../lib/assistant/email-thread-summary-service'
import { withErrorHandling } from '../../../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  req: NextRequest,
  context?: { params?: Promise<{ threadId?: string }> }
) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const params = context?.params ? await context.params : undefined
  const threadId = params?.threadId
  if (!threadId) {
    return NextResponse.json({ error: 'threadId is required' }, { status: 400 })
  }

  const forceRefresh = new URL(req.url).searchParams.get('refresh') === 'true'
  const summary = await summarizeThread(auth.user.id, threadId, forceRefresh)

  return NextResponse.json({ summary }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
