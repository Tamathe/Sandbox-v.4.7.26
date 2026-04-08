import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { getCourseImpact } from '../../../../lib/stance-service'
import { prisma } from '../../../../lib/prisma'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  // Need the user's current stance
  const profile = await prisma.aILiteracyProfile.findUnique({
    where: { userId: auth.user.id },
  })

  if (!profile?.stance) {
    return NextResponse.json({ error: 'Complete the stance assessment first' }, { status: 400 })
  }

  const courses = await getCourseImpact(auth.user.id, profile.stance)
  return NextResponse.json({ courses, stance: profile.stance }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
