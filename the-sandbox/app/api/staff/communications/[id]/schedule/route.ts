import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { scheduleCommunication, cancelSchedule } from '../../../../../lib/staff/communication-service'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { scheduledAt?: string }

  if (!body.scheduledAt) {
    return NextResponse.json({ error: 'scheduledAt is required (ISO datetime)' }, { status: 400 })
  }

  const scheduledDate = new Date(body.scheduledAt)
  if (isNaN(scheduledDate.getTime())) {
    return NextResponse.json({ error: 'Invalid datetime format' }, { status: 400 })
  }

  if (scheduledDate <= new Date()) {
    return NextResponse.json({ error: 'Scheduled time must be in the future' }, { status: 400 })
  }

  const communication = await scheduleCommunication(id, scheduledDate, auth.user.id)
  return NextResponse.json({ communication })
})

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

  const communication = await cancelSchedule(id)
  return NextResponse.json({ communication })
})
