import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { assignTag, isValidEntityType } from '../../../../lib/compliance-tag-service'

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const body = await parseRequestBody<{ tagId: string; entityType: string; entityId: string }>(request)
  if ('error' in body) return body.error

  const { tagId, entityType, entityId } = body.data
  if (!tagId || !entityType || !entityId) {
    return NextResponse.json({ error: 'tagId, entityType, and entityId are required' }, { status: 400 })
  }
  if (!isValidEntityType(entityType)) {
    return NextResponse.json({ error: 'Invalid entityType' }, { status: 400 })
  }

    const assignment = await assignTag({ tagId, entityType, entityId, assignedBy: auth.user.id })
    return NextResponse.json({ assignment }, { status: 201 })

})
