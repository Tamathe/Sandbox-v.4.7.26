import { NextRequest, NextResponse } from 'next/server'

import { leagueErrorResponse, requireLeagueUser } from '../../../../lib/leagues/auth'
import { loadLeagueForUser, serializeLeagueDetail } from '../../../../lib/leagues/core'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireLeagueUser(request)
    const { id } = await params
    const league = await loadLeagueForUser(id, user.id)
    const detail = serializeLeagueDetail(league, user.id)

    return NextResponse.json({
      standings: detail.standings,
      scoringMetric: detail.scoringMetric,
      memberCount: detail.memberCount,
    })
  } catch (error) {
    return leagueErrorResponse(error, 'Failed to load leaderboard')
  }
}
