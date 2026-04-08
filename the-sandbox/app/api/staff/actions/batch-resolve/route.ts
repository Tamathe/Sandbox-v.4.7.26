import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { batchResolve } from '../../../../lib/staff/action-queue-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { itemIds, status, resolution } = parsed.data as { itemIds: string[]; status: 'approved' | 'rejected'; resolution?: string }

  if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
    return NextResponse.json({ error: 'itemIds array required' }, { status: 400 })
  }

  if (!status) {
    return NextResponse.json({ error: 'status required' }, { status: 400 })
  }

  const result = await batchResolve(itemIds, {
    status,
    resolvedBy: auth.user.id,
  })

  return NextResponse.json(result)
})
