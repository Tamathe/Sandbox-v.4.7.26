import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const sessionId = formData.get('sessionId') as string | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let extractedText = ''
    let pageCount = 0

    try {
      // Dynamic import to avoid Next.js bundler issues with pdf-parse's test file initialization
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string; numpages: number }>
      const data = await pdfParse(buffer)
      extractedText = data.text || ''
      pageCount = data.numpages || 0
    } catch {
      // Fallback: store a placeholder if parsing fails
      extractedText = `[PDF content from ${file.name} — ${Math.round(file.size / 1024)}KB]`
    }

    const wordCount = extractedText.split(/\s+/).filter(Boolean).length

    const doc = await prisma.toolDocument.create({
      data: {
        sessionId,
        filename: file.name,
        content: extractedText,
        fileType: 'application/pdf',
        wordCount,
      },
    })

    return NextResponse.json({
      id: doc.id,
      filename: doc.filename,
      wordCount: doc.wordCount,
      pageCount,
    })
  } catch (err) {
    console.error('POST /api/upload/pdf error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
