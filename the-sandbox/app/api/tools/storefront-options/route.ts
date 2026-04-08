import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'

import {
  isAuthFailure,
  requireRequestUser,
} from '../../../lib/server-auth'
import { listAvailableStorefrontCollectionsForUser } from '../../../lib/tool-storefronts'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  if (!['EDUCATOR', 'ADMIN'].includes(auth.user.role)) {
    return NextResponse.json(
      { error: 'Department deployment is only available to educators and admins' },
      { status: 403 },
    )
  }

  const availableCollections = await listAvailableStorefrontCollectionsForUser(auth.user)

  return NextResponse.json({ availableCollections }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
