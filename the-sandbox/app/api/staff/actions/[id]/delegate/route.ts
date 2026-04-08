import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { delegateAction, resolveUserByEmail } from '../../../../../lib/staff/action-queue-service'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { delegatedToId?: string; targetEmail?: string; note?: string }

  let delegatedToId = body.delegatedToId
  if (!delegatedToId && body.targetEmail) {
    try {
      delegatedToId = await resolveUserByEmail(body.targetEmail)
    } catch {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
  }
  if (!delegatedToId) {
    return NextResponse.json({ error: 'delegatedToId or targetEmail required' }, { status: 400 })
  }

  const item = await delegateAction(id, {
    delegatedToId,
    delegatedBy: auth.user.id,
    note: body.note,
  })

  return NextResponse.json({ item })
})
