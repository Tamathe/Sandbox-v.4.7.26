import { embeddingAvailable, getEmbeddingProvider } from './embedding-service'
import { pool } from './pg-pool'

interface ResearchChunkResult {
  content: string
  chunkIndex: number
  fileName: string
  similarity: number
}

/**
 * Retrieve the top-k most relevant chunks from a research session's uploaded documents.
 * Returns a formatted context string ready for system prompt injection, or empty string
 * if no documents/embeddings exist for the session.
 */
export async function getResearchContext(
  sessionId: string,
  query: string,
  topK = 3,
): Promise<string> {
  if (!embeddingAvailable()) return ''

  const provider = getEmbeddingProvider()
  const queryEmbedding = await provider.embed(query)
  const vectorLiteral = `[${queryEmbedding.map(n => n.toFixed(8)).join(',')}]`

  const result = await pool().query<ResearchChunkResult>(
    `SELECT
       rc.content,
       rc."chunkIndex",
       rd."fileName",
       1 - (rc.embedding <=> $1::vector) AS similarity
     FROM "ResearchChunk" rc
     JOIN "ResearchDocument" rd ON rd.id = rc."documentId"
     WHERE rc."sessionId" = $2
       AND rc.embedding IS NOT NULL
     ORDER BY rc.embedding <=> $1::vector
     LIMIT $3`,
    [vectorLiteral, sessionId, topK],
  )

  if (result.rows.length === 0) return ''

  const chunks = result.rows
    .filter(r => r.similarity > 0.2)
    .map(r => `[${r.fileName} — chunk ${r.chunkIndex + 1}, relevance ${Math.round(r.similarity * 100)}%]\n${r.content}`)

  if (chunks.length === 0) return ''

  return `UPLOADED DOCUMENT CONTEXT (retrieved from researcher's uploaded files — reference naturally):\n\n${chunks.join('\n\n---\n\n')}`
}
