import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { addCollectionItem, removeCollectionItem } from '../../../../../lib/contribute/contribute-service'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { toolId, note } = parsed.data as { toolId: string; note?: string }

  if (!toolId) return NextResponse.json({ error: 'toolId is required' }, { status: 400 })

  const item = await addCollectionItem(id, auth.user.id, toolId, note)
  if (!item) return NextResponse.json({ error: 'Collection not found or not yours' }, { status: 404 })

  return NextResponse.json(item, { status: 201 })
})

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { toolId } = parsed.data as { toolId: string }

  if (!toolId) return NextResponse.json({ error: 'toolId is required' }, { status: 400 })

  const result = await removeCollectionItem(id, auth.user.id, toolId)
  if (!result) return NextResponse.json({ error: 'Collection not found or not yours' }, { status: 404 })

  return NextResponse.json({ removed: true })
})
