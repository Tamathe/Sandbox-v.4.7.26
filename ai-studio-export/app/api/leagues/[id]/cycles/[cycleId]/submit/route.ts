import { NextRequest, NextResponse } from 'next/server'

import { leagueErrorResponse, requireLeagueUser } from '../../../../../../lib/leagues/auth'
import { serializeLeagueDetail, submitLeagueCycle } from '../../../../../../lib/leagues/core'
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

    const league = await submitLeagueCycle({
      leagueId: id,
      cycleId,
      userId: user.id,
      input: parsed.data,
    })

    return NextResponse.json(serializeLeagueDetail(league, user.id))
  } catch (error) {
    return leagueErrorResponse(error, 'Failed to submit entry')
  }
}
