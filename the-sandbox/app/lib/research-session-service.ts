import { prisma } from './prisma'
import { Prisma } from '../generated/prisma'
import { extractPdfText } from './pdf-extract'
import { chunkText } from './document-chunker'
import { getEmbeddingProvider, embeddingAvailable } from './embedding-service'

// ── Session CRUD ────────────────────────────────────────────────

export async function listSessions(userId: string) {
  const sessions = await prisma.researchSession.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      messages: true,
      updatedAt: true,
    },
  })

  return sessions.map(s => ({
    id: s.id,
    title: s.title,
    messageCount: Array.isArray(s.messages) ? (s.messages as unknown[]).length : 0,
    updatedAt: s.updatedAt,
  }))
}

export async function getSession(sessionId: string, userId: string) {
  const session = await prisma.researchSession.findUnique({
    where: { id: sessionId },
    include: {
      documents: {
        select: { id: true, fileName: true, fileSize: true, chunkCount: true, uploadedAt: true },
        orderBy: { uploadedAt: 'desc' },
      },
    },
  })

  if (!session || session.userId !== userId) return null
  return session
}

export async function upsertSession(
  userId: string,
  data: {
    id?: string
    title: string
    messages: Array<{ role: string; content: string }>
    sources?: Array<{ url: string; title: string; snippet: string }>
    notes?: string
  },
) {
  if (data.id) {
    // Verify ownership
    const existing = await prisma.researchSession.findUnique({
      where: { id: data.id },
      select: { userId: true },
    })
    if (!existing || existing.userId !== userId) return null

    const updated = await prisma.researchSession.update({
      where: { id: data.id },
      data: {
        title: data.title,
        messages: data.messages as unknown as Prisma.InputJsonValue,
        sources: data.sources as unknown as Prisma.InputJsonValue ?? undefined,
        notes: data.notes ?? undefined,
      },
      select: { id: true, title: true, updatedAt: true },
    })
    return updated
  }

  const created = await prisma.researchSession.create({
    data: {
      userId,
      title: data.title,
      messages: data.messages as unknown as Prisma.InputJsonValue,
      sources: data.sources as unknown as Prisma.InputJsonValue ?? undefined,
      notes: data.notes ?? undefined,
    },
    select: { id: true, title: true, updatedAt: true },
  })
  return created
}

export async function deleteSession(sessionId: string, userId: string) {
  const session = await prisma.researchSession.findUnique({
    where: { id: sessionId },
    select: { userId: true },
  })
  if (!session || session.userId !== userId) return false

  await prisma.researchSession.delete({ where: { id: sessionId } })
  return true
}

// ── Document Upload + RAG ───────────────────────────────────────

export async function uploadDocument(
  userId: string,
  sessionId: string,
  fileName: string,
  fileBuffer: Buffer,
) {
  // Verify session ownership
  const session = await prisma.researchSession.findUnique({
    where: { id: sessionId },
    select: { userId: true },
  })
  if (!session || session.userId !== userId) return null

  // Extract PDF text
  const { text } = await extractPdfText(fileBuffer)
  if (!text.trim()) throw new Error('Could not extract text from PDF')

  // Chunk the text
  const chunks = chunkText(text)

  // Create the document record
  const doc = await prisma.researchDocument.create({
    data: {
      sessionId,
      fileName,
      fileSize: fileBuffer.length,
      chunkCount: chunks.length,
    },
  })

  // Embed and store chunks
  if (embeddingAvailable() && chunks.length > 0) {
    const provider = getEmbeddingProvider()
    const embeddings = await provider.embedBatch(chunks.map(c => c.content))

    // Insert chunks with embeddings via raw SQL (pgvector)
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const embedding = embeddings[i]
      const vectorStr = `[${embedding.join(',')}]`

      await prisma.$executeRawUnsafe(
        `INSERT INTO "ResearchChunk" (id, "documentId", "sessionId", "chunkIndex", content, "tokenCount", embedding, "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6::vector, NOW())`,
        doc.id,
        sessionId,
        chunk.chunkIndex,
        chunk.content,
        chunk.tokenCount,
        vectorStr,
      )
    }
  } else {
    // Store chunks without embeddings
    await prisma.researchChunk.createMany({
      data: chunks.map(chunk => ({
        documentId: doc.id,
        sessionId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        tokenCount: chunk.tokenCount,
      })),
    })
  }

  return { id: doc.id, fileName: doc.fileName, chunkCount: doc.chunkCount }
}
