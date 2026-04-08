import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { batchSnooze } from '../../../../lib/staff/action-queue-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { itemIds: string[]; hours?: number }

  if (!body.itemIds || !Array.isArray(body.itemIds) || body.itemIds.length === 0) {
    return NextResponse.json({ error: 'itemIds array required' }, { status: 400 })
  }

  const result = await batchSnooze(body.itemIds, body.hours ?? 24, auth.user.id)

  return NextResponse.json(result)
})
