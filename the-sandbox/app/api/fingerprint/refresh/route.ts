import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { refreshFingerprint, refreshCourseFingerprint } from '../../../lib/fingerprint/fingerprint-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { courseId } = parsed.data as { courseId?: string }

  if (courseId) {
    // Only educators and admins can refresh course fingerprints
    if (auth.user.role !== 'EDUCATOR' && auth.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Educator access required' }, { status: 403 })
    }
    const fingerprint = await refreshCourseFingerprint(courseId)
    return NextResponse.json({ fingerprint })
  }

  const fingerprint = await refreshFingerprint(auth.user.id)
  return NextResponse.json({ fingerprint })
})
