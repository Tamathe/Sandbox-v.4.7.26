import { NextRequest, NextResponse } from 'next/server'
import { requireStudentUser, isAuthFailure } from '../../../lib/server-auth'
import { getDegreeArc } from '../../../lib/constellation-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireStudentUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    const result = await getDegreeArc(user.id)
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
