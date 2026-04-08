import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { generatePeerReviewQuestions } from '../../../lib/accreditation/peer-review-prep'
import { getActiveCycle } from '../../../lib/accreditation/dashboard-service'

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const cycle = await getActiveCycle()
  if (!cycle) {
    return NextResponse.json({ error: 'No active accreditation cycle found' }, { status: 404 })
  }

  const questions = await generatePeerReviewQuestions(cycle.id)
  return NextResponse.json({ questions })
})
