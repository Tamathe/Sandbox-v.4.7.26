import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import type { CampusBuildingType } from '../../../generated/prisma'
import { withErrorHandling } from '../../../lib/api-utils'
import { getCachedCampusBuildings } from '../../../lib/cached-queries'

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') as CampusBuildingType | null
    const q = searchParams.get('q')

    // Fetch all from cache, then filter in-memory (56 buildings — trivial)
    let buildings = await getCachedCampusBuildings()

    if (type) {
      buildings = buildings.filter(b => b.type === type)
    }
    if (q) {
      const qLower = q.toLowerCase()
      buildings = buildings.filter(b =>
        b.name.toLowerCase().includes(qLower) ||
        (b.shortName && b.shortName.toLowerCase().includes(qLower)) ||
        b.aliases.some(a => a.toLowerCase().includes(qLower)),
      )
    }

    return NextResponse.json({ buildings }, {
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400' },
    })
  })
