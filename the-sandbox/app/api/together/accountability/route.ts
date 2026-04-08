import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import {
  createAccountabilityPair, getMyPartners, checkInWithPartner,
  findCrossCourseConnections,
} from '../../../lib/together-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  if (action === 'cross-course') {
    const connections = await findCrossCourseConnections(auth.user.id)
    return NextResponse.json({ connections }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  const partners = await getMyPartners(auth.user.id)
  return NextResponse.json({ partners }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as {
    action?: string
    pairId?: string
    partnerId?: string
    goalId?: string
  }

  if (body.action === 'check-in') {
    if (!body.pairId) return NextResponse.json({ error: 'pairId required' }, { status: 400 })
    const pair = await checkInWithPartner(auth.user.id, body.pairId)
    if (!pair) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ pair }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  if (!body.partnerId) return NextResponse.json({ error: 'partnerId required' }, { status: 400 })
  const pair = await createAccountabilityPair(auth.user.id, body.partnerId, body.goalId)
  return NextResponse.json({ pair }, { status: 201 })
})
