/**
 * GET  /api/service-documents          — list all service documents (admin only)
 * DELETE /api/service-documents?id=X   — delete a document + its chunks (admin only)
 *
 * ServiceChunk cascade deletes are handled by the schema (onDelete: Cascade).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'
import { requireAdminUser, isAuthFailure } from '../../lib/server-auth'
import { withErrorHandling } from '../../lib/api-utils'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireAdminUser(req)
    if (isAuthFailure(auth)) return auth.response

    const documents = await prisma.serviceDocument.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { chunks: true } },
      },
    })

    const result = documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      serviceArea: doc.serviceArea,
      sourceUrl: doc.sourceUrl,
      embeddedAt: doc.embeddedAt,
      chunkCount: doc._count.chunks,
      createdAt: doc.createdAt,
    }))

    return NextResponse.json({ documents: result }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })

export const DELETE = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireAdminUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 })
    }

    const document = await prisma.serviceDocument.findUnique({ where: { id } })
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // ServiceChunk cascade deletes via schema onDelete: Cascade
    await prisma.serviceDocument.delete({ where: { id } })

    return NextResponse.json({ deleted: true, id })
  })
