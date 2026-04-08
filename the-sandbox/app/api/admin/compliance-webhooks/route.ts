import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { listWebhooks, createWebhook } from '../../../lib/compliance-integration-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

    const webhooks = await listWebhooks()
    return NextResponse.json({ webhooks }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const body = await parseRequestBody<{
    url: string
    secret: string
    events: string[]
  }>(request)
  if ('error' in body) return body.error

  const { url, secret, events } = body.data
  if (!url || !secret || !events?.length) {
    return NextResponse.json({ error: 'url, secret, and events are required' }, { status: 400 })
  }

    const webhook = await createWebhook({ url, secret, events })
    return NextResponse.json({ webhook }, { status: 201 })

})
