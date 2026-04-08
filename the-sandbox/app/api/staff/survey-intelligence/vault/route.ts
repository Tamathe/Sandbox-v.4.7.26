import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import {
  listVaultDocuments,
  createVaultDocument,
  uploadPdfToVault,
} from '../../../../lib/staff/survey-vault-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const url = req.nextUrl
  const projectId = url.searchParams.get('projectId') || undefined
  const category = url.searchParams.get('category') || undefined

  const documents = await listVaultDocuments({ projectId, category })
  return NextResponse.json({ documents }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const contentType = req.headers.get('content-type') || ''

  // FormData upload (PDF file)
  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    const title = formData.get('title') as string
    const category = formData.get('category') as string
    const projectId = (formData.get('projectId') as string) || undefined

    if (!title || !category) {
      return NextResponse.json({ error: 'title and category are required' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const doc = await uploadPdfToVault(auth.user.id, buffer, title, category, projectId)
    return NextResponse.json(doc, { status: 201 })
  }

  // JSON upload (text or url)
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { sourceType, title, category, fullText, projectId, sourceUrl } = parsed.data as { sourceType: 'pdf' | 'url' | 'text' | 'newsletter'; title: string; category: string; fullText: string; projectId?: string; sourceUrl?: string }

  if (!sourceType || !title || !category || !fullText) {
    return NextResponse.json(
      { error: 'sourceType, title, category, and fullText are required' },
      { status: 400 }
    )
  }

  const doc = await createVaultDocument(auth.user.id, {
    title,
    sourceType,
    category,
    fullText,
    sourceUrl,
    projectId,
  })
  return NextResponse.json(doc, { status: 201 })
})
