import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { getDebrief, deleteDebrief } from '../../../lib/lecture-debrief-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ debriefId: string }> }
) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { debriefId } = await params
    const debrief = await getDebrief(debriefId, auth.user.id)
    if (!debrief) {
      return NextResponse.json({ error: 'Debrief not found' }, { status: 404 })
    }

    return NextResponse.json(debrief, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })

export const DELETE = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ debriefId: string }> }
) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { debriefId } = await params
    await deleteDebrief(debriefId, auth.user.id)
    return NextResponse.json({ deleted: true }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
