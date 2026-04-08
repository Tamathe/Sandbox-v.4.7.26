import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { createCollection, getUserCollections, getPublicCollections } from '../../../lib/contribute/contribute-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const browse = req.nextUrl.searchParams.get('browse')
  if (browse === 'public') {
    const skip = parseInt(req.nextUrl.searchParams.get('skip') || '0', 10)
    const collections = await getPublicCollections(20, skip)
    return NextResponse.json(collections, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  const collections = await getUserCollections(user.id)
  return NextResponse.json(collections, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { title, description, emoji, isPublic } = parsed.data as {
    title: string; description?: string; emoji?: string; isPublic?: boolean
  }

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const collection = await createCollection(user.id, {
    title: title.trim(),
    description: description?.trim(),
    emoji,
    isPublic,
  })
  return NextResponse.json(collection, { status: 201 })
})
