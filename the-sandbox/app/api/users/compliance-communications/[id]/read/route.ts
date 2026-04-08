import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../../lib/server-auth'
import { markRead } from '../../../../../lib/compliance-communication-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const PATCH = withErrorHandling(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

  await markRead(id, auth.user.id)
  return NextResponse.json({ ok: true })
})
