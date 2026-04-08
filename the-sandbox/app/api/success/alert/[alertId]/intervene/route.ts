import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { recordIntervention } from '../../../../../lib/success/alert-service'
import { prisma } from '../../../../../lib/prisma'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ alertId: string }> }) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error

  const { alertId } = await params
  const { type, notes } = parsed.data as { type: string; notes: string }

  const alert = await prisma.successAlert.findUnique({
    where: { id: alertId },
    select: { userId: true },
  })

  if (!alert) return NextResponse.json({ error: 'Alert not found' }, { status: 404 })

  const intervention = await recordIntervention({
    alertId,
    userId: alert.userId,
    initiatorId: user.id,
    type,
    notes,
  })

  return NextResponse.json(intervention)
})
