import { NextRequest, NextResponse } from 'next/server'
import { requireRegistrarUser, isAuthFailure } from '../../../lib/server-auth'
import { getEnrollmentStats, getPetitionStats, getArticulationStats, getDegreeAuditStats } from '../../../lib/registrar/reporting'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRegistrarUser(request)
  if (isAuthFailure(auth)) return auth.response

  const [enrollment, petitions, articulation, degreeAudit] = await Promise.all([
    getEnrollmentStats(),
    getPetitionStats(),
    getArticulationStats(),
    getDegreeAuditStats(),
  ])

  return NextResponse.json({ enrollment, petitions, articulation, degreeAudit }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
