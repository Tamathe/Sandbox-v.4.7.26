import { NextRequest, NextResponse } from 'next/server'
import { isAuthFailure, requireRequestUser } from '../../../lib/server-auth'
import { getSuggestedPrompts } from '../../../lib/uknow-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { user } = auth
    const prompts = await getSuggestedPrompts({
      name: user.name,
      role: user.role,
      college: user.college ?? undefined,
      department: user.department ?? undefined,
    })

    return NextResponse.json({ prompts }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
