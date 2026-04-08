import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import {
  refreshAllFingerprints,
  refreshAllCourseFingerprints,
} from '../../../lib/fingerprint/fingerprint-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const authError = verifyCronSecret(req)
  if (authError) return authError

  const start = Date.now()

  try {
    const [users, courses] = await Promise.all([
      refreshAllFingerprints(),
      refreshAllCourseFingerprints(),
    ])

    return NextResponse.json({
      users,
      courses,
      durationMs: Date.now() - start,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Fingerprint refresh failed', detail: String(error), durationMs: Date.now() - start },
      { status: 500 },
    )
  }
})
