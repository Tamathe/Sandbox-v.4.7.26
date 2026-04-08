import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../../../lib/server-auth'
import { discardDraft } from '../../../../../../lib/assistant/email-service'
import { withErrorHandling } from '../../../../../../lib/api-utils'

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const draft = await discardDraft(id, auth.user.id)
  return NextResponse.json({ draft })
})
