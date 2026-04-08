import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { publishCase } from '../../../../../lib/virtual-clinic/case-service'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const { caseId } = await params
  const published = await publishCase(caseId, user.id)
  return NextResponse.json(published)
})
