import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { leagueErrorResponse, requireLeagueUser } from '../../../lib/leagues/auth'
import { loadLeagueForUser, patchLeagueStatus, serializeLeagueDetail } from '../../../lib/leagues/core'
import { parseRequestBody } from '../../../lib/server-auth'
import { validateBody } from '../../../lib/validate'

const PatchLeagueSchema = z.object({
  action: z.enum(['archive', 'pause', 'activate']),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireLeagueUser(request)
    const { id } = await params
    const league = await loadLeagueForUser(id, user.id)

    return NextResponse.json(serializeLeagueDetail(league, user.id))
  } catch (error) {
    return leagueErrorResponse(error, 'Failed to load league')
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireLeagueUser(request)
    const { id } = await params
    const parsed = await parseRequestBody(request)
    if ('error' in parsed) return parsed.error
    const validation = validateBody(PatchLeagueSchema, parsed.data)
    if ('error' in validation) return validation.error
    const { action } = validation.value

    const league = await patchLeagueStatus({
      leagueId: id,
      userId: user.id,
      action,
    })

    return NextResponse.json(serializeLeagueDetail(league, user.id))
  } catch (error) {
    return leagueErrorResponse(error, 'Failed to update league')
  }
}
