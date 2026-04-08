import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const runtime = 'nodejs'

function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '') // strip extension
    .replace(/[-_]+/g, ' ')  // hyphens/underscores → spaces
    .replace(/\b\w/g, (c) => c.toUpperCase()) // title case
    .trim()
}

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params
  const auth = await requireCourseOwner(req, id)
  if (isAuthFailure(auth)) return auth.response

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 413 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  let extractedText = ''
  let pageCount = 0

  try {
    const { extractPdfText } = await import('../../../../../lib/pdf-extract')
    const data = await extractPdfText(buffer)
    extractedText = data.text?.trim() || ''
    pageCount = data.pageCount || 0
  } catch {
    extractedText = `[PDF content from ${file.name} — ${Math.round(file.size / 1024)} KB]`
  }

  return NextResponse.json({
    suggestedTitle: titleFromFilename(file.name),
    content: extractedText,
    pageCount,
  })
})
