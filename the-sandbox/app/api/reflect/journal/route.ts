import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { getOrCreateWeeklyJournal, updateWeeklyJournal, listJournals } from '../../../lib/reflect-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  if (action === 'history') {
    const journals = await listJournals(auth.user.id)
    return NextResponse.json({ journals }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  const journal = await getOrCreateWeeklyJournal(auth.user.id)
  return NextResponse.json({ journal }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const PUT = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as {
    id?: string
    biggestInsight?: string
    biggestChallenge?: string
    nextWeekFocus?: string
    freeform?: string
  }
  if (!body.id) return NextResponse.json({ error: 'Journal ID required' }, { status: 400 })

  const journal = await updateWeeklyJournal(auth.user.id, body.id, {
    biggestInsight: body.biggestInsight,
    biggestChallenge: body.biggestChallenge,
    nextWeekFocus: body.nextWeekFocus,
    freeform: body.freeform,
  })
  if (!journal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ journal }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
