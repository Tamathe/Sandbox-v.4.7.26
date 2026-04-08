import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { listIncidents, createIncident } from '../../../lib/ferpa-incident-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || undefined
  const severity = searchParams.get('severity') || undefined

    const incidents = await listIncidents({ status, severity })
    return NextResponse.json({ incidents }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const body = await parseRequestBody<{ description: string; severity: string }>(request)
  if ('error' in body) return body.error

  const { description, severity } = body.data
  if (!description?.trim()) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 })
  }
  if (!['low', 'medium', 'high', 'critical'].includes(severity)) {
    return NextResponse.json({ error: 'Invalid severity' }, { status: 400 })
  }

    const incident = await createIncident({
      reportedById: auth.user.id,
      description: description.trim(),
      severity,
    })
    return NextResponse.json({ incident }, { status: 201 })

})
