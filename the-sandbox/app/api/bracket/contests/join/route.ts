import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { joinContest } from '../../../../lib/bracket/bracket-service'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if ('response' in auth) return auth.response

  const parsed = await parseRequestBody<{ accessCode: unknown }>(request)
  if ('error' in parsed) return parsed.error
  const { accessCode } = parsed.data

  if (!accessCode || typeof accessCode !== 'string') {
    return NextResponse.json({ error: 'accessCode is required' }, { status: 400 })
  }

  try {
    const entry = await joinContest(accessCode, auth.user.id)
    return NextResponse.json({ entry, contestId: entry.contestId }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    if (msg.includes('not found')) return NextResponse.json({ error: msg }, { status: 404 })
    if (msg.includes('already joined')) return NextResponse.json({ error: msg }, { status: 409 })
    return NextResponse.json({ error: msg }, { status: 400 })
  }
})
