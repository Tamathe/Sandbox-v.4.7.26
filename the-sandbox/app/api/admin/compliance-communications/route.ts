import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { sendCommunication, listCommunications } from '../../../lib/compliance-communication-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const url = new URL(request.url)
  const type = url.searchParams.get('type') || undefined
  const days = url.searchParams.get('days') ? parseInt(url.searchParams.get('days')!, 10) : undefined

    const communications = await listCommunications({ type, days })
    return NextResponse.json({ communications }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const body = await parseRequestBody<{
    type: string
    subject: string
    body: string
    targetRoles: string[]
    targetUserIds?: string[]
    priority?: string
  }>(request)
  if ('error' in body) return body.error

  const { type, subject, body: msgBody, targetRoles, targetUserIds, priority } = body.data
  if (!type || !subject || !msgBody || !targetRoles?.length) {
    return NextResponse.json({ error: 'type, subject, body, and targetRoles are required' }, { status: 400 })
  }

  const validTypes = ['announcement', 'reminder', 'escalation', 'alert']
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: `type must be one of: ${validTypes.join(', ')}` }, { status: 400 })
  }

    const communication = await sendCommunication({
      type,
      subject,
      body: msgBody,
      targetRoles,
      targetUserIds,
      sentBy: auth.user.id,
      priority,
    })
    return NextResponse.json({ communication }, { status: 201 })

})
