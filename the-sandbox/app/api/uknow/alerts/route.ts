import { NextRequest, NextResponse } from 'next/server'
import { isAuthFailure, requireRequestUser, parseRequestBody } from '../../../lib/server-auth'
import { createAlert, listAlertsWithTopMatches } from '../../../lib/uknow-alert-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const POST = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const body = parsed.data as { label?: string; query?: string }
    const label: string | undefined = body?.label
    const query: string | undefined = body?.query

    if (!label || !label.trim()) {
      return NextResponse.json({ error: 'label is required' }, { status: 400 })
    }
    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 })
    }

    const alert = await createAlert(auth.user.id, label.trim(), query.trim())
    return NextResponse.json(alert, { status: 201 })
  })

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const alerts = await listAlertsWithTopMatches(auth.user.id)
    return NextResponse.json({ alerts }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
