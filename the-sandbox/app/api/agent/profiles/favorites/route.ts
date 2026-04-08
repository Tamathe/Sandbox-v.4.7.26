import { NextRequest, NextResponse } from 'next/server'
import { getUserFavorites, toggleFavorite } from '../../../../lib/agent/agent-profile-service'
import { withErrorHandling } from '../../../../lib/api-utils'
import { isAuthFailure, parseRequestBody, requireRequestUser } from '../../../../lib/server-auth'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const favorites = await getUserFavorites(auth.user.id)
  return NextResponse.json({ favorites }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody<{ profileId?: string }>(req)
  if ('error' in parsed) return parsed.error

  const profileId = parsed.data.profileId?.trim()
  if (!profileId) {
    return NextResponse.json({ error: 'profileId is required' }, { status: 400 })
  }

  const favorited = await toggleFavorite(profileId, auth.user.id)
  return NextResponse.json({ favorited }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const DELETE = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const profileId = req.nextUrl.searchParams.get('profileId')?.trim()
  if (!profileId) {
    return NextResponse.json({ error: 'profileId is required' }, { status: 400 })
  }

  await toggleFavorite(profileId, auth.user.id)
  return NextResponse.json({ success: true }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
