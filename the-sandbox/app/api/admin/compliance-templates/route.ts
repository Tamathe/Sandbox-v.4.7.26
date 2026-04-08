import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { listTemplates, seedTemplates } from '../../../lib/compliance-template-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

    // Auto-seed templates if none exist
    await seedTemplates()
    const templates = await listTemplates()
    return NextResponse.json({ templates }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})
