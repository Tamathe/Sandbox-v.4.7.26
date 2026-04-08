import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { getDocument, updateDocument, deleteDocument } from '../../../lib/document-service'

export const GET = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { id } = await context.params

  const document = await getDocument(id, auth.user.id, auth.user.department ?? undefined)
  return NextResponse.json(document, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const PATCH = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { id } = await context.params

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { title, description, tags, visibility, department } = parsed.data as { title?: string; description?: string; tags?: string[]; visibility?: string; department?: string }

  const document = await updateDocument(id, auth.user.id, {
    title,
    description,
    tags,
    visibility,
    department,
  })
  return NextResponse.json(document, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const DELETE = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { id } = await context.params

  const result = await deleteDocument(id, auth.user.id)
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
