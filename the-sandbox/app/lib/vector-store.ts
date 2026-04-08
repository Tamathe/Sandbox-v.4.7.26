/**
 * Vector store abstraction.
 *
 * Current: pgvector on Neon (cosine similarity via <=> operator)
 * Azure migration: set VECTOR_STORE=azure-ai-search and supply:
 *   AZURE_SEARCH_ENDPOINT, AZURE_SEARCH_API_KEY, AZURE_SEARCH_INDEX_NAME
 *
 * All writes use raw SQL because Prisma's generated client does not support
 * the Unsupported("vector") type for INSERT/UPDATE.
 * Reads also use raw SQL for the <=> cosine distance operator.
 */



export interface ChunkToUpsert {
  chunkIndex: number
  content: string
  tokenCount: number
  embedding: number[]
}

export interface SearchResult {
  materialId: string
  courseId: string
  content: string
  chunkIndex: number
  similarity: number  // 0–1; higher = more relevant
}

export interface VectorStore {
  /** Insert or replace all chunks for a material (delete-then-insert). */
  upsertChunks(materialId: string, courseId: string, chunks: ChunkToUpsert[]): Promise<void>
  /** Return the top-k chunks most similar to queryEmbedding within a course. */
  similaritySearch(queryEmbedding: number[], courseId: string, topK: number): Promise<SearchResult[]>
  /** Remove all chunks for a material (called when material is deleted). */
  deleteByMaterial(materialId: string): Promise<void>
  /** Search the UKNow news archive — returns top-k chunks with article metadata for citations. */
  newsSearch(queryEmbedding: number[], topK: number, minSimilarity?: number): Promise<NewsSearchResult[]>
}

export interface NewsSearchResult {
  articleId: string
  url: string
  title: string
  section: string
  sectionLabel: string
  publishedAt: string | null
  content: string
  similarity: number
}

// ─── pgvector store ───────────────────────────────────────────────────────────

import { pool } from './pg-pool'

class PgvectorStore implements VectorStore {
  async upsertChunks(materialId: string, courseId: string, chunks: ChunkToUpsert[]): Promise<void> {
    if (chunks.length === 0) return
    const client = await pool().connect()
    try {
      await client.query('BEGIN')
      // Clear existing chunks for this material first
      await client.query('DELETE FROM "DocumentChunk" WHERE "materialId" = $1', [materialId])

      for (const chunk of chunks) {
        const vectorLiteral = `[${chunk.embedding.map((n) => n.toFixed(8)).join(',')}]`
        await client.query(
          `INSERT INTO "DocumentChunk" (id, "materialId", "courseId", "chunkIndex", content, "tokenCount", embedding, "createdAt")
           VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6::vector, NOW())`,
          [materialId, courseId, chunk.chunkIndex, chunk.content, chunk.tokenCount, vectorLiteral]
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

  async similaritySearch(
    queryEmbedding: number[],
    courseId: string,
    topK: number
  ): Promise<SearchResult[]> {
    const vectorLiteral = `[${queryEmbedding.map((n) => n.toFixed(8)).join(',')}]`
    const result = await pool().query<{
      materialId: string
      courseId: string
      content: string
      chunkIndex: number
      similarity: number
    }>(
      `SELECT
         "materialId",
         "courseId",
         content,
         "chunkIndex",
         1 - (embedding <=> $1::vector) AS similarity
       FROM "DocumentChunk"
       WHERE "courseId" = $2
         AND embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      [vectorLiteral, courseId, topK]
    )
    return result.rows
  }

  async deleteByMaterial(materialId: string): Promise<void> {
    await pool().query('DELETE FROM "DocumentChunk" WHERE "materialId" = $1', [materialId])
  }

  async newsSearch(queryEmbedding: number[], topK: number, minSimilarity = 0): Promise<NewsSearchResult[]> {
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
}

// ─── Azure AI Search store (future) ──────────────────────────────────────────
// Implement when AZURE_SEARCH_ENDPOINT, AZURE_SEARCH_API_KEY, AZURE_SEARCH_INDEX_NAME are set.
// The index must have a field named "embedding" of type Collection(Edm.Single) with
// vector search configured (HNSW algorithm, cosine metric, 1536 dimensions).

class AzureSearchStore implements VectorStore {
  async upsertChunks(_materialId: string, _courseId: string, _chunks: ChunkToUpsert[]): Promise<void> {
    throw new Error('Azure AI Search store not yet implemented — coming in Phase 2')
  }
  async similaritySearch(_queryEmbedding: number[], _courseId: string, _topK: number): Promise<SearchResult[]> {
    throw new Error('Azure AI Search store not yet implemented — coming in Phase 2')
  }
  async deleteByMaterial(_materialId: string): Promise<void> {
    throw new Error('Azure AI Search store not yet implemented — coming in Phase 2')
  }
  async newsSearch(_queryEmbedding: number[], _topK: number, _minSimilarity?: number): Promise<NewsSearchResult[]> {
    throw new Error('Azure AI Search store not yet implemented — coming in Phase 2')
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

let _store: VectorStore | null = null

export function getVectorStore(): VectorStore {
  if (_store) return _store
  const store = process.env.VECTOR_STORE === 'azure-ai-search'
    ? new AzureSearchStore()
    : new PgvectorStore()
  _store = store
  return store
}
