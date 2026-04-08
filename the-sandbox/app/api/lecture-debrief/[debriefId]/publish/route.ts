import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { publishDebrief, unpublishDebrief } from '../../../../lib/lecture-debrief-service'
import { withErrorHandling } from '../../../../lib/api-utils'

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ debriefId: string }> }
) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { debriefId } = await params
    const result = await publishDebrief(debriefId, auth.user.id)
    return NextResponse.json(result)
  })

export const DELETE = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ debriefId: string }> }
) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { debriefId } = await params
    const result = await unpublishDebrief(debriefId, auth.user.id)
    return NextResponse.json(result)
  })
