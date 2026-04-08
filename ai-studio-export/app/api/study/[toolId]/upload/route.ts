import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  try {
    const { toolId } = await params
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    // sessionId = student's study session; omit for educator pre-loading docs onto tool
    const sessionId = (formData.get('sessionId') as string | null) || undefined

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown']
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.md')) {
      return NextResponse.json({ error: 'Only PDF and text files are supported' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let extractedText = ''
    let pageCount = 0

    if (file.type === 'application/pdf') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string; numpages: number }>
        const data = await pdfParse(buffer)
        extractedText = data.text || ''
        pageCount = data.numpages || 0
      } catch {
        extractedText = `[PDF content from ${file.name} — ${Math.round(file.size / 1024)}KB, parsing failed]`
      }
    } else {
      extractedText = buffer.toString('utf-8')
    }

    const wordCount = extractedText.split(/\s+/).filter(Boolean).length

    const doc = await prisma.toolDocument.create({
      data: {
        toolId: sessionId ? undefined : toolId,
        sessionId: sessionId || undefined,
        filename: file.name,
        content: extractedText,
        fileType: file.type,
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
    console.error('POST /api/study/[toolId]/upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  try {
    const { toolId } = await params
    const docId = req.nextUrl.searchParams.get('docId')
    if (!docId) return NextResponse.json({ error: 'docId required' }, { status: 400 })

    const doc = await prisma.toolDocument.findFirst({
      where: { id: docId, OR: [{ toolId }, { tool: { id: toolId } }] },
    })
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.toolDocument.delete({ where: { id: docId } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/study/[toolId]/upload error:', err)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
