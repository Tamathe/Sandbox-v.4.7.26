/**
 * Policy Navigator — Core Service
 *
 * RAG-powered policy search and AI-synthesized answers for the institutional
 * policy corpus. Uses the same embedding + vector search infrastructure as
 * Research Hub and UKNow.
 *
 * Exports:
 *   searchPolicies()       — vector similarity search over PolicyChunk
 *   answerPolicyQuestion()  — RAG retrieval + Haiku synthesis with citations
 *   getPolicyByNumber()     — direct lookup by policy number
 *   listPolicies()          — browse with text search + category filter
 *   getPolicyCategories()   — category list with document counts
 */


import Anthropic from '@anthropic-ai/sdk'
import { embeddingAvailable, getEmbeddingProvider } from '../embedding-service'
import { prisma } from '../prisma'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PolicySearchResult {
  document: {
    id: string
    policyNumber: string
    title: string
    category: string
    responsibleOffice: string
    appliesTo: string
    effectiveDate: Date
    lastRevised: Date
    summary: string | null
    isActive: boolean
  }
  matchedChunks: {
    sectionTitle: string
    content: string
    similarity: number
  }[]
  highlightedExcerpt: string
}

export interface PolicyCitation {
  policyNumber: string
  policyTitle: string
  section: string
  excerpt: string
  effectiveDate: Date
  responsibleOffice: string
}

export interface PolicyAnswer {
  answer: string
  citations: PolicyCitation[]
  followUpSuggestions: string[]
}

export interface PolicyListItem {
  id: string
  policyNumber: string
  title: string
  category: string
  responsibleOffice: string
  appliesTo: string
  effectiveDate: Date
  lastRevised: Date
  summary: string | null
  isActive: boolean
  source: string
  externalUrl: string | null
  createdAt: Date
  updatedAt: Date
}

// ─── Raw SQL Pool ────────────────────────────────────────────────────────────

import { pool } from '../pg-pool'

// ─── Anthropic Client ────────────────────────────────────────────────────────

let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic()
  }
  return _anthropic
}

// ─── Vector Search Result (raw SQL row shape) ────────────────────────────────

interface ChunkRow {
  chunkId: string
  sectionTitle: string
  content: string
  similarity: number
  documentId: string
  policyNumber: string
  title: string
  category: string
  responsibleOffice: string
  appliesTo: string
  effectiveDate: Date
  lastRevised: Date
  summary: string | null
  isActive: boolean
}

// ─── 1. searchPolicies() ─────────────────────────────────────────────────────

export async function searchPolicies(
  query: string,
  opts?: { category?: string; limit?: number },
): Promise<PolicySearchResult[]> {
  const limit = opts?.limit ?? 5

  if (!embeddingAvailable()) {
    console.warn('[policy-service] Embedding provider unavailable — falling back to text search')
    return fallbackTextSearch(query, opts?.category, limit)
  }

  const provider = getEmbeddingProvider()
  const queryEmbedding = await provider.embed(query)
  const vectorLiteral = `[${queryEmbedding.map((n) => n.toFixed(8)).join(',')}]`

  // Build category filter clause
  const params: (string | number)[] = [vectorLiteral, limit * 3] // fetch extra chunks, then group
  let categoryClause = ''
  if (opts?.category) {
    categoryClause = `AND pd.category = $3`
    params.push(opts.category)
  }

  const result = await pool().query<ChunkRow>(
    `SELECT
       pc.id AS "chunkId",
       pc."sectionTitle",
       pc.content,
       1 - (pc.embedding <=> $1::vector) AS similarity,
       pd.id AS "documentId",
       pd."policyNumber",
       pd.title,
       pd.category,
       pd."responsibleOffice",
       pd."appliesTo",
       pd."effectiveDate",
       pd."lastRevised",
       pd.summary,
       pd."isActive"
     FROM "PolicyChunk" pc
     JOIN "PolicyDocument" pd ON pd.id = pc."documentId"
     WHERE pc.embedding IS NOT NULL
       AND pd."isActive" = true
       ${categoryClause}
     ORDER BY pc.embedding <=> $1::vector
     LIMIT $2`,
    params,
  )

  if (result.rows.length === 0) return []

  // Group chunks by document
  const docMap = new Map<string, { doc: ChunkRow; chunks: { sectionTitle: string; content: string; similarity: number }[] }>()

  for (const row of result.rows) {
    if (row.similarity < 0.15) continue // skip very low relevance

    const existing = docMap.get(row.documentId)
    const chunk = {
      sectionTitle: row.sectionTitle,
      content: row.content,
      similarity: row.similarity,
    }

    if (existing) {
      existing.chunks.push(chunk)
    } else {
      docMap.set(row.documentId, { doc: row, chunks: [chunk] })
    }
  }

  // Sort documents by their best chunk similarity, take top K
  const sorted = Array.from(docMap.values())
    .sort((a, b) => {
      const bestA = Math.max(...a.chunks.map((c) => c.similarity))
      const bestB = Math.max(...b.chunks.map((c) => c.similarity))
      return bestB - bestA
    })
    .slice(0, limit)

  return sorted.map(({ doc, chunks }) => ({
    document: {
      id: doc.documentId,
      policyNumber: doc.policyNumber,
      title: doc.title,
      category: doc.category,
      responsibleOffice: doc.responsibleOffice,
      appliesTo: doc.appliesTo,
      effectiveDate: doc.effectiveDate,
      lastRevised: doc.lastRevised,
      summary: doc.summary,
      isActive: doc.isActive,
    },
    matchedChunks: chunks.sort((a, b) => b.similarity - a.similarity),
    highlightedExcerpt: buildHighlightedExcerpt(chunks[0]?.content ?? '', query),
  }))
}

// ─── 2. answerPolicyQuestion() ───────────────────────────────────────────────

export async function answerPolicyQuestion(
  question: string,
  opts?: { category?: string; userId?: string },
): Promise<PolicyAnswer> {
  // Step 1: Retrieve relevant policy chunks
  const searchResults = await searchPolicies(question, {
    category: opts?.category,
    limit: 5,
  })

  if (searchResults.length === 0) {
    return {
      answer:
        "I wasn't able to find any policies matching your question. Could you rephrase or try a different search? You can also browse policies by category on the Policy Navigator page.",
      citations: [],
      followUpSuggestions: [
        'Browse all HR & Employment policies',
        'What categories of policies are available?',
        'Show me the most recently updated policies',
      ],
    }
  }

  // Step 2: Build context from retrieved chunks
  const contextBlocks: string[] = []
  for (const result of searchResults) {
    for (const chunk of result.matchedChunks.slice(0, 3)) {
      contextBlocks.push(
        `[Policy: ${result.document.policyNumber} — ${result.document.title}]\n` +
          `[Section: ${chunk.sectionTitle}]\n` +
          `[Category: ${result.document.category}]\n` +
          `[Effective Date: ${formatDate(result.document.effectiveDate)}]\n` +
          `[Responsible Office: ${result.document.responsibleOffice}]\n` +
          `[Applies To: ${result.document.appliesTo}]\n` +
          `[Relevance: ${Math.round(chunk.similarity * 100)}%]\n\n` +
          chunk.content,
      )
    }
  }

  const policyContext = contextBlocks.join('\n\n---\n\n')

  // Step 3: Call Haiku to synthesize answer
  const systemPrompt = `You are Sandy, the University of Kentucky's AI assistant. You are answering a policy question using retrieved policy documents.

INSTRUCTIONS:
1. Answer the question directly using ONLY the provided policy context. Do not make up information.
2. ALWAYS cite specific policy numbers and section references (e.g., "Per AR 2:9, Section 4.2...").
3. Quote directly when the exact language matters (requirements, thresholds, deadlines).
4. Note the effective date so the user knows the policy is current.
5. Mention the responsible office for follow-up or exceptions.
6. Keep your answer concise but thorough — cover the key points without excessive detail.
7. At the end of your answer, add a line "Responsible Office: [office name] | Effective: [date]" for the primary cited policy.

FORMAT YOUR CITATIONS:
When citing a policy, use this exact format inline: **[POLICY_NUMBER] — [TITLE]** (e.g., **AR 2:9 — Flexible Work Arrangements**)
When citing a section, use: Section [NUMBER] (e.g., Section 4.2)

RETRIEVED POLICY CONTEXT:
${policyContext}`

  const anthropic = getAnthropic()
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: question }],
  })

  const answerText =
    response.content[0].type === 'text' ? response.content[0].text : ''

  // Step 4: Extract citations from search results
  const citations: PolicyCitation[] = searchResults.slice(0, 3).map((r) => ({
    policyNumber: r.document.policyNumber,
    policyTitle: r.document.title,
    section: r.matchedChunks[0]?.sectionTitle ?? 'Full Document',
    excerpt: truncate(r.matchedChunks[0]?.content ?? '', 200),
    effectiveDate: r.document.effectiveDate,
    responsibleOffice: r.document.responsibleOffice,
  }))

  // Step 5: Generate follow-up suggestions based on the question and results
  const followUpSuggestions = generateFollowUpSuggestions(question, searchResults)

  return {
    answer: answerText,
    citations,
    followUpSuggestions,
  }
}

// ─── 3. getPolicyByNumber() ──────────────────────────────────────────────────

export async function getPolicyByNumber(policyNumber: string) {
  const doc = await prisma.policyDocument.findUnique({
    where: { policyNumber },
    include: {
      chunks: {
        orderBy: { chunkIndex: 'asc' },
        select: {
          id: true,
          sectionTitle: true,
          content: true,
          chunkIndex: true,
        },
      },
    },
  })

  return doc
}

// ─── 4. listPolicies() ──────────────────────────────────────────────────────

export async function listPolicies(opts?: {
  category?: string
  search?: string
  limit?: number
  offset?: number
}): Promise<{ documents: PolicyListItem[]; total: number }> {
  const limit = opts?.limit ?? 20
  const offset = opts?.offset ?? 0

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { isActive: true }

  if (opts?.category) {
    where.category = opts.category
  }

  if (opts?.search) {
    const searchTerm = opts.search.trim()
    where.OR = [
      { title: { contains: searchTerm, mode: 'insensitive' } },
      { policyNumber: { contains: searchTerm, mode: 'insensitive' } },
      { fullText: { contains: searchTerm, mode: 'insensitive' } },
      { responsibleOffice: { contains: searchTerm, mode: 'insensitive' } },
    ]
  }

  const [documents, total] = await Promise.all([
    prisma.policyDocument.findMany({
      where,
      orderBy: [{ category: 'asc' }, { policyNumber: 'asc' }],
      take: limit,
      skip: offset,
      select: {
        id: true,
        policyNumber: true,
        title: true,
        category: true,
        responsibleOffice: true,
        appliesTo: true,
        effectiveDate: true,
        lastRevised: true,
        summary: true,
        isActive: true,
        source: true,
        externalUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.policyDocument.count({ where }),
  ])

  return { documents, total }
}

// ─── 5. getPolicyCategories() ────────────────────────────────────────────────

export async function getPolicyCategories(): Promise<
  { category: string; count: number }[]
> {
  const results = await prisma.policyDocument.groupBy({
    by: ['category'],
    where: { isActive: true },
    _count: { category: true },
    orderBy: { category: 'asc' },
  })

  return results.map((r) => ({
    category: r.category,
    count: r._count.category,
  }))
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Fallback text search when embedding provider is unavailable.
 * Uses Prisma text filtering instead of vector similarity.
 */
async function fallbackTextSearch(
  query: string,
  category: string | undefined,
  limit: number,
): Promise<PolicySearchResult[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { isActive: true }

  if (category) {
    where.category = category
  }

  const searchTerm = query.trim()
  where.OR = [
    { title: { contains: searchTerm, mode: 'insensitive' } },
    { policyNumber: { contains: searchTerm, mode: 'insensitive' } },
    { fullText: { contains: searchTerm, mode: 'insensitive' } },
  ]

  const docs = await prisma.policyDocument.findMany({
    where,
    take: limit,
    include: {
      chunks: {
        orderBy: { chunkIndex: 'asc' },
        select: { sectionTitle: true, content: true },
      },
    },
  })

  return docs.map((doc) => {
    // Find the chunk that best matches the query via simple text overlap
    const matchedChunks = doc.chunks
      .filter((c) => c.content.toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, 3)
      .map((c) => ({
        sectionTitle: c.sectionTitle,
        content: c.content,
        similarity: 0.5, // placeholder score for text match
      }))

    // If no chunk matched by text, return the first chunk
    if (matchedChunks.length === 0 && doc.chunks.length > 0) {
      matchedChunks.push({
        sectionTitle: doc.chunks[0].sectionTitle,
        content: doc.chunks[0].content,
        similarity: 0.3,
      })
    }

    return {
      document: {
        id: doc.id,
        policyNumber: doc.policyNumber,
        title: doc.title,
        category: doc.category,
        responsibleOffice: doc.responsibleOffice,
        appliesTo: doc.appliesTo,
        effectiveDate: doc.effectiveDate,
        lastRevised: doc.lastRevised,
        summary: doc.summary,
        isActive: doc.isActive,
      },
      matchedChunks,
      highlightedExcerpt: buildHighlightedExcerpt(
        matchedChunks[0]?.content ?? doc.chunks[0]?.content ?? '',
        query,
      ),
    }
  })
}

/**
 * Build a highlighted excerpt from a chunk, bolding query terms.
 * Returns first ~300 chars of the chunk with **bold** around matching terms.
 */
function buildHighlightedExcerpt(content: string, query: string): string {
  const maxLen = 300
  let excerpt = content.length > maxLen ? content.slice(0, maxLen) + '...' : content

  // Bold query terms in the excerpt
  const terms = query
    .split(/\s+/)
    .filter((t) => t.length > 2)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  if (terms.length > 0) {
    const regex = new RegExp(`(${terms.join('|')})`, 'gi')
    excerpt = excerpt.replace(regex, '**$1**')
  }

  return excerpt
}

/**
 * Generate contextual follow-up suggestions based on the question and results.
 */
function generateFollowUpSuggestions(
  question: string,
  results: PolicySearchResult[],
): string[] {
  const suggestions: string[] = []
  const lowerQ = question.toLowerCase()

  // Suggest exploring related categories
  const categories = Array.from(new Set(results.map((r) => r.document.category)))
  if (categories.length === 1) {
    const otherRelated: Record<string, string> = {
      'HR & Employment': 'What are the leave and vacation policies?',
      'Finance & Procurement': 'What are the purchase approval thresholds?',
      'Academic & Compliance': 'What are the FERPA requirements for faculty?',
      'Facilities & Operations': 'How do I reserve a room for an event?',
      'Student Affairs': 'What is the student complaint process?',
      'IT & Data': 'What are the data classification levels?',
    }
    const related = otherRelated[categories[0]]
    if (related && !lowerQ.includes(related.toLowerCase().slice(0, 15))) {
      suggestions.push(related)
    }
  }

  // Suggest viewing the full policy
  if (results.length > 0) {
    const top = results[0].document
    suggestions.push(`Show me the full text of ${top.policyNumber}`)
  }

  // Suggest a process/next-step question
  if (lowerQ.includes('policy') || lowerQ.includes('rule') || lowerQ.includes('requirement')) {
    suggestions.push('What forms or steps do I need to follow?')
  } else if (lowerQ.includes('process') || lowerQ.includes('how')) {
    suggestions.push('Who should I contact for exceptions?')
  } else {
    suggestions.push('Are there any exceptions or special cases?')
  }

  // Ensure exactly 2-3 suggestions
  return suggestions.slice(0, 3)
}

/**
 * Format a Date for display in policy context.
 */
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Truncate text to a maximum length with ellipsis.
 */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen).trimEnd() + '...'
}
