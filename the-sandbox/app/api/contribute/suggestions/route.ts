import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { submitSuggestion, getUserSuggestions, getTopSuggestions } from '../../../lib/contribute/contribute-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const view = req.nextUrl.searchParams.get('view')
  if (view === 'top') {
    const suggestions = await getTopSuggestions(20)
    return NextResponse.json(suggestions, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  const suggestions = await getUserSuggestions(auth.user.id)
  return NextResponse.json(suggestions, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { targetType, targetId, suggestion } = parsed.data as {
    targetType: string; targetId: string; suggestion: string
  }

  if (!targetType || !targetId || !suggestion?.trim()) {
    return NextResponse.json({ error: 'targetType, targetId, and suggestion are required' }, { status: 400 })
  }

  const result = await submitSuggestion(auth.user.id, {
    targetType: targetType as 'TOOL' | 'COURSE' | 'MICRO_COURSE' | 'SIMULATION',
    targetId,
    suggestion: suggestion.trim(),
  })
  return NextResponse.json(result, { status: 201 })
})
