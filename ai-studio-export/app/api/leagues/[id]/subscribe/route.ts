import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { leagueErrorResponse, requireLeagueUser } from '../../../../lib/leagues/auth'
import { setLeagueDigestSubscription } from '../../../../lib/leagues/core'
import { parseRequestBody } from '../../../../lib/server-auth'
import { validateBody } from '../../../../lib/validate'

const SubscribeSchema = z.object({
  email: z.string().email().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireLeagueUser(request)
    const { id } = await params
    const parsed = await parseRequestBody(request)
    if ('error' in parsed) return parsed.error
    const validation = validateBody(SubscribeSchema, parsed.data)
    if ('error' in validation) return validation.error
    const { email } = validation.value

    await setLeagueDigestSubscription({
      leagueId: id,
      userId: user.id,
      email: email ?? user.email,
      active: true,
    })

    return NextResponse.json({ subscribed: true })
  } catch (error) {
    return leagueErrorResponse(error, 'Failed to subscribe to digest')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireLeagueUser(request)
    const { id } = await params

    await setLeagueDigestSubscription({
      leagueId: id,
      userId: user.id,
      active: false,
    })

    return NextResponse.json({ subscribed: false })
  } catch (error) {
    return leagueErrorResponse(error, 'Failed to update digest subscription')
  }
}
