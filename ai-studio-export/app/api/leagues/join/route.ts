import { NextRequest, NextResponse } from 'next/server'

import { leagueErrorResponse, requireLeagueUser } from '../../../lib/leagues/auth'
import { joinLeagueByCode } from '../../../lib/leagues/core'
import { JoinLeagueSchema } from '../../../lib/schemas'
import { parseRequestBody } from '../../../lib/server-auth'
import { validateBody } from '../../../lib/validate'

export async function POST(request: NextRequest) {
  try {
    const user = await requireLeagueUser(request)
    const parsed = await parseRequestBody(request)
    if ('error' in parsed) return parsed.error
    const validation = validateBody(JoinLeagueSchema, parsed.data)
    if ('error' in validation) return validation.error
    const { joinCode } = validation.value

    const league = await joinLeagueByCode({
      userId: user.id,
      email: user.email,
      joinCode,
      emailForDigest: null,
    })

    return NextResponse.json(league)
  } catch (error) {
    return leagueErrorResponse(error, 'Failed to join league')
  }
}
