import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../../../lib/server-auth'
import { executeWorkflowDryRun } from '../../../../../lib/compliance-rules-engine'

export const POST = withErrorHandling(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

    const results = await executeWorkflowDryRun(id)
    return NextResponse.json({ results })

})
