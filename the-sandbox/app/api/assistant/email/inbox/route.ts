import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { getInbox, getInboxSummary } from '../../../../lib/assistant/email-service'
import { getEmailProviderSelection } from '../../../../lib/assistant/providers'
import { withErrorHandling } from '../../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const url = new URL(req.url)
  const category = url.searchParams.get('category') ?? undefined
  const summarize = url.searchParams.get('summarize') === 'true'
  const limit = url.searchParams.get('limit')
  const selection = await getEmailProviderSelection()

  if (summarize) {
    const summary = await getInboxSummary(auth.user.id)
    return NextResponse.json({
      ...summary,
      provider: selection.descriptor,
      integration: selection.integration,
    }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  const emails = await getInbox(auth.user.id, {
    category,
    limit: limit ? parseInt(limit) : undefined,
  })
  return NextResponse.json({
    emails,
    provider: selection.descriptor,
    integration: selection.integration,
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
