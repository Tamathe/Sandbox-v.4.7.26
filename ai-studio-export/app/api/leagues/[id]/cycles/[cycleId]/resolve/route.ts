import { NextRequest, NextResponse } from 'next/server'

import { leagueErrorResponse, requireLeagueUser } from '../../../../../../lib/leagues/auth'
import { resolveLeagueCycle, serializeLeagueDetail } from '../../../../../../lib/leagues/core'
import { parseRequestBody } from '../../../../../../lib/server-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cycleId: string }> }
) {
  try {
    const user = await requireLeagueUser(request)
    const { id, cycleId } = await params
    const parsed = await parseRequestBody(request)
    if ('error' in parsed) return parsed.error

    const league = await resolveLeagueCycle({
      leagueId: id,
      cycleId,
      userId: user.id,
      resolutionInput: parsed.data,
    })

    return NextResponse.json(serializeLeagueDetail(league, user.id))
  } catch (error) {
    return leagueErrorResponse(error, 'Failed to resolve cycle')
  }
}
