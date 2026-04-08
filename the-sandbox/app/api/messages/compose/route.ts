import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { composeConversation } from '../../../lib/messages/compose-service'
import { withErrorHandling } from '../../../lib/api-utils'

// POST /api/messages/compose
// Body: { recipientIds: string[] }
export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody<{ recipientIds?: string[] }>(request)
  if ('error' in parsed) return parsed.error
  const { recipientIds } = parsed.data

  if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
    return NextResponse.json({ error: 'recipientIds array is required' }, { status: 400 })
  }

  const result = await composeConversation(auth.user.id, recipientIds)

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(result, { status: result.isExisting ? 200 : 201 })
})
