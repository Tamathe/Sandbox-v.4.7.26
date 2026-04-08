import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { seedQEPFramework } from '../../../lib/portfolio-service'
import { withErrorHandling } from '../../../lib/api-utils'
import { getCachedCompetencyFrameworks } from '../../../lib/cached-queries'

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    // Auto-seed QEP framework if none exist
    const count = await prisma.competencyFramework.count()
    if (count === 0) {
      await seedQEPFramework()
    }

    const frameworks = await getCachedCompetencyFrameworks()

    return NextResponse.json({ frameworks }, {
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400' },
    })
  })
