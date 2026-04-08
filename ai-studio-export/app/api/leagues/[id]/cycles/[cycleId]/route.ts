import { NextRequest, NextResponse } from 'next/server'

import { leagueErrorResponse, requireLeagueUser } from '../../../../../lib/leagues/auth'
import { loadLeagueForUser, serializeLeagueDetail } from '../../../../../lib/leagues/core'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cycleId: string }> }
) {
  try {
    const user = await requireLeagueUser(request)
    const { id, cycleId } = await params
    const league = await loadLeagueForUser(id, user.id)
    const detail = serializeLeagueDetail(league, user.id)
    const cycle = detail.cycles.find((entry) => entry.id === cycleId)

    if (!cycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
    }

    return NextResponse.json(cycle)
  } catch (error) {
    return leagueErrorResponse(error, 'Failed to fetch cycle')
  }
}
