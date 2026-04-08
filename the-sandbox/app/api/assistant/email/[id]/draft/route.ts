import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { draftReply } from '../../../../../lib/assistant/email-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { instruction?: string }

  const result = await draftReply({
    userId: auth.user.id,
    emailId: id,
    instruction: body.instruction,
  })

  return NextResponse.json({
    draft: result.draft,
    context: result.context,
  }, { status: 201 })
})
