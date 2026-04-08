import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '../../../../../lib/rate-limit'
import { withErrorHandling } from '../../../../../lib/api-utils'
import {
  getCourseMasteryGateProgression,
} from '../../../../../lib/assessment/mastery-gate-service'
import {
  isAuthFailure,
  requireRequestUser,
} from '../../../../../lib/server-auth'

export const runtime = 'nodejs'

export const GET = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) => {
    const { courseId } = await params
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    const rateLimitError = await checkRateLimit(req, user.id, 'API')
    if (rateLimitError) return rateLimitError

    return NextResponse.json(
      await getCourseMasteryGateProgression(
        {
          id: user.id,
          role: user.role,
        },
        courseId
      ),
      {
        headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
      }
    )
  }
)
