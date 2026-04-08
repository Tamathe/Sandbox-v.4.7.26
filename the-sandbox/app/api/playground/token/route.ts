import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import {
  getPlaygroundAppRole,
  requireDemoUser,
  signPlaygroundStorageToken,
} from '../../../lib/playground-storage'

export const GET = withErrorHandling(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url)
    const appId = searchParams.get('appId')?.trim() ?? ''

    if (!appId) {
      return NextResponse.json({ error: 'appId is required' }, { status: 400 })
    }

    const user = await requireDemoUser(request)
    const role = await getPlaygroundAppRole(appId, user)
    const token = signPlaygroundStorageToken({
      userId: user.id,
      email: user.email,
      appId,
      role,
    })

    return NextResponse.json({ token, expiresIn: 3600 }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  })
