import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { resolveAction } from '../../../../../lib/staff/action-queue-service'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { status?: 'approved' | 'rejected' | 'flagged' | 'dismissed'; resolution?: string }

  if (!body.status) {
    return NextResponse.json({ error: 'status required' }, { status: 400 })
  }

  const item = await resolveAction(id, {
    status: body.status,
    resolution: body.resolution,
    resolvedBy: auth.user.id,
  })

  return NextResponse.json({ item })
})
