import { NextRequest, NextResponse } from 'next/server'
import { isAuthFailure, requireRequestUser, parseRequestBody } from '../../../../lib/server-auth'
import { updateAlert, deleteAlert, getAlertById } from '../../../../lib/uknow-alert-service'
import { withErrorHandling } from '../../../../lib/api-utils'

export const PATCH = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { alertId } = await params

    // Ownership check
    const existing = await getAlertById(alertId)
    if (!existing) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }
    if (existing.userId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const body = parsed.data as { active?: boolean; label?: string }
    const updates: { active?: boolean; label?: string } = {}
    if (typeof body?.active === 'boolean') updates.active = body.active
    if (typeof body?.label === 'string' && body.label.trim()) updates.label = body.label.trim()

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const updated = await updateAlert(alertId, updates)
    return NextResponse.json(updated)
  })

export const DELETE = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { alertId } = await params

    // Ownership check
    const existing = await getAlertById(alertId)
    if (!existing) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }
    if (existing.userId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await deleteAlert(alertId)
    return NextResponse.json({ ok: true })
  })
