import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../../lib/server-auth'
import { toggleCampusTipUpvote } from '../../../../../lib/contribute/contribute-service'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const result = await toggleCampusTipUpvote(auth.user.id, id)
  return NextResponse.json(result)
})
