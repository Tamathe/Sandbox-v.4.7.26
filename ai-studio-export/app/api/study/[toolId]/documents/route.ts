import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  try {
    const { toolId } = await params
    const sessionId = req.nextUrl.searchParams.get('sessionId')

    const where = sessionId
      ? { OR: [{ toolId }, { sessionId }] }
      : { toolId }

    const docs = await prisma.toolDocument.findMany({
      where,
      select: { id: true, filename: true, wordCount: true, fileType: true, createdAt: true, toolId: true, sessionId: true },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(docs)
  } catch (err) {
    console.error('GET /api/study/[toolId]/documents error:', err)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}
