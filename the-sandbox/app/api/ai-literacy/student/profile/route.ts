import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import {
  getOrCreateProfile,
  recalculateStudentProfile,
  getStudentReadinessBand,
} from '../../../../lib/ai-literacy/student-literacy-profile-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const profile = await getOrCreateProfile(auth.user.id)
  return NextResponse.json({
    profile,
    materialized: profile.profileMaterialized,
    readinessBand: getStudentReadinessBand(profile.readiness),
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const result = await recalculateStudentProfile(auth.user.id)
  return NextResponse.json(result)
})
