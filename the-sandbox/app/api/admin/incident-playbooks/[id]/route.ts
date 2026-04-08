import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { updatePlaybook, deletePlaybook } from '../../../../lib/incident-playbook-service'

export const PATCH = withErrorHandling(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const body = await parseRequestBody<{
    name?: string
    incidentType?: string
    severity?: string
    steps?: { order: number; title: string; description: string; assignee: string; slaHours: number }[]
    notifyRoles?: string[]
    active?: boolean
  }>(request)
  if ('error' in body) return body.error

    const playbook = await updatePlaybook(id, body.data)
    return NextResponse.json({ playbook })

})

export const DELETE = withErrorHandling(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

    await deletePlaybook(id)
    return NextResponse.json({ ok: true })

})
