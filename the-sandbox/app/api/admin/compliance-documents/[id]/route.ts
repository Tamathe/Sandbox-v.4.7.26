import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { getDocument, updateDocument, deleteDocument } from '../../../../lib/compliance-document-service'

export const GET = withErrorHandling(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const doc = await getDocument(id)
  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  return NextResponse.json({ document: doc }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })

})

export const PATCH = withErrorHandling(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const body = await parseRequestBody<{
    title?: string; description?: string; version?: string; content?: string; expiresAt?: string | null
  }>(request)
  if ('error' in body) return body.error

    const doc = await updateDocument(id, body.data)
    return NextResponse.json({ document: doc }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})

export const DELETE = withErrorHandling(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

    await deleteDocument(id)
    return NextResponse.json({ success: true }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})
