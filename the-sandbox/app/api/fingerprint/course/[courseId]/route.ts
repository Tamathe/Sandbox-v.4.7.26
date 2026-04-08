import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getCourseFingerprint } from '../../../../lib/fingerprint/fingerprint-service'

export const GET = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ courseId: string }> }) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { courseId } = await context.params
  const fingerprint = await getCourseFingerprint(courseId)

  if (!fingerprint) {
    return NextResponse.json({ fingerprint: null, message: 'No enrolled students or insufficient data' })
  }

  return NextResponse.json({ fingerprint }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
