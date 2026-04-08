import { NextRequest, NextResponse } from 'next/server'

import { LeagueKind } from '../../generated/prisma'
import { SUPPORTED_LEAGUE_KINDS } from '../../lib/leagues/adapters'
import { leagueErrorResponse, requireLeagueUser } from '../../lib/leagues/auth'
import { createLeague, listLeaguesForUser } from '../../lib/leagues/core'
import { CreateLeagueSchema } from '../../lib/schemas'
import { parseRequestBody } from '../../lib/server-auth'
import { validateBody } from '../../lib/validate'

function isLeagueKind(value: unknown): value is LeagueKind {
  return Object.values(LeagueKind).includes(value as LeagueKind)
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireLeagueUser(request)
    const kindParam = request.nextUrl.searchParams.get('kind')
    const kind = kindParam && isLeagueKind(kindParam) ? kindParam : undefined

    const leagues = await listLeaguesForUser(user.id, kind)

    return NextResponse.json({
      leagues,
      supportedKinds: SUPPORTED_LEAGUE_KINDS,
    })
  } catch (error) {
    return leagueErrorResponse(error, 'Failed to fetch leagues')
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireLeagueUser(request)
    const parsed = await parseRequestBody(request)
    if ('error' in parsed) return parsed.error
    const validation = validateBody(CreateLeagueSchema, parsed.data)
    if ('error' in validation) return validation.error
    const { kind, name, description, cadence, timezone, toolId, configJson } = validation.value

    const league = await createLeague({
      userId: user.id,
      userEmail: user.email,
      kind,
      name,
      description: description ?? null,
      cadence: cadence ?? null,
      timezone: timezone ?? null,
      toolId: toolId ?? null,
      emailForDigest: null,
      configInput: configJson ?? {},
    })

    return NextResponse.json(league, { status: 201 })
  } catch (error) {
    return leagueErrorResponse(error, 'Failed to create league')
  }
}
