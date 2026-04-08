import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getVersionHistory, createNewVersion } from '../../../../lib/document-service'

export const GET = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { id } = await context.params

  const versions = await getVersionHistory(id)
  return NextResponse.json({ versions }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { id } = await context.params

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const document = await createNewVersion(id, buffer, auth.user.id)
  return NextResponse.json(document, { status: 201 })
})
