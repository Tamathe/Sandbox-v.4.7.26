import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { approveRequest, rejectRequest, escalateRequest } from '../../../../lib/compliance-approval-service'

export const PATCH = withErrorHandling(async (request: NextRequest,
  { params }: { params: Promise<{ id: string }> },) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Approval ID is required' }, { status: 400 })

  const body = await parseRequestBody<{
    action: 'approve' | 'reject' | 'escalate'
    comments?: string
  }>(request)
  if ('error' in body) return body.error

  const { action, comments } = body.data
  if (!action || !['approve', 'reject', 'escalate'].includes(action)) {
    return NextResponse.json({ error: 'action must be approve, reject, or escalate' }, { status: 400 })
  }

    let result
    if (action === 'approve') {
      result = await approveRequest(id, auth.user.id, comments)
    } else if (action === 'reject') {
      result = await rejectRequest(id, auth.user.id, comments)
    } else {
      result = await escalateRequest(id, comments)
    }
    return NextResponse.json({ approval: result })

})
