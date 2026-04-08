import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { startSession, getSession, getUserSessions, saveToPortfolio, updateSessionPhase } from '../../../lib/practice-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (id) {
    const session = await getSession(id)
    if (!session || session.userId !== auth.user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ session }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  const sessions = await getUserSessions(auth.user.id)
  return NextResponse.json({ sessions }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { action?: string; sessionId?: string; scenarioId?: string }

  if (body.action === 'start-sim') {
    const session = await getSession(body.sessionId as string)
    if (!session || session.userId !== auth.user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const updated = await updateSessionPhase(body.sessionId as string, 'ACTIVE')
    return NextResponse.json({ session: updated }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  if (body.action === 'portfolio') {
    if (!body.sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
    const item = await saveToPortfolio(auth.user.id, body.sessionId)
    if (!item) return NextResponse.json({ error: 'Session not found or not completed' }, { status: 404 })
    return NextResponse.json({ portfolioItem: item }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  // Default: start new session
  if (!body.scenarioId) return NextResponse.json({ error: 'scenarioId required' }, { status: 400 })
  const session = await startSession(auth.user.id, body.scenarioId)
  return NextResponse.json({ session }, { status: 201 })
})
