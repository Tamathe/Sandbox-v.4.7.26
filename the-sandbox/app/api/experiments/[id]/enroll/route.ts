/**
 * POST /api/experiments/[id]/enroll
 *
 * Enroll the authenticated student in the experiment and return their arm
 * assignment.  Callers use the returned arm to apply the treatment config.
 *
 * Response: { arm: "control" | "treatment" }
 *
 * Auth: STUDENT (or ADMIN for testing)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireStudentUser, isAuthFailure } from '../../../../lib/server-auth'
import { enrollStudent } from '../../../../lib/ab-experiments'
import { withErrorHandling } from '../../../../lib/api-utils'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireStudentUser(request)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const { id: experimentId } = await params

  try {
    const arm = await enrollStudent(experimentId, user.id)
    return NextResponse.json({ arm })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Enrollment failed'
    // enrollStudent throws when experiment is not ACTIVE
    if (message.includes('not ACTIVE')) {
      return NextResponse.json({ error: message }, { status: 409 })
    }
    console.error(`[experiments/[id]/enroll] Error:`, err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
