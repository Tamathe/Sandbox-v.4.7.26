/**
 * Orchestrates the full RAG pipeline for a CourseMaterial record:
 *   1. Chunk the text
 *   2. Embed all chunks (batched)
 *   3. Upsert into the vector store
 *   4. Mark the material as embedded (embeddedAt)
 *
 * Called synchronously from the materials POST route after the record is saved.
 * If OpenAI is unavailable (no key / quota), the function logs a warning and
 * returns gracefully — the material is still saved, just not RAG-indexed.
 */

import { prisma } from './prisma'
import { chunkText } from './document-chunker'
import { embeddingAvailable, getEmbeddingProvider } from './embedding-service'
import { getVectorStore } from './vector-store'
import { extractEntitiesFromChunks, buildGraphCommunities } from './graph-rag-service'

export async function processCourseMaterial(
  materialId: string,
  courseId: string,
  content: string
): Promise<void> {
  if (!embeddingAvailable()) {
    console.warn('[document-processor] Skipping embedding — no API key configured')
    return
  }

  const chunks = chunkText(content)
  if (chunks.length === 0) {
    console.warn(`[document-processor] No chunks generated for material ${materialId}`)
    return
  }

  try {
    const embedder = getEmbeddingProvider()
    const embeddings = await embedder.embedBatch(chunks.map((c) => c.content))

    const chunksWithEmbeddings = chunks.map((chunk, i) => ({
      ...chunk,
      embedding: embeddings[i],
    }))

    const store = getVectorStore()
    await store.upsertChunks(materialId, courseId, chunksWithEmbeddings)

    // Fire-and-forget graph extraction — don't block material processing
    const savedChunks = chunks.map((c, i) => ({
      id: `${materialId}-${i}`,
      content: c.content,
    }))
    extractEntitiesFromChunks(courseId, savedChunks)
      .then(() => buildGraphCommunities(courseId))
      .catch(console.error)

    await prisma.courseMaterial.update({
      where: { id: materialId },
      data: { embeddedAt: new Date() },
    })

    console.info(
      `[document-processor] Embedded material ${materialId}: ${chunks.length} chunks`
    )
  } catch (err) {
    // Don't bubble up — the material is saved, embedding is best-effort
    console.error(`[document-processor] Embedding failed for material ${materialId}:`, err)
  }
}

/**
 * Remove all chunks for a material.
 * Call this when a material is deleted to keep the vector store clean.
 */
export async function deleteCourseMaterialChunks(materialId: string): Promise<void> {
  try {
    const store = getVectorStore()
    await store.deleteByMaterial(materialId)
  } catch (err) {
    console.error(`[document-processor] Failed to delete chunks for material ${materialId}:`, err)
  }
}
