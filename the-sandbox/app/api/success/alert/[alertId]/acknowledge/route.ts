import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { acknowledgeAlert } from '../../../../../lib/success/alert-service'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ alertId: string }> }) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const { alertId } = await params
  const alert = await acknowledgeAlert(alertId, user.id)

  return NextResponse.json(alert)
})
