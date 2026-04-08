/**
 * Survey Vault Service — Document ingestion, chunking, embedding, and search.
 *
 * Follows the same pgvector pattern as policy-service.ts and vector-store.ts.
 * Documents are chunked via document-chunker.ts, embedded via embedding-service.ts,
 * and stored in SurveyVaultChunk with pgvector for semantic search.
 */

import { prisma } from '../prisma'
import { pool } from '../pg-pool'
import { chunkText } from '../document-chunker'
import { extractPdfText } from '../pdf-extract'
import { embeddingAvailable, getEmbeddingProvider } from '../embedding-service'
import type { NewsSearchResult } from '../vector-store'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VaultSearchResult {
  chunkId: string
  content: string
  category: string
  similarity: number
  documentId: string
  documentTitle: string
  sourceType: string
}

export interface VaultDocumentInput {
  title: string
  sourceType: 'pdf' | 'url' | 'text' | 'newsletter'
  sourceUrl?: string
  category: string
  fullText: string
  pageCount?: number
  projectId?: string
}

// ─── Raw SQL Pool (shared) ───────────────────────────────────────────────────

// ─── Document CRUD ───────────────────────────────────────────────────────────

export async function createVaultDocument(userId: string, input: VaultDocumentInput) {
  const doc = await prisma.surveyVaultDocument.create({
    data: {
      uploadedById: userId,
      title: input.title,
      sourceType: input.sourceType,
      sourceUrl: input.sourceUrl ?? null,
      category: input.category,
      fullText: input.fullText,
      pageCount: input.pageCount ?? 0,
      projectId: input.projectId ?? null,
    },
  })

  // Chunk and embed asynchronously (fire-and-forget)
  processVaultDocument(doc.id, input.fullText, input.category).catch((err) =>
    console.error(`[survey-vault] Failed to process document ${doc.id}:`, err)
  )

  return doc
}

export async function uploadPdfToVault(userId: string, buffer: Buffer, title: string, category: string, projectId?: string) {
  const { text, pageCount } = await extractPdfText(buffer)
  if (!text.trim()) throw new Error('Could not extract text from PDF')
  return createVaultDocument(userId, {
    title,
    sourceType: 'pdf',
    category,
    fullText: text,
    pageCount,
    projectId,
  })
}

export async function listVaultDocuments(opts: { projectId?: string; category?: string; uploadedById?: string }) {
  return prisma.surveyVaultDocument.findMany({
    where: {
      isActive: true,
      ...(opts.projectId ? { projectId: opts.projectId } : {}),
      ...(opts.category ? { category: opts.category } : {}),
      ...(opts.uploadedById ? { uploadedById: opts.uploadedById } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      sourceType: true,
      sourceUrl: true,
      category: true,
      pageCount: true,
      projectId: true,
      createdAt: true,
      _count: { select: { chunks: true } },
    },
  })
}

export async function getVaultDocument(documentId: string) {
  return prisma.surveyVaultDocument.findUnique({
    where: { id: documentId },
    include: { _count: { select: { chunks: true } } },
  })
}

export async function deleteVaultDocument(documentId: string) {
  // Chunks cascade-deleted by Prisma onDelete: Cascade
  await prisma.surveyVaultDocument.delete({ where: { id: documentId } })
}

// ─── Document Processing (chunk + embed) ─────────────────────────────────────

async function processVaultDocument(documentId: string, fullText: string, category: string) {
  const textChunks = chunkText(fullText)
  if (textChunks.length === 0) return

  if (!embeddingAvailable()) {
    console.warn('[survey-vault] Embeddings not available — chunks stored without vectors')
    // Still insert chunks without embeddings so text search works
    const client = await pool().connect()
    try {
      await client.query('BEGIN')
      for (const chunk of textChunks) {
        await client.query(
          `INSERT INTO "SurveyVaultChunk" (id, "documentId", "chunkIndex", content, "tokenCount", category, "createdAt")
           VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW())`,
          [documentId, chunk.chunkIndex, chunk.content, chunk.tokenCount, category]
        )
      }
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
    return
  }

  const embedder = getEmbeddingProvider()
  const embeddings = await embedder.embedBatch(textChunks.map((c) => c.content))

  const client = await pool().connect()
  try {
    await client.query('BEGIN')
    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i]
      const vectorLiteral = `[${embeddings[i].map((n) => n.toFixed(8)).join(',')}]`
      await client.query(
        `INSERT INTO "SurveyVaultChunk" (id, "documentId", "chunkIndex", content, "tokenCount", category, embedding, "createdAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6::vector, NOW())`,
        [documentId, chunk.chunkIndex, chunk.content, chunk.tokenCount, category, vectorLiteral]
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

// ─── Vector Search ───────────────────────────────────────────────────────────

export async function searchVault(
  queryEmbedding: number[],
  opts: { categories?: string[]; topK?: number; minSimilarity?: number }
): Promise<VaultSearchResult[]> {
  const topK = opts.topK ?? 10
  const minSim = opts.minSimilarity ?? 0.15
  const vectorLiteral = `[${queryEmbedding.map((n) => n.toFixed(8)).join(',')}]`

  const categoryFilter = opts.categories?.length
    ? `AND c.category = ANY($4::text[])`
    : ''

  const params: (string | number | string[])[] = [vectorLiteral, topK, minSim]
  if (opts.categories?.length) params.push(opts.categories)

  const result = await pool().query<VaultSearchResult>(
    `SELECT
       c.id AS "chunkId",
       c.content,
       c.category,
       1 - (c.embedding <=> $1::vector) AS similarity,
       d.id AS "documentId",
       d.title AS "documentTitle",
       d."sourceType"
     FROM "SurveyVaultChunk" c
     JOIN "SurveyVaultDocument" d ON d.id = c."documentId"
     WHERE c.embedding IS NOT NULL
       AND d."isActive" = true
       AND 1 - (c.embedding <=> $1::vector) >= $3
       ${categoryFilter}
     ORDER BY c.embedding <=> $1::vector
     LIMIT $2`,
    params
  )
  return result.rows
}

/**
 * Dual search: vault + UKNow corpus.
 * Returns both result sets for the generation engine.
 */
export async function searchEvidenceDual(
  queryText: string,
  opts: { categories?: string[]; topKVault?: number; topKUKNow?: number; minSimilarity?: number }
): Promise<{ vaultResults: VaultSearchResult[]; ukNowResults: NewsSearchResult[] }> {
  if (!embeddingAvailable()) {
    return { vaultResults: [], ukNowResults: [] }
  }

  const embedder = getEmbeddingProvider()
  const queryEmbedding = await embedder.embed(queryText)

  const [vaultResults, ukNowResults] = await Promise.all([
    searchVault(queryEmbedding, {
      categories: opts.categories,
      topK: opts.topKVault ?? 10,
      minSimilarity: opts.minSimilarity ?? 0.15,
    }),
    searchUKNow(queryEmbedding, opts.topKUKNow ?? 8, opts.minSimilarity ?? 0.20),
  ])

  return { vaultResults, ukNowResults }
}

/** Search UKNow news corpus (re-uses the same pgvector table). */
async function searchUKNow(queryEmbedding: number[], topK: number, minSimilarity: number): Promise<NewsSearchResult[]> {
  const vectorLiteral = `[${queryEmbedding.map((n) => n.toFixed(8)).join(',')}]`
  const result = await pool().query<{
    articleId: string
    url: string
    title: string
    section: string
    sectionLabel: string
    publishedAt: Date | null
    content: string
    similarity: number
  }>(
    `SELECT
       c."articleId",
       a.url,
       a.title,
       a.section,
       a."sectionLabel",
       a."publishedAt",
       c.content,
       1 - (c.embedding <=> $1::vector) AS similarity
     FROM "UKNowChunk" c
     JOIN "UKNowArticle" a ON a.id = c."articleId"
     WHERE c.embedding IS NOT NULL
       AND 1 - (c.embedding <=> $1::vector) >= $3
     ORDER BY c.embedding <=> $1::vector
     LIMIT $2`,
    [vectorLiteral, topK, minSimilarity]
  )
  return result.rows.map((r) => ({
    ...r,
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
  }))
}
