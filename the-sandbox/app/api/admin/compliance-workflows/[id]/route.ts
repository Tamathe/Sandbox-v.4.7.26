import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { updateWorkflowRule, deleteWorkflowRule } from '../../../../lib/compliance-workflow-service'

export const PATCH = withErrorHandling(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

  const body = await parseRequestBody<{
    name?: string
    triggerEvent?: string
    actions?: string[]
    delayDays?: number[]
    active?: boolean
  }>(request)
  if ('error' in body) return body.error

    const rule = await updateWorkflowRule(id, body.data)
    return NextResponse.json({ rule })

})

export const DELETE = withErrorHandling(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

    await deleteWorkflowRule(id)
    return NextResponse.json({ success: true })

})
