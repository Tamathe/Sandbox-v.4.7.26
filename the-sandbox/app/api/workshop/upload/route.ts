import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'

export const runtime = 'nodejs'

const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export const POST = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let extractedText = ''
    let pageCount = 0

    if (file.type === 'application/pdf') {
      const { extractPdfText } = await import('../../../lib/pdf-extract')
      const result = await extractPdfText(buffer)
      extractedText = result.text || ''
      pageCount = result.pageCount || 0
    } else {
      extractedText = buffer.toString('utf-8')
    }

    const wordCount = extractedText.split(/\s+/).filter(Boolean).length

    return NextResponse.json({
      filename: file.name,
      fileType: file.type,
      wordCount,
      pageCount,
      extractedText,
    })
  })
