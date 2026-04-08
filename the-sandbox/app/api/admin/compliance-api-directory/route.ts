import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { getAPIDirectory, getAPIDirectoryTotalCount } from '../../../lib/compliance-api-directory'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

    const directory = getAPIDirectory()
    const totalEndpoints = getAPIDirectoryTotalCount()
    return NextResponse.json({ directory, totalEndpoints }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})
