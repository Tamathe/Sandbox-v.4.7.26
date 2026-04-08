// ─── Unified Knowledge Gateway ───────────────────────────────
// Single entry point for Sandy to query across ALL knowledge sources.
// Fans out to providers in parallel, merges and ranks results.

import { prisma } from '../prisma'
import { getEmbeddingProvider } from '../embedding-service'
import { getVectorStore } from '../vector-store'
import { getFileProvider } from './providers'

// ─── Types ───────────────────────────────────────────────────

export type { KnowledgeResult, KnowledgeQueryInput } from './types'
import type { KnowledgeResult, KnowledgeQueryInput } from './types'

// ─── Main Query Function ─────────────────────────────────────

export async function queryKnowledge(input: KnowledgeQueryInput): Promise<KnowledgeResult[]> {
  const topK = input.topK ?? 8
  const enabledProviders = input.providers ?? ['courses', 'uknow', 'sharepoint', 'services', 'policies']

  // 1. Embed the query once (reuse across vector providers)
  let queryEmbedding: number[] | null = null
  try {
    const embedder = getEmbeddingProvider()
    queryEmbedding = await embedder.embed(input.query)
  } catch {
    // Embedding unavailable — fall back to text search only
  }

  // 2. Fan out to enabled providers in parallel
  const promises: Promise<KnowledgeResult[]>[] = []

  if (enabledProviders.includes('courses') && queryEmbedding) {
    promises.push(searchCourses(input.userId, queryEmbedding, topK))
  }

  if (enabledProviders.includes('uknow') && queryEmbedding) {
    promises.push(searchUKNow(queryEmbedding, topK))
  }

  if (enabledProviders.includes('sharepoint')) {
    promises.push(searchFiles(input.userId, input.query, topK))
  }

  if (enabledProviders.includes('services') && queryEmbedding) {
    promises.push(searchServices(queryEmbedding, topK))
  }

  if (enabledProviders.includes('policies') && queryEmbedding) {
    promises.push(searchPolicies(queryEmbedding, topK))
  }

  // 3. Merge results
  const resultSets = await Promise.allSettled(promises)
  const allResults: KnowledgeResult[] = []

  for (const result of resultSets) {
    if (result.status === 'fulfilled') {
      allResults.push(...result.value)
    }
  }

  // 4. Deduplicate by content similarity (simple: first 100 chars)
  const seen = new Set<string>()
  const deduped = allResults.filter(r => {
    const key = r.content.slice(0, 100).toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // 5. Sort by similarity descending, return top K
  deduped.sort((a, b) => b.similarity - a.similarity)
  return deduped.slice(0, topK)
}

// ─── Course Materials (pgvector) ─────────────────────────────

async function searchCourses(userId: string, embedding: number[], topK: number): Promise<KnowledgeResult[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      courses: {
        select: {
          id: true,
          courseCode: true,
          title: true,
          facultyAiRetrievalApproved: true,
        },
      },
      courseEnrollments: {
        select: {
          course: {
            select: {
              id: true,
              courseCode: true,
              title: true,
              facultyAiRetrievalApproved: true,
            },
          },
        },
      },
    },
  })
  if (!user) return []

  // Get accessible course IDs
  const courseMap = new Map<string, { courseCode: string; title: string }>()
  for (const course of user.courses) {
    if (!course.facultyAiRetrievalApproved) continue
    courseMap.set(course.id, { courseCode: course.courseCode, title: course.title })
  }
  for (const enrollment of user.courseEnrollments) {
    if (!enrollment.course.facultyAiRetrievalApproved) continue
    courseMap.set(enrollment.course.id, {
      courseCode: enrollment.course.courseCode,
      title: enrollment.course.title,
    })
  }

  const store = getVectorStore()
  const results: KnowledgeResult[] = []

  // Search each accessible course (limit to first 5 to avoid N+1 explosion)
  const courseIds = Array.from(courseMap.keys()).slice(0, 5)
  for (const courseId of courseIds) {
    const hits = await store.similaritySearch(embedding, courseId, Math.ceil(topK / courseIds.length))
    const info = courseMap.get(courseId)
    for (const hit of hits) {
      results.push({
        content: hit.content,
        source: `course:${info?.courseCode ?? courseId}`,
        sourceLabel: `${info?.courseCode ?? 'Course'}: ${info?.title ?? 'Unknown'}`,
        similarity: hit.similarity,
      })
    }
  }

  return results
}

// ─── UKNow News Archive (pgvector) ──────────────────────────

async function searchUKNow(embedding: number[], topK: number): Promise<KnowledgeResult[]> {
  const store = getVectorStore()
  const hits = await store.newsSearch(embedding, topK, 0.60)

  return hits.map(h => ({
    content: h.content,
    source: 'uknow',
    sourceLabel: `UKNow: ${h.title}`,
    similarity: h.similarity,
    url: h.url,
  }))
}

// ─── Simulated SharePoint/OneDrive ───────────────────────────

async function searchFiles(userId: string, query: string, topK: number): Promise<KnowledgeResult[]> {
  const fileProvider = await getFileProvider()
  const hits = await fileProvider.searchDocuments(userId, query, topK)

  return hits.map(h => ({
    content: h.content,
    source: h.source,
    sourceLabel: h.sourceLabel,
    similarity: h.relevance,
  }))
}

// ─── Service Documents (pgvector) ────────────────────────────

async function searchServices(embedding: number[], topK: number): Promise<KnowledgeResult[]> {
  // Service chunks use the same pgvector pattern but different table
  // Query each service area and merge
  const serviceAreas = ['isss', 'drc', 'financial-aid', 'registrar', 'career', 'counseling']
  const results: KnowledgeResult[] = []

  // Use raw SQL since service chunks have their own table
  try {
    const embeddingStr = `[${embedding.join(',')}]`
    const rows = await prisma.$queryRawUnsafe<Array<{
      id: string
      content: string
      serviceArea: string
      similarity: number
    }>>(
      `SELECT sc.id, sc.content, sc."serviceArea",
              1 - (sc.embedding <=> $1::vector) as similarity
       FROM "ServiceChunk" sc
       WHERE sc.embedding IS NOT NULL
       ORDER BY sc.embedding <=> $1::vector
       LIMIT $2`,
      embeddingStr,
      topK
    )

    for (const row of rows) {
      if (row.similarity >= 0.55) {
        const areaLabel = serviceAreas.includes(row.serviceArea)
          ? row.serviceArea.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          : row.serviceArea
        results.push({
          content: row.content,
          source: `service:${row.serviceArea}`,
          sourceLabel: `Campus Services: ${areaLabel}`,
          similarity: row.similarity,
        })
      }
    }
  } catch {
    // Service chunks table may not have embeddings yet
  }

  return results
}

// ─── Policy Documents (pgvector) ────────────────────────────

async function searchPolicies(embedding: number[], topK: number): Promise<KnowledgeResult[]> {
  const results: KnowledgeResult[] = []

  try {
    const embeddingStr = `[${embedding.join(',')}]`
    const rows = await prisma.$queryRawUnsafe<Array<{
      id: string
      content: string
      sectionTitle: string
      documentId: string
      policyNumber: string
      title: string
      category: string
      similarity: number
    }>>(
      `SELECT pc.id, pc.content, pc."sectionTitle", pc."documentId",
              pd."policyNumber", pd.title, pd.category,
              1 - (pc.embedding <=> $1::vector) as similarity
       FROM "PolicyChunk" pc
       JOIN "PolicyDocument" pd ON pd.id = pc."documentId"
       WHERE pc.embedding IS NOT NULL AND pd."isActive" = true
       ORDER BY pc.embedding <=> $1::vector
       LIMIT $2`,
      embeddingStr,
      topK
    )

    for (const row of rows) {
      if (row.similarity >= 0.55) {
        results.push({
          content: `[${row.policyNumber}] ${row.sectionTitle}\n${row.content}`,
          source: `policy:${row.policyNumber}`,
          sourceLabel: `${row.policyNumber} — ${row.title}`,
          similarity: row.similarity,
        })
      }
    }
  } catch {
    // PolicyChunk table may not have embeddings yet
  }

  return results
}
