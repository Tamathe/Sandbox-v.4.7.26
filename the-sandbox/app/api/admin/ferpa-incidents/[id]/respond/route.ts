import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { initiateResponse } from '../../../../../lib/incident-playbook-service'

export const POST = withErrorHandling(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id: incidentId } = await params
  const body = await parseRequestBody<{ playbookId?: string; assignedTo?: string }>(request)
  if ('error' in body) return body.error

    const response = await initiateResponse(incidentId, body.data.playbookId, body.data.assignedTo)
    return NextResponse.json({ response }, { status: 201 })

})
