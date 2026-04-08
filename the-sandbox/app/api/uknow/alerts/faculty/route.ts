import { NextRequest, NextResponse } from 'next/server'
import { isAuthFailure, requireRequestUser } from '../../../../lib/server-auth'
import { suggestFacultyAlerts } from '../../../../lib/uknow-alert-service'
import { withErrorHandling } from '../../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response
    if (auth.user.role !== 'EDUCATOR' && auth.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Educator or admin role required' }, { status: 403 })
    }

    const suggestions = await suggestFacultyAlerts(auth.user.id)
    return NextResponse.json({ suggestions }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
