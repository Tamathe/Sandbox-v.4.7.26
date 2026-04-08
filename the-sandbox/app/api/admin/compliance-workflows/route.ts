import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { listWorkflowRules, createWorkflowRule } from '../../../lib/compliance-workflow-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

    const rules = await listWorkflowRules()
    return NextResponse.json({ rules }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const body = await parseRequestBody<{
    name: string
    triggerEvent: string
    actions: string[]
    delayDays: number[]
    active?: boolean
  }>(request)
  if ('error' in body) return body.error

  const { name, triggerEvent, actions, delayDays } = body.data
  if (!name || !triggerEvent || !actions?.length || !delayDays?.length) {
    return NextResponse.json({ error: 'name, triggerEvent, actions, and delayDays are required' }, { status: 400 })
  }

  const validTriggers = ['consent-expired', 'ferpa-overdue', 'dpa-expiring', 'low-compliance-score']
  if (!validTriggers.includes(triggerEvent)) {
    return NextResponse.json({ error: `Invalid triggerEvent. Must be one of: ${validTriggers.join(', ')}` }, { status: 400 })
  }

  const validActions = ['send-notification', 'send-email', 'restrict-access', 'escalate-to-admin']
  for (const action of actions) {
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: `Invalid action "${action}". Must be one of: ${validActions.join(', ')}` }, { status: 400 })
    }
  }

    const rule = await createWorkflowRule({ name, triggerEvent, actions, delayDays, active: body.data.active })
    return NextResponse.json({ rule }, { status: 201 })

})
