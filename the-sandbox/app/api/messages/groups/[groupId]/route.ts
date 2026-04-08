import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { renameGroup } from '../../../../lib/messages/group-management-service'

// PATCH /api/messages/groups/[groupId] — rename group
export const PATCH = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response
  const user = auth.user
  const { groupId } = await params

  const parsed = await parseRequestBody<{ name?: string }>(request)
  if ('error' in parsed) return parsed.error
  const { name } = parsed.data

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const result = await renameGroup(user.id, groupId, name)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(result)
})
