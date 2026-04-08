import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import {
  listPendingApprovals,
  getApprovalHistory,
  getApprovalStats,
  createApprovalRequest,
  isValidRequestType,
} from '../../../lib/compliance-approval-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const url = new URL(request.url)
  const view = url.searchParams.get('view') // 'pending' | 'history' | 'stats'

    if (view === 'stats') {
      const stats = await getApprovalStats()
      return NextResponse.json(stats, {
        headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
      })
    }
    if (view === 'history') {
      const requestType = url.searchParams.get('requestType') ?? undefined
      const status = url.searchParams.get('status') ?? undefined
      const history = await getApprovalHistory({ requestType, status })
      return NextResponse.json({ approvals: history }, {
        headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
      })
    }
    // Default: pending
    const approvals = await listPendingApprovals()
    return NextResponse.json({ approvals }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const body = await parseRequestBody<{
    requestType: string
    requestData: Record<string, unknown>
  }>(request)
  if ('error' in body) return body.error

  const { requestType, requestData } = body.data
  if (!requestType || !requestData) {
    return NextResponse.json({ error: 'requestType and requestData are required' }, { status: 400 })
  }
  if (!isValidRequestType(requestType)) {
    return NextResponse.json({ error: 'Invalid requestType. Must be: dpa-renewal, data-erasure, policy-change, role-assignment, or vendor-approval' }, { status: 400 })
  }

    const approval = await createApprovalRequest({
      requestType,
      requestData,
      requestedBy: auth.user.id,
    })
    return NextResponse.json({ approval }, { status: 201 })

})
