import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { listDocuments, createDocument } from '../../../lib/compliance-document-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const type = request.nextUrl.searchParams.get('type') || undefined

    const documents = await listDocuments(type)
    return NextResponse.json({ documents }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const body = await parseRequestBody<{
    type: string; title: string; description?: string
    fileUrl?: string; content?: string; version?: string; expiresAt?: string
  }>(request)
  if ('error' in body) return body.error

  const { type, title } = body.data
  if (!type || !title) {
    return NextResponse.json({ error: 'type and title are required' }, { status: 400 })
  }

    const doc = await createDocument({ ...body.data, uploadedBy: auth.user.id })
    return NextResponse.json({ document: doc }, { status: 201 })

})
