import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { resolveAction } from '../../../../lib/staff/action-center-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { source, sourceId, resolution, comment } = parsed.data as {
    source: string
    sourceId: string
    resolution: string
    comment?: string
  }

  if (!source || !sourceId || !resolution) {
    return NextResponse.json(
      { error: 'source, sourceId, and resolution are required' },
      { status: 400 }
    )
  }

  const result = await resolveAction(source, sourceId, resolution, user.id, comment)
  return NextResponse.json(result)
})
