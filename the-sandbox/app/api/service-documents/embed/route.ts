/**
 * POST /api/service-documents/embed
 *
 * Admin-only. Accepts a service document (text content), chunks it,
 * embeds via the existing embedding provider, and stores in ServiceDocument +
 * ServiceChunk with serviceArea tag for per-service RAG retrieval.
 *
 * Models on /api/avatar/deploy/route.ts — same chunking/embedding logic,
 * targeting ServiceDocument/ServiceChunk instead of CourseMaterial/DocumentChunk.
 * No course scoping — documents are platform-wide.
 */

import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { prisma } from '../../../lib/prisma'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { embeddingAvailable, getEmbeddingProvider } from '../../../lib/embedding-service'
import { chunkText } from '../../../lib/document-chunker'
import { withErrorHandling } from '../../../lib/api-utils'

export const runtime = 'nodejs'
export const maxDuration = 60

const VALID_SERVICE_AREAS = ['isss', 'drc', 'financial-aid', 'registrar', 'career', 'counseling', 'academic-advisor']

interface EmbedRequest {
  serviceArea: string
  title: string
  content: string
  sourceUrl?: string
}

// Raw SQL pool for vector writes (Prisma does not support Unsupported("vector") writes)
let _pool: Pool | null = null
function pool(): Pool {
  if (!_pool) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    _pool = new Pool({ connectionString: url, max: 5 })
  }
  return _pool
}

async function upsertServiceChunks(
  documentId: string,
  serviceArea: string,
  chunks: { chunkIndex: number; content: string; tokenCount: number; embedding: number[] }[]
): Promise<void> {
  if (chunks.length === 0) return
  const client = await pool().connect()
  try {
    await client.query('BEGIN')
    // Clear existing chunks for this document first
    await client.query('DELETE FROM "ServiceChunk" WHERE "documentId" = $1', [documentId])
    for (const chunk of chunks) {
      const vectorLiteral = `[${chunk.embedding.map((n) => n.toFixed(8)).join(',')}]`
      await client.query(
        `INSERT INTO "ServiceChunk" (id, "documentId", "serviceArea", "chunkIndex", content, "tokenCount", embedding, "createdAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6::vector, NOW())`,
        [documentId, serviceArea, chunk.chunkIndex, chunk.content, chunk.tokenCount, vectorLiteral]
      )
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export const POST = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireAdminUser(req)
    if (isAuthFailure(auth)) return auth.response

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const body = parsed.data as EmbedRequest

    const { serviceArea, title, content, sourceUrl } = body

    if (!serviceArea || !VALID_SERVICE_AREAS.includes(serviceArea)) {
      return NextResponse.json(
        { error: `serviceArea must be one of: ${VALID_SERVICE_AREAS.join(', ')}` },
        { status: 400 }
      )
    }
    if (!title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }
    if (!content?.trim()) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    if (!embeddingAvailable()) {
      return NextResponse.json(
        { error: 'Embedding provider not configured — set OPENAI_API_KEY or AZURE_OPENAI_* vars' },
        { status: 503 }
      )
    }

    // Create the ServiceDocument record
    const document = await prisma.serviceDocument.create({
      data: {
        serviceArea,
        title: title.trim(),
        content: content.trim(),
        sourceUrl: sourceUrl ?? null,
        fileType: 'text/plain',
      },
    })

    // Chunk the content
    const chunks = chunkText(content.trim())
    if (chunks.length === 0) {
      return NextResponse.json({ id: document.id, totalChunks: 0, embedded: false })
    }

    // Embed all chunks
    const embedder = getEmbeddingProvider()
    const embeddings = await embedder.embedBatch(chunks.map((c) => c.content))

    const chunksToUpsert = chunks.map((c, i) => ({
      chunkIndex: c.chunkIndex,
      content: c.content,
      tokenCount: c.tokenCount,
      embedding: embeddings[i],
    }))

    await upsertServiceChunks(document.id, serviceArea, chunksToUpsert)

    // Mark document as embedded
    await prisma.serviceDocument.update({
      where: { id: document.id },
      data: { embeddedAt: new Date() },
    })

    return NextResponse.json({ id: document.id, totalChunks: chunks.length, embedded: true })
  })
