import { NextRequest, NextResponse } from 'next/server'

import { leagueErrorResponse, requireLeagueUser } from '../../../../lib/leagues/auth'
import { createLeagueCycle, loadLeagueForUser, serializeLeagueDetail } from '../../../../lib/leagues/core'
import { parseRequestBody } from '../../../../lib/server-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireLeagueUser(request)
    const { id } = await params
    const league = await loadLeagueForUser(id, user.id)
    const detail = serializeLeagueDetail(league, user.id)

    return NextResponse.json({ cycles: detail.cycles })
  } catch (error) {
    return leagueErrorResponse(error, 'Failed to fetch cycles')
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireLeagueUser(request)
    const { id } = await params
    const parsed = await parseRequestBody(request)
    if ('error' in parsed) return parsed.error
    const league = await createLeagueCycle({
      leagueId: id,
      userId: user.id,
      input: parsed.data,
    })

    return NextResponse.json(serializeLeagueDetail(league, user.id))
  } catch (error) {
    return leagueErrorResponse(error, 'Failed to create cycle')
  }
}
