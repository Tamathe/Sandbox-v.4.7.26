import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser } from '../../../lib/server-auth'
import { getCourseSuggestions } from '../../../lib/degree-plan-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if ('response' in auth) return auth.response
    const { user } = auth

    const suggestions = await getCourseSuggestions(user.id)
    return NextResponse.json({ suggestions }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
