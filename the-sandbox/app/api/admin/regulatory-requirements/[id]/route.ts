import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { updateRequirement, deleteRequirement } from '../../../../lib/regulatory-mapping-service'

export const PATCH = withErrorHandling(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const body = await parseRequestBody<{
    title?: string; description?: string; featureMapping?: string[]; status?: string; notes?: string
  }>(request)
  if ('error' in body) return body.error

    const req = await updateRequirement(id, body.data)
    return NextResponse.json({ requirement: req })

})

export const DELETE = withErrorHandling(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

    await deleteRequirement(id)
    return NextResponse.json({ success: true })

})
