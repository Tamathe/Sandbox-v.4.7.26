import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../../../lib/server-auth'
import { getModuleCompletionStats } from '../../../../../lib/compliance-training-service'

export const GET = withErrorHandling(async (request: NextRequest,
  { params }: { params: Promise<{ id: string }> },) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

    const stats = await getModuleCompletionStats(id)
    return NextResponse.json(stats, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})
