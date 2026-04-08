import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, parseRequestBody } from '../../../../../lib/server-auth'
import { getPicks, savePicks } from '../../../../../lib/bracket/bracket-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const auth = await requireRequestUser(request)
  if ('response' in auth) return auth.response

  const { id } = await params
  const entry = await getPicks(id, auth.user.id)
  return NextResponse.json({ entry }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const PUT = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const auth = await requireRequestUser(request)
  if ('response' in auth) return auth.response

  const { id } = await params
  const parsed = await parseRequestBody<{ picks: unknown }>(request)
  if ('error' in parsed) return parsed.error
  const { picks } = parsed.data

  if (!picks || typeof picks !== 'object' || Array.isArray(picks)) {
    return NextResponse.json({ error: 'picks must be an object' }, { status: 400 })
  }

  try {
    const entry = await savePicks(id, auth.user.id, picks as Record<string, string>)
    return NextResponse.json({ entry }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
})
