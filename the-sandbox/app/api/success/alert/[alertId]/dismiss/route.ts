import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { dismissAlert } from '../../../../../lib/success/alert-service'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ alertId: string }> }) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error

  const { alertId } = await params
  const { reason } = parsed.data as { reason: string }

  const alert = await dismissAlert(alertId, reason ?? 'Dismissed by faculty')

  return NextResponse.json(alert)
})
