import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req, { allowSuspended: true })
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        suspended: user.suspended,
        suspendedReason: user.suspendedReason,
        tosAcceptedAt: user.tosAcceptedAt,
        dataConsentAt: user.dataConsentAt,
        ferpaAckAt: user.ferpaAckAt,
      },
    }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
