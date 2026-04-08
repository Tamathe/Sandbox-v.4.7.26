import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const docs = await prisma.toolDocument.findMany({
    where: { sessionId },
    select: { id: true, filename: true, wordCount: true, fileType: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(docs)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const docId = req.nextUrl.searchParams.get('docId')
  if (!docId) return NextResponse.json({ error: 'docId required' }, { status: 400 })

  const doc = await prisma.toolDocument.findFirst({ where: { id: docId, sessionId } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.toolDocument.delete({ where: { id: docId } })
  return NextResponse.json({ ok: true })
}
