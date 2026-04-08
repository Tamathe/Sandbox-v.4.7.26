import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../lib/server-auth'
import { withErrorHandling } from '../../lib/api-utils'
import { listDocuments, uploadDocument } from '../../lib/document-service'
import { notifyOnDocumentUpload } from '../../lib/document-notification-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const url = req.nextUrl
  const visibility = url.searchParams.get('visibility') || undefined
  const tagsParam = url.searchParams.get('tags')
  const tags = tagsParam ? tagsParam.split(',').map((t) => t.trim()).filter(Boolean) : undefined
  const search = url.searchParams.get('search') || undefined

  const documents = await listDocuments(
    auth.user.id,
    auth.user.department ?? undefined,
    { visibility, tags, search },
  )
  return NextResponse.json({ documents }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const title = formData.get('title') as string
  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const description = (formData.get('description') as string) || undefined
  const tagsRaw = (formData.get('tags') as string) || ''
  const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : undefined
  const visibility = (formData.get('visibility') as string) || undefined
  const department = (formData.get('department') as string) || auth.user.department || undefined

  const buffer = Buffer.from(await file.arrayBuffer())

  const document = await uploadDocument(auth.user.id, buffer, {
    title,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || 'application/octet-stream',
    description,
    tags,
    visibility,
    department,
  })

  // Fire-and-forget: notify relevant users for non-private uploads
  if (visibility && visibility !== 'private') {
    notifyOnDocumentUpload(auth.user.id, title, visibility, department)
      .catch((err) => console.error('[Documents] notification error:', err))
  }

  return NextResponse.json(document, { status: 201 })
})
