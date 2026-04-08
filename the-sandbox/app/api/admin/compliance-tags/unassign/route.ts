import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { removeTagAssignment } from '../../../../lib/compliance-tag-service'

export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const body = await parseRequestBody<{ tagId: string; entityType: string; entityId: string }>(request)
  if ('error' in body) return body.error

  const { tagId, entityType, entityId } = body.data
  if (!tagId || !entityType || !entityId) {
    return NextResponse.json({ error: 'tagId, entityType, and entityId are required' }, { status: 400 })
  }

    await removeTagAssignment({ tagId, entityType, entityId })
    return NextResponse.json({ success: true })

})
