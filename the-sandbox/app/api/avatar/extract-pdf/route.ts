import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (request: NextRequest) => {
    const auth = await requireRequestUser(request)
    if (isAuthFailure(auth)) return auth.response

    const { extractPdfText } = await import('../../../lib/pdf-extract')
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > 2_000_000) {
      return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 413 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const parsed = await extractPdfText(buffer)
    const text = parsed.text?.trim() ?? ''

    if (!text) {
      return NextResponse.json({ error: 'Could not extract text from this PDF. Try copying and pasting the content instead.' }, { status: 422 })
    }

    return NextResponse.json({
      text,
      pageCount: parsed.pageCount,
      wordCount: text.split(/\s+/).length,
    })
  })
