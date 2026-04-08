import { NextRequest, NextResponse } from 'next/server'
import { forkAgentProfile } from '../../../../../lib/agent/agent-profile-service'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { isAuthFailure, requireRequestUser } from '../../../../../lib/server-auth'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const profile = await forkAgentProfile(id, auth.user.id)
  return NextResponse.json(profile, { status: 201 })
})
