import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { getCollection, updateCollection, deleteCollection } from '../../../../lib/contribute/contribute-service'

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const collection = await getCollection(id)
  if (!collection) return NextResponse.json({ error: 'Collection not found' }, { status: 404 })

  // Public collections visible to anyone; private only to owner
  if (!collection.isPublic && collection.userId !== auth.user.id) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  return NextResponse.json(collection, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const PUT = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { title, description, emoji, isPublic } = parsed.data as {
    title?: string; description?: string; emoji?: string; isPublic?: boolean
  }

  const result = await updateCollection(id, auth.user.id, { title, description, emoji, isPublic })
  if (result.count === 0) return NextResponse.json({ error: 'Collection not found or not yours' }, { status: 404 })

  return NextResponse.json({ updated: true }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const result = await deleteCollection(id, auth.user.id)
  if (result.count === 0) return NextResponse.json({ error: 'Collection not found or not yours' }, { status: 404 })

  return NextResponse.json({ deleted: true }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
