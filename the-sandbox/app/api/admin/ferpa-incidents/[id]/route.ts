import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { getIncident, updateIncident } from '../../../../lib/ferpa-incident-service'

export const GET = withErrorHandling(async (request: NextRequest,
  { params }: { params: Promise<{ id: string }> },) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

    const incident = await getIncident(id)
    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 })
    }
    return NextResponse.json({ incident }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})

export const PATCH = withErrorHandling(async (request: NextRequest,
  { params }: { params: Promise<{ id: string }> },) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const body = await parseRequestBody<{ status?: string; resolution?: string }>(request)
  if ('error' in body) return body.error

  const { status, resolution } = body.data
  if (status && !['open', 'investigating', 'resolved', 'dismissed'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

    const incident = await updateIncident(id, { status, resolution })
    return NextResponse.json({ incident }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})
