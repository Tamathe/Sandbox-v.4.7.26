/**
 * UKNow Live — service layer for the UKNow article archive.
 *
 * Provides search, retrieval, AI Q&A, and ingestion over the 14,097-article
 * UKNow corpus stored in UKNowArticle + UKNowChunk (pgvector).
 */

import Anthropic from '@anthropic-ai/sdk'

import { getEmbeddingProvider } from './embedding-service'
import { getVectorStore } from './vector-store'
import { prisma } from './prisma'
import { toJsonValue } from './prisma-utils'
import { createNotification } from './notifications'
import { logQueryFireAndForget } from './uknow-alert-service'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UknowArticleSummary {
  id: string
  slug: string
  section: string
  sectionLabel: string
  url: string
  title: string
  author: string | null
  publishedAt: string | null
  wordCount: number
  excerpt: string
  sentiment?: string | null  // "positive" | "neutral" | "negative"
}

export interface UknowArticleFull {
  id: string
  slug: string
  section: string
  sectionLabel: string
  url: string
  title: string
  author: string | null
  publishedAt: Date | null
  modifiedAt: Date | null
  wordCount: number
  embeddedAt: Date | null
  createdAt: Date
  bodyText?: string
  summary?: string | null
  entities?: { people?: string[]; departments?: string[]; programs?: string[]; topics?: string[] } | null
}

export interface AskAIResult {
  answer: string
  sources: Array<{
    articleId: string
    url: string
    title: string
    section: string
    sectionLabel: string
    publishedAt: string | null
    similarity: number
  }>
  followUps?: string[]
}

export interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface IngestResult {
  ingested: number
  errors: number
}

// ─── Pool ─────────────────────────────────────────────────────────────────────

import { pool } from './pg-pool'

// ─── 1. searchArticles ────────────────────────────────────────────────────────

export async function searchArticles(
  q: string,
  section?: string,
  startDate?: string,
  endDate?: string,
  page = 1,
  pageSize = 20,
  userId?: string,
  sentiment?: string
): Promise<{ articles: UknowArticleSummary[]; total: number }> {
  const offset = (page - 1) * pageSize
  const searchTerm = q.trim()

  const result = await pool().query<UknowArticleSummary & { total: string; sentiment: string | null }>(
    `SELECT
       a.id,
       a.slug,
       a.section,
       a."sectionLabel",
       a.url,
       a.title,
       a.author,
       a."publishedAt",
       a."wordCount",
       a.sentiment,
       COALESCE((SELECT LEFT(c.content, 180) FROM "UKNowChunk" c WHERE c."articleId" = a.id ORDER BY c."chunkIndex" LIMIT 1), '') AS excerpt,
       COUNT(*) OVER() AS total
     FROM "UKNowArticle" a
     WHERE ($1::text = '' OR a.title ILIKE '%' || $1 || '%')
       AND ($2::text IS NULL OR $2::text = '' OR a.section = $2)
       AND ($3::timestamptz IS NULL OR a."publishedAt" >= $3::timestamptz)
       AND ($4::timestamptz IS NULL OR a."publishedAt" <= $4::timestamptz)
       AND ($7::text IS NULL OR $7::text = '' OR a.sentiment = $7)
     ORDER BY a."publishedAt" DESC NULLS LAST
     LIMIT $5 OFFSET $6`,
    [searchTerm, section ?? '', startDate ?? null, endDate ?? null, pageSize, offset, sentiment ?? '']
  )

  const total = result.rows.length > 0 ? parseInt(result.rows[0].total as unknown as string, 10) : 0
  const articles = result.rows.map(({ total: _, sentiment, publishedAt, ...rest }) => ({
    ...rest,
    publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
    sentiment: sentiment ?? null,
  }))

  // Fire-and-forget query logging
  if (q.trim()) {
    const topSection = articles[0]?.section ?? null
    const topTopics = extractTopTopicsFromArticles(articles.slice(0, 3))
    logQueryFireAndForget(q.trim(), topSection, topTopics, userId)
  }

  return { articles, total }
}

// ─── 2. getArticle ────────────────────────────────────────────────────────────

export async function getArticle(slug: string): Promise<UknowArticleFull | null> {
  const article = await prisma.uKNowArticle.findUnique({ where: { slug } })
  if (!article) return null

  // Fetch body text from chunks (body content lives in UKNowChunk, not on the article row)
  const chunks = await prisma.uKNowChunk.findMany({
    where: { articleId: article.id },
    orderBy: { chunkIndex: 'asc' },
    select: { content: true },
  })
  const bodyText = chunks.map((c) => c.content).join('\n\n') || undefined

  return { ...article, bodyText } as UknowArticleFull
}

// ─── 3. getRelatedArticles ────────────────────────────────────────────────────

export async function getRelatedArticles(
  articleId: string,
  title: string,
  topK = 4,
  section?: string
): Promise<UknowArticleSummary[]> {
  // Try vector search first
  try {
    const embedder = getEmbeddingProvider()
    const vec = await embedder.embed(title)
    const searchResults = await getVectorStore().newsSearch(vec, topK + 1, 0.60)

    const filtered = searchResults
      .filter((r) => r.articleId !== articleId)
      .slice(0, topK)

    if (filtered.length > 0) {
      const articleIds = [...new Set(filtered.map((r) => r.articleId))]
      const rows = await pool().query<{
        id: string; slug: string; section: string; sectionLabel: string; url: string;
        title: string; author: string | null; publishedAt: string | null; wordCount: number; excerpt: string;
      }>(
        `SELECT a.id, a.slug, a.section, a."sectionLabel", a.url, a.title, a.author, a."publishedAt", a."wordCount",
                COALESCE((SELECT LEFT(c.content, 180) FROM "UKNowChunk" c WHERE c."articleId" = a.id ORDER BY c."chunkIndex" LIMIT 1), '') AS excerpt
         FROM "UKNowArticle" a
         WHERE a.id = ANY($1::text[])`,
        [articleIds]
      )

      const byId = new Map(rows.rows.map((r) => [r.id, r]))
      const related: UknowArticleSummary[] = []
      for (const chunk of filtered) {
        const a = byId.get(chunk.articleId)
        if (!a) continue
        related.push({
          ...a,
          publishedAt: a.publishedAt ? new Date(a.publishedAt as string).toISOString() : null,
        })
      }
      if (related.length > 0) return related
    }
  } catch {
    // Vector search failed — fall through to same-section fallback
  }

  // Fallback: recent articles from the same section
  const fallbackRows = await pool().query<UknowArticleSummary>(
    `SELECT a.id, a.slug, a.section, a."sectionLabel", a.url, a.title, a.author, a."publishedAt", a."wordCount",
            COALESCE((SELECT LEFT(c.content, 180) FROM "UKNowChunk" c WHERE c."articleId" = a.id ORDER BY c."chunkIndex" LIMIT 1), '') AS excerpt
     FROM "UKNowArticle" a
     WHERE a.id != $1
       AND ($2::text IS NULL OR a.section = $2)
     ORDER BY a."publishedAt" DESC NULLS LAST
     LIMIT $3`,
    [articleId, section ?? null, topK]
  )

  return fallbackRows.rows.map((r) => ({
    ...r,
    publishedAt: r.publishedAt ? new Date(r.publishedAt as unknown as string).toISOString() : null,
  }))
}

// ─── 4. askAI ─────────────────────────────────────────────────────────────────

export async function askAI(
  query: string,
  userId?: string,
  history?: ConversationTurn[]
): Promise<AskAIResult> {
  // Try vector search first, fall back to keyword search if no embeddings exist
  let deduped: Array<{ articleId: string; url: string; title: string; section: string; sectionLabel: string; publishedAt: string | null; content: string; similarity: number }> = []

  try {
    const embedder = getEmbeddingProvider()
    const vec = await embedder.embed(query)
    const chunks = await getVectorStore().newsSearch(vec, 12, 0.60)

    // Deduplicate by articleId — keep highest similarity per article, max 5 articles
    const byArticle = new Map<string, typeof chunks[0]>()
    for (const chunk of chunks) {
      const existing = byArticle.get(chunk.articleId)
      if (!existing || chunk.similarity > existing.similarity) {
        byArticle.set(chunk.articleId, chunk)
      }
    }
    deduped = [...byArticle.values()]
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
  } catch {
    // Vector search failed (missing OPENAI_API_KEY or no embeddings) — continue to fallback
  }

  // Fallback: keyword search when vector search returns nothing
  if (deduped.length === 0) {
    const keywordResults = await pool().query<{
      id: string; slug: string; section: string; sectionLabel: string; url: string;
      title: string; author: string | null; publishedAt: Date | null; wordCount: number;
      content: string;
    }>(
      `SELECT a.id, a.slug, a.section, a."sectionLabel", a.url, a.title, a.author, a."publishedAt", a."wordCount",
              COALESCE((SELECT c.content FROM "UKNowChunk" c WHERE c."articleId" = a.id ORDER BY c."chunkIndex" LIMIT 1), a.summary, '') AS content
       FROM "UKNowArticle" a
       WHERE a.title ILIKE '%' || $1 || '%'
          OR a.summary ILIKE '%' || $1 || '%'
          OR EXISTS (SELECT 1 FROM "UKNowChunk" c WHERE c."articleId" = a.id AND c.content ILIKE '%' || $1 || '%')
       ORDER BY a."publishedAt" DESC NULLS LAST
       LIMIT 5`,
      [query.trim()]
    )

    deduped = keywordResults.rows.map((r) => ({
      articleId: r.id,
      url: r.url,
      title: r.title,
      section: r.section,
      sectionLabel: r.sectionLabel,
      publishedAt: r.publishedAt ? new Date(r.publishedAt).toISOString() : null,
      content: r.content,
      similarity: 0.5, // synthetic score for keyword matches
    }))
  }

  if (deduped.length === 0) {
    return {
      answer: "I couldn't find any relevant UKNow articles for that query. Try different keywords or browse by section.",
      sources: [],
      followUps: ['What research is happening at UK?', 'What are the latest campus news stories?'],
    }
  }

  const articleSnippets = deduped
    .map((r) => {
      const date = r.publishedAt
        ? new Date(r.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : ''
      return `**${r.title}** (${r.sectionLabel}${date ? `, ${date}` : ''})\n${r.content.slice(0, 400)}`
    })
    .join('\n\n---\n\n')

  const systemPrompt = `You are a helpful assistant with access to UKNow — the University of Kentucky's official news archive. Answer questions using only the provided article excerpts. Be concise and cite article titles when referencing them.\n\nAfter your answer, suggest exactly 2 brief follow-up questions the user might want to ask based on the cited articles. Format them on separate lines prefixed with "FOLLOWUP:" (e.g. "FOLLOWUP: What other research grants has UK received recently?")\n\nArticles:\n${articleSnippets}`

  // Build messages array — include history for multi-turn context (last 3 pairs max)
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []
  if (history && history.length > 0) {
    // Include last 6 entries (3 pairs) of conversation history
    const recentHistory = history.slice(-6)
    for (const turn of recentHistory) {
      messages.push({ role: turn.role, content: turn.content })
    }
  }
  // If the last message isn't the current query, add it
  if (messages.length === 0 || messages[messages.length - 1].content !== query) {
    messages.push({ role: 'user', content: query })
  }

  const client = new Anthropic()
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: systemPrompt,
    messages,
  })

  const rawAnswer = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')

  // Extract follow-up questions from the response
  const followUps: string[] = []
  const answerLines: string[] = []
  for (const line of rawAnswer.split('\n')) {
    const followUpMatch = line.match(/^FOLLOWUP:\s*(.+)$/)
    if (followUpMatch) {
      followUps.push(followUpMatch[1].trim())
    } else {
      answerLines.push(line)
    }
  }
  const answer = answerLines.join('\n').trim()

  const sources = deduped.map(({ articleId, url, title, section, sectionLabel, publishedAt, similarity }) => ({
    articleId,
    url,
    title,
    section,
    sectionLabel,
    publishedAt,
    similarity,
  }))

  // Fire-and-forget query logging
  const topSection = sources[0]?.section ?? null
  const topTopics = extractTopTopicsFromSources(deduped)
  logQueryFireAndForget(query, topSection, topTopics, userId)

  return { answer, sources, followUps: followUps.slice(0, 2) }
}

// ─── Query Log Helpers ───────────────────────────────────────────────────────

function extractTopTopicsFromArticles(articles: UknowArticleSummary[]): string[] {
  // Use section labels as topic proxies for search results (entities not loaded)
  const sections = articles.map((a) => a.sectionLabel).filter(Boolean)
  return [...new Set(sections)].slice(0, 5)
}

function extractTopTopicsFromSources(
  sources: Array<{ articleId: string; section: string; sectionLabel: string }>
): string[] {
  // Fetch entities from top sources would require async; use section labels as lightweight proxy
  const sections = sources.map((s) => s.sectionLabel).filter(Boolean)
  return [...new Set(sections)].slice(0, 5)
}

// ─── 5. getRecommendedArticles ────────────────────────────────────────────────

export async function getRecommendedArticles(
  userId: string,
  limit = 4
): Promise<UknowArticleSummary[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { department: true, college: true, role: true },
  })

  const interests = await prisma.userInterest.findMany({
    where: { userId, accepted: { not: false } },
    select: { tag: true },
    take: 5,
  })

  const signals: string[] = []
  if (user?.department) signals.push(user.department)
  if (user?.college) signals.push(user.college)
  for (const i of interests) signals.push(i.tag)

  // For educators: also use course topics as recommendation signals
  if (user?.role === 'EDUCATOR' || user?.role === 'ADMIN') {
    const courses = await prisma.course.findMany({
      where: { instructorId: userId },
      select: { title: true },
      take: 3,
    })
    for (const c of courses) {
      signals.push(c.title)
    }
  }

  // Try vector search first
  if (signals.length > 0) {
    try {
      const queryStr = signals.join(' ')
      const embedder = getEmbeddingProvider()
      const vec = await embedder.embed(queryStr)
      const searchResults = await getVectorStore().newsSearch(vec, limit + 2, 0.55)

      // Deduplicate by articleId
      const seen = new Set<string>()
      const deduped = searchResults.filter((r) => {
        if (seen.has(r.articleId)) return false
        seen.add(r.articleId)
        return true
      }).slice(0, limit)

      if (deduped.length > 0) {
        const articleIds = deduped.map((r) => r.articleId)
        const rows = await pool().query<UknowArticleSummary>(
          `SELECT a.id, a.slug, a.section, a."sectionLabel", a.url, a.title, a.author, a."publishedAt", a."wordCount",
                  COALESCE((SELECT LEFT(c.content, 180) FROM "UKNowChunk" c WHERE c."articleId" = a.id ORDER BY c."chunkIndex" LIMIT 1), '') AS excerpt
           FROM "UKNowArticle" a
           WHERE a.id = ANY($1::text[])`,
          [articleIds]
        )

        const byId = new Map(rows.rows.map((r) => [r.id, r]))
        const results: UknowArticleSummary[] = []
        for (const chunk of deduped) {
          const a = byId.get(chunk.articleId)
          if (!a) continue
          results.push({
            ...a,
            publishedAt: a.publishedAt ? new Date(a.publishedAt as unknown as string).toISOString() : null,
          })
        }
        if (results.length > 0) return results
      }
    } catch {
      // Vector search failed — fall through to keyword/recent fallback
    }
  }

  // Fallback: pick recent articles from diverse sections
  const rows = await pool().query<UknowArticleSummary>(
    `SELECT DISTINCT ON (a.section)
       a.id, a.slug, a.section, a."sectionLabel", a.url, a.title, a.author, a."publishedAt", a."wordCount",
       COALESCE((SELECT LEFT(c.content, 180) FROM "UKNowChunk" c WHERE c."articleId" = a.id ORDER BY c."chunkIndex" LIMIT 1), '') AS excerpt
     FROM "UKNowArticle" a
     ORDER BY a.section, a."publishedAt" DESC NULLS LAST`,
    []
  )

  return rows.rows
    .sort((a, b) => {
      const da = a.publishedAt ? new Date(a.publishedAt as unknown as string).getTime() : 0
      const db = b.publishedAt ? new Date(b.publishedAt as unknown as string).getTime() : 0
      return db - da
    })
    .slice(0, limit)
    .map((r) => ({
      ...r,
      publishedAt: r.publishedAt ? new Date(r.publishedAt as unknown as string).toISOString() : null,
    }))
}

// ─── 6. getSuggestedPrompts ───────────────────────────────────────────────────

const FALLBACK_PROMPTS = [
  'What research is happening at UK right now?',
  'Find recent campus news stories',
  "What's new in UK HealthCare?",
  'What are UK students up to this semester?',
]

export async function getSuggestedPrompts(user: {
  name?: string | null
  role?: string | null
  college?: string | null
  department?: string | null
}): Promise<string[]> {
  try {
    const client = new Anthropic()
    const userContext = [
      user.name && `Name: ${user.name}`,
      user.role && `Role: ${user.role}`,
      user.college && `College: ${user.college}`,
      user.department && `Department: ${user.department}`,
    ]
      .filter(Boolean)
      .join(', ')

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `Generate exactly 4 short questions that a University of Kentucky community member might ask when searching UK news (UKNow). User context: ${userContext || 'General UK community member'}.\n\nReturn ONLY a JSON array of 4 strings. No explanation. Example: ["Question 1?", "Question 2?", "Question 3?", "Question 4?"]`,
        },
      ],
    })

    const text = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    const parsed = JSON.parse(text.trim())
    if (Array.isArray(parsed) && parsed.length === 4 && parsed.every((s) => typeof s === 'string')) {
      return parsed
    }
    return FALLBACK_PROMPTS
  } catch {
    return FALLBACK_PROMPTS
  }
}

// ─── 7. getRecentArticles ─────────────────────────────────────────────────────

export async function getRecentArticles(section?: string, limit = 8): Promise<UknowArticleSummary[]> {
  const result = await pool().query<UknowArticleSummary>(
    `SELECT
       a.id,
       a.slug,
       a.section,
       a."sectionLabel",
       a.url,
       a.title,
       a.author,
       a."publishedAt",
       a."wordCount",
       COALESCE((SELECT LEFT(c.content, 180) FROM "UKNowChunk" c WHERE c."articleId" = a.id ORDER BY c."chunkIndex" LIMIT 1), '') AS excerpt
     FROM "UKNowArticle" a
     WHERE ($1::text IS NULL OR $1::text = '' OR a.section = $1)
     ORDER BY a."publishedAt" DESC NULLS LAST
     LIMIT $2`,
    [section ?? '', limit]
  )

  return result.rows.map((r) => ({
    ...r,
    publishedAt: r.publishedAt ? new Date(r.publishedAt as unknown as string).toISOString() : null,
  }))
}

// ─── 8. generateArticleSummary ────────────────────────────────────────────────

export async function generateArticleSummary(articleId: string): Promise<string> {
  const article = await prisma.uKNowArticle.findUniqueOrThrow({
    where: { id: articleId },
    select: { title: true },
  })

  const chunksResult = await pool().query<{ content: string }>(
    `SELECT content FROM "UKNowChunk" WHERE "articleId" = $1 ORDER BY "chunkIndex" LIMIT 3`,
    [articleId]
  )
  const chunkText = chunksResult.rows.map((r) => r.content).join('\n\n')

  const client = new Anthropic()
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    system: 'Summarize this university news article in exactly 2 sentences. Be factual and concise.',
    messages: [
      { role: 'user', content: `Title: ${article.title}\n\n${chunkText}` },
    ],
  })

  const summary = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')

  await prisma.uKNowArticle.update({
    where: { id: articleId },
    data: { summary },
  })

  return summary
}

// ─── 9. extractArticleEntities (+ sentiment) ─────────────────────────────────

export interface ArticleEntities {
  people: string[]
  departments: string[]
  programs: string[]
  topics: string[]
  sentiment?: 'positive' | 'neutral' | 'negative'
}

const EMPTY_ENTITIES: ArticleEntities = { people: [], departments: [], programs: [], topics: [] }

export async function extractArticleEntities(articleId: string): Promise<ArticleEntities> {
  const article = await prisma.uKNowArticle.findUniqueOrThrow({
    where: { id: articleId },
    select: { title: true },
  })

  const chunksResult = await pool().query<{ content: string }>(
    `SELECT content FROM "UKNowChunk" WHERE "articleId" = $1 ORDER BY "chunkIndex"`,
    [articleId]
  )
  const chunkText = chunksResult.rows.map((r) => r.content).join('\n\n')

  const client = new Anthropic()
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system:
      'Extract named entities and overall sentiment from this university news article. Return valid JSON with keys: people (full names), departments (UK departments/colleges), programs (degree programs, majors, minors), topics (subject matter tags, max 5), sentiment (one of "positive", "neutral", or "negative" — based on overall article tone). If none found for a category, use an empty array.',
    messages: [
      { role: 'user', content: `Title: ${article.title}\n\n${chunkText}` },
    ],
  })

  const text = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')

  let entities: ArticleEntities
  try {
    // Handle potential markdown code fences around JSON
    const jsonStr = text.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(jsonStr)
    const validSentiments = ['positive', 'neutral', 'negative']
    const rawSentiment = typeof parsed.sentiment === 'string' ? parsed.sentiment.toLowerCase().trim() : null
    entities = {
      people: Array.isArray(parsed.people) ? parsed.people : [],
      departments: Array.isArray(parsed.departments) ? parsed.departments : [],
      programs: Array.isArray(parsed.programs) ? parsed.programs : [],
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      sentiment: validSentiments.includes(rawSentiment ?? '') ? rawSentiment as 'positive' | 'neutral' | 'negative' : undefined,
    }
  } catch {
    console.error(`[uknow] Failed to parse entities JSON for article ${articleId}`)
    entities = EMPTY_ENTITIES
  }

  await prisma.uKNowArticle.update({
    where: { id: articleId },
    data: {
      entities: toJsonValue(entities),
      sentiment: entities.sentiment ?? null,
    },
  })

  return entities
}

/**
 * Lightweight sentiment-only extraction for articles that already have entities
 * but are missing sentiment. Uses title + first chunk (cheaper than full entity extraction).
 */
export async function extractSentimentOnly(articleId: string): Promise<string | null> {
  const article = await prisma.uKNowArticle.findUniqueOrThrow({
    where: { id: articleId },
    select: { title: true },
  })

  const chunksResult = await pool().query<{ content: string }>(
    `SELECT content FROM "UKNowChunk" WHERE "articleId" = $1 ORDER BY "chunkIndex" LIMIT 1`,
    [articleId]
  )
  const preview = chunksResult.rows[0]?.content ?? ''

  const client = new Anthropic()
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 20,
    system: 'Classify the overall sentiment of this university news article as exactly one word: positive, neutral, or negative. Output only that one word.',
    messages: [
      { role: 'user', content: `Title: ${article.title}\n\n${preview.slice(0, 800)}` },
    ],
  })

  const text = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')
    .toLowerCase()
    .trim()

  const valid = ['positive', 'neutral', 'negative']
  const sentiment = valid.find((v) => text.includes(v)) ?? null

  if (sentiment) {
    await prisma.uKNowArticle.update({
      where: { id: articleId },
      data: { sentiment },
    })
  }

  return sentiment
}

// ─── 10. matchAlertsForArticle ────────────────────────────────────────────────

export async function matchAlertsForArticle(articleId: string): Promise<number> {
  // Fetch first 3 chunks and compute average embedding
  const chunksResult = await pool().query<{ embedding: string }>(
    `SELECT embedding::text FROM "UKNowChunk"
     WHERE "articleId" = $1 AND embedding IS NOT NULL
     ORDER BY "chunkIndex" LIMIT 3`,
    [articleId]
  )

  if (chunksResult.rows.length === 0) return 0

  // Parse embeddings and compute average
  const embeddings = chunksResult.rows.map((r) => {
    const nums = r.embedding.replace(/[\[\]]/g, '').split(',').map(Number)
    return nums
  })
  const dims = embeddings[0].length
  const avgEmbedding = new Array(dims).fill(0)
  for (const emb of embeddings) {
    for (let i = 0; i < dims; i++) avgEmbedding[i] += emb[i]
  }
  for (let i = 0; i < dims; i++) avgEmbedding[i] /= embeddings.length

  const vectorLiteral = `[${avgEmbedding.map((n: number) => n.toFixed(8)).join(',')}]`

  // Find matching alerts using cosine similarity via pgvector
  const matchResults = await pool().query<{
    id: string
    label: string
    userId: string
  }>(
    `SELECT a.id, a.label, a."userId"
     FROM "UKNowAlert" a
     WHERE a.active = true
       AND a.embedding IS NOT NULL
       AND 1 - (a.embedding <=> $1::vector) >= 0.75`,
    [vectorLiteral]
  )

  if (matchResults.rows.length === 0) return 0

  // Get article info for notifications
  const article = await prisma.uKNowArticle.findUniqueOrThrow({
    where: { id: articleId },
    select: { title: true, slug: true },
  })

  let newMatches = 0

  for (const alert of matchResults.rows) {
    // Get exact similarity for the match record
    const exactSimResult = await pool().query<{ similarity: number }>(
      `SELECT 1 - (a.embedding <=> $1::vector) AS similarity
       FROM "UKNowAlert" a WHERE a.id = $2`,
      [vectorLiteral, alert.id]
    )
    const similarity = exactSimResult.rows[0]?.similarity ?? 0.75

    // Upsert the match record
    const upsertResult = await pool().query<{ id: string; notifiedAt: Date | null }>(
      `INSERT INTO "UKNowAlertMatch" (id, "alertId", "articleId", similarity, "createdAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, NOW())
       ON CONFLICT ("alertId", "articleId") DO UPDATE SET similarity = $3
       RETURNING id, "notifiedAt"`,
      [alert.id, articleId, similarity]
    )

    const match = upsertResult.rows[0]
    if (match && match.notifiedAt === null) {
      // New match — create notification
      try {
        await createNotification({
          userId: alert.userId,
          type: 'UKNOW_ALERT',
          title: `UKNow Alert: ${alert.label}`,
          body: `New article matches your alert: ${article.title}`,
          href: `/uknow/${article.slug}`,
        })

        // Mark as notified
        await pool().query(
          `UPDATE "UKNowAlertMatch" SET "notifiedAt" = NOW() WHERE id = $1`,
          [match.id]
        )
      } catch (err) {
        console.error(`[uknow] Failed to notify for alert match ${match.id}:`, err)
      }

      newMatches++
    }
  }

  return newMatches
}

// ─── 11. ingestNewArticles ────────────────────────────────────────────────────

const CHUNK_SIZE = 2000
const CHUNK_OVERLAP = 256

function chunkText(text: string): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length)
    chunks.push(text.slice(start, end))
    if (end === text.length) break
    start = end - CHUNK_OVERLAP
  }
  return chunks
}

// ─── RSS-based ingestion (replaces brittle HTML scraper) ─────────────────────

const RSS_FEED_URL = 'https://uknow.uky.edu/feed'

interface RssItem {
  title: string
  link: string
  description: string
  pubDate: string | null
  author: string | null
  category: string | null
}

/** Parse RSS 2.0 XML into structured items using regex (no XML library needed). */
function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = []
  const itemPattern = /<item>([\s\S]*?)<\/item>/gi
  let match: RegExpExecArray | null
  while ((match = itemPattern.exec(xml)) !== null) {
    const block = match[1]
    const extract = (tag: string): string | null => {
      // Handle CDATA: <tag><![CDATA[content]]></tag>
      const cdataMatch = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'))
      if (cdataMatch) return cdataMatch[1].trim()
      const plainMatch = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
      return plainMatch ? plainMatch[1].trim() : null
    }

    const title = extract('title')
    const link = extract('link')
    if (!title || !link) continue

    items.push({
      title,
      link,
      description: extract('description') ?? '',
      pubDate: extract('pubDate'),
      author: extract('dc:creator') ?? extract('author'),
      category: extract('category'),
    })
  }
  return items
}

/** Derive section slug from RSS category or URL path. */
function deriveSection(item: RssItem): { section: string; sectionLabel: string } {
  // Try category first
  if (item.category) {
    const cat = item.category.toLowerCase().replace(/\s+/g, '-')
    const labelMap: Record<string, string> = {
      'campus-news': 'Campus News', research: 'Research', 'arts-culture': 'Arts & Culture',
      sports: 'Sports', community: 'Community', 'uk-healthcare': 'UK HealthCare',
      students: 'Students', 'faculty-staff': 'Faculty & Staff',
    }
    if (labelMap[cat]) return { section: cat, sectionLabel: labelMap[cat] }
  }
  // Fall back to URL path
  const pathSegments = new URL(item.link).pathname.split('/').filter(Boolean)
  const slug = pathSegments[0] ?? 'campus-news'
  const label = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return { section: slug, sectionLabel: label }
}

/** Strip HTML tags from RSS description to get plain text. */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export async function ingestNewArticles(): Promise<IngestResult> {
  let ingested = 0
  let errors = 0
  const embedder = getEmbeddingProvider()

  try {
    const res = await fetch(RSS_FEED_URL, {
      headers: { 'User-Agent': 'UKNow-Ingest/1.0' },
    })
    if (!res.ok) return { ingested: 0, errors: 1 }
    const xml = await res.text()

    const items = parseRssItems(xml)
    if (items.length === 0) return { ingested: 0, errors: 0 }

    for (const item of items) {
      const urlSlug = item.link.split('/').filter(Boolean).pop() ?? ''
      if (!urlSlug) continue

      // Skip if already in DB
      const existing = await pool().query<{ id: string }>(
        `SELECT id FROM "UKNowArticle" WHERE slug = $1`,
        [urlSlug]
      )
      if (existing.rows.length > 0) continue

      try {
        const { section, sectionLabel } = deriveSection(item)
        const bodyText = stripHtml(item.description)
        if (!bodyText) continue

        let publishedAt: Date | null = null
        if (item.pubDate) {
          const d = new Date(item.pubDate)
          if (!isNaN(d.getTime())) publishedAt = d
        }

        // Insert article
        const insertResult = await pool().query<{ id: string }>(
          `INSERT INTO "UKNowArticle" (id, slug, section, "sectionLabel", url, title, author, "publishedAt", "wordCount", "createdAt")
           VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, NOW())
           ON CONFLICT (slug) DO NOTHING
           RETURNING id`,
          [urlSlug, section, sectionLabel, item.link, item.title, item.author, publishedAt, bodyText.split(/\s+/).length]
        )
        if (insertResult.rows.length === 0) continue
        const articleId = insertResult.rows[0].id

        // Chunk and embed
        const textChunks = chunkText(bodyText)
        const embeddings = await embedder.embedBatch(textChunks)

        for (let i = 0; i < textChunks.length; i++) {
          const vectorLiteral = `[${embeddings[i].map((n) => n.toFixed(8)).join(',')}]`
          await pool().query(
            `INSERT INTO "UKNowChunk" (id, "articleId", "chunkIndex", content, "tokenCount", embedding, "createdAt")
             VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5::vector, NOW())`,
            [articleId, i, textChunks[i], Math.ceil(textChunks[i].length / 4), vectorLiteral]
          )
        }

        // Mark article as embedded
        await pool().query(
          `UPDATE "UKNowArticle" SET "embeddedAt" = NOW() WHERE id = $1`,
          [articleId]
        )

        // Fire-and-forget intelligence enrichment
        generateArticleSummary(articleId).catch((err) =>
          console.error(`[uknow] summary failed for ${articleId}:`, err)
        )
        extractArticleEntities(articleId).catch((err) =>
          console.error(`[uknow] entities failed for ${articleId}:`, err)
        )
        matchAlertsForArticle(articleId).catch((err) =>
          console.error(`[uknow] alert matching failed for ${articleId}:`, err)
        )

        ingested++
      } catch {
        errors++
      }
    }
  } catch {
    errors++
  }

  return { ingested, errors }
}

// ─── 12. Citation Tracking ──────────────────────────────────────────────────

/**
 * Logs a UKNow citation detected in Sandy's response.
 * Fire-and-forget — caller should not await.
 */
export function logCitationFireAndForget(
  userId: string,
  articleId: string,
  sessionContext?: string
) {
  prisma.uKNowCitationLog
    .create({
      data: { userId, articleId, sessionContext: sessionContext ?? null },
    })
    .catch((err) => console.error('[uknow] citation log failed:', err))
}

/**
 * Extracts UKNow article IDs from Sandy's response text by matching /uknow/ links.
 * Returns an array of article slugs found.
 */
export function extractCitedSlugs(responseText: string): string[] {
  const slugs: string[] = []
  // Match markdown links to /uknow/slug or full URLs containing uknow.uky.edu
  const patterns = [
    /\[([^\]]+)\]\(\/uknow\/([a-z0-9-]+)\)/gi,
    /\[([^\]]+)\]\(https?:\/\/uknow\.uky\.edu\/[^/]+\/([a-z0-9-]+)\)/gi,
  ]
  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(responseText)) !== null) {
      slugs.push(match[2])
    }
  }
  return [...new Set(slugs)]
}

/**
 * Log all citations found in Sandy's response. Resolves slugs to article IDs.
 */
export async function logCitationsFromResponse(
  userId: string,
  responseText: string,
  sessionContext?: string
): Promise<void> {
  const slugs = extractCitedSlugs(responseText)
  if (slugs.length === 0) return

  const articles = await prisma.uKNowArticle.findMany({
    where: { slug: { in: slugs } },
    select: { id: true },
  })

  for (const article of articles) {
    logCitationFireAndForget(userId, article.id, sessionContext)
  }
}

/**
 * Returns citation analytics for admin dashboard.
 */
export async function getCitationStats(days = 30): Promise<{
  totalCitations: number
  uniqueArticlesCited: number
  topArticles: Array<{ articleId: string; title: string; slug: string; citationCount: number }>
  recentCitations: Array<{ userName: string; articleTitle: string; createdAt: string }>
}> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [totalCitations, topArticlesRaw, recentCitationsRaw] = await Promise.all([
    prisma.uKNowCitationLog.count({ where: { createdAt: { gte: since } } }),
    pool().query<{ articleId: string; title: string; slug: string; count: string }>(
      `SELECT cl."articleId", a.title, a.slug, COUNT(*)::text as count
       FROM "UKNowCitationLog" cl
       JOIN "UKNowArticle" a ON a.id = cl."articleId"
       WHERE cl."createdAt" >= $1
       GROUP BY cl."articleId", a.title, a.slug
       ORDER BY COUNT(*) DESC
       LIMIT 10`,
      [since]
    ),
    prisma.uKNowCitationLog.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        createdAt: true,
        user: { select: { name: true } },
        article: { select: { title: true } },
      },
    }),
  ])

  const topArticles = topArticlesRaw.rows.map((r) => ({
    articleId: r.articleId,
    title: r.title,
    slug: r.slug,
    citationCount: parseInt(r.count, 10),
  }))

  const uniqueArticlesCited = topArticles.length

  const recentCitations = recentCitationsRaw.map((c) => ({
    userName: c.user.name,
    articleTitle: c.article.title,
    createdAt: c.createdAt.toISOString(),
  }))

  return { totalCitations, uniqueArticlesCited, topArticles, recentCitations }
}

// ─── 13. getArticlesForCourse ───────────────────────────────────────────────

/**
 * Finds UKNow articles relevant to a course by embedding the course title
 * and material titles, then running a vector search.
 */
export async function getArticlesForCourse(
  courseId: string,
  limit = 5
): Promise<UknowArticleSummary[]> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      title: true,
      materials: { select: { title: true }, take: 5 },
    },
  })

  if (!course) return []

  // Build a query string from course title + material titles
  const signals = [course.title]
  for (const m of course.materials) {
    signals.push(m.title)
  }
  const queryStr = signals.join('. ')

  const embedder = getEmbeddingProvider()
  const vec = await embedder.embed(queryStr)
  const searchResults = await getVectorStore().newsSearch(vec, limit + 2, 0.55)

  // Deduplicate by articleId
  const seen = new Set<string>()
  const deduped = searchResults.filter((r) => {
    if (seen.has(r.articleId)) return false
    seen.add(r.articleId)
    return true
  }).slice(0, limit)

  if (deduped.length === 0) return []

  const articleIds = deduped.map((r) => r.articleId)
  const rows = await pool().query<UknowArticleSummary>(
    `SELECT a.id, a.slug, a.section, a."sectionLabel", a.url, a.title, a.author, a."publishedAt", a."wordCount",
            COALESCE((SELECT LEFT(c.content, 180) FROM "UKNowChunk" c WHERE c."articleId" = a.id ORDER BY c."chunkIndex" LIMIT 1), '') AS excerpt
     FROM "UKNowArticle" a
     WHERE a.id = ANY($1::text[])`,
    [articleIds]
  )

  const byId = new Map(rows.rows.map((r) => [r.id, r]))
  const results: UknowArticleSummary[] = []
  for (const chunk of deduped) {
    const a = byId.get(chunk.articleId)
    if (!a) continue
    results.push({
      ...a,
      publishedAt: a.publishedAt ? new Date(a.publishedAt as unknown as string).toISOString() : null,
    })
  }
  return results
}

// ─── 14. getSandyCitation — check if Sandy recently cited this article ───────

export async function getSandyCitation(
  articleId: string
): Promise<{ snippet: string; citedAt: string } | null> {
  const citation = await prisma.uKNowCitationLog.findFirst({
    where: { articleId },
    orderBy: { createdAt: 'desc' },
    select: { sessionContext: true, createdAt: true },
  })

  if (!citation) return null

  return {
    snippet: citation.sessionContext ?? 'Referenced in a Sandy conversation',
    citedAt: citation.createdAt.toISOString(),
  }
}

// ─── 15. getAlertPreviewArticles — live match preview for alert creation ─────

export async function getAlertPreviewArticles(
  query: string,
  limit = 3
): Promise<Array<{ title: string; slug: string }>> {
  const embedder = getEmbeddingProvider()
  const vec = await embedder.embed(query)
  const searchResults = await getVectorStore().newsSearch(vec, limit + 2, 0.60)

  const seen = new Set<string>()
  const deduped = searchResults.filter((r) => {
    if (seen.has(r.articleId)) return false
    seen.add(r.articleId)
    return true
  }).slice(0, limit)

  if (deduped.length === 0) return []

  const articleIds = deduped.map((r) => r.articleId)
  const rows = await pool().query<{ title: string; slug: string }>(
    `SELECT a.title, a.slug FROM "UKNowArticle" a WHERE a.id = ANY($1::text[])`,
    [articleIds]
  )

  return rows.rows
}
