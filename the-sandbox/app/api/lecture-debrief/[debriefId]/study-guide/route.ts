import { NextRequest, NextResponse } from 'next/server'
import { requireStudentUser, isAuthFailure } from '../../../../lib/server-auth'
import { getStudentStudyGuide } from '../../../../lib/lecture-debrief-service'
import { withErrorHandling } from '../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ debriefId: string }> }
) => {
    const auth = await requireStudentUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { debriefId } = await params
    const guide = await getStudentStudyGuide(debriefId, auth.user.id)
    if (!guide) {
      return NextResponse.json({ error: 'Study guide not found or not published' }, { status: 404 })
    }

    return NextResponse.json(guide, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
