import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { advanceStep, escalateResponse, resolveResponse } from '../../../../lib/incident-playbook-service'

export const PATCH = withErrorHandling(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const body = await parseRequestBody<{ action: 'advance' | 'escalate' | 'resolve'; notes?: string }>(request)
  if ('error' in body) return body.error

  const { action, notes } = body.data
  if (!action || !['advance', 'escalate', 'resolve'].includes(action)) {
    return NextResponse.json({ error: 'action must be one of: advance, escalate, resolve' }, { status: 400 })
  }

    let response
    switch (action) {
      case 'advance':
        response = await advanceStep(id)
        break
      case 'escalate':
        response = await escalateResponse(id, notes)
        break
      case 'resolve':
        response = await resolveResponse(id, notes)
        break
    }
    return NextResponse.json({ response })

})
