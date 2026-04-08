import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { listBenchmarks, seedBenchmarks } from '../../../lib/compliance-benchmark-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

    // Auto-seed benchmarks if none exist
    await seedBenchmarks()
    const benchmarks = await listBenchmarks()
    return NextResponse.json({ benchmarks }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})
