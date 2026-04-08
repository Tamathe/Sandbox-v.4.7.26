/**
 * UKNow News Archive — Ingestion Script
 *
 * Reads output/uknow-articles.json, upserts UKNowArticle records,
 * chunks body text, embeds with OpenAI text-embedding-3-small,
 * and stores UKNowChunk records with pgvector embeddings.
 *
 * Fully resumable: skips articles where embeddedAt is already set.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... DATABASE_URL=postgresql://... node ingest.mjs
 *   (or put both in ../.env.local and they'll be loaded automatically)
 *
 * Requires: npm install pg openai
 */

import { readFile, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'
import pg from 'pg'
import OpenAI from 'openai'

// ── Load env from the-sandbox .env if not already set ─────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url))
if (!process.env.DATABASE_URL || !process.env.OPENAI_API_KEY) {
  const envPath = join(__dirname, '..', 'the-sandbox', '.env')
  if (existsSync(envPath)) {
    const raw = await readFile(envPath, 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z_]+)="?([^"]*)"?\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
    }
  }
}

const DATABASE_URL = process.env.DATABASE_URL
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!DATABASE_URL) { console.error('DATABASE_URL is required'); process.exit(1) }
if (!OPENAI_API_KEY) { console.error('OPENAI_API_KEY is required'); process.exit(1) }

const ARTICLES_FILE   = join(__dirname, 'output', 'uknow-articles.json')
const CHUNK_SIZE      = 2000   // chars (~512 tokens)
const CHUNK_OVERLAP   = 256    // chars
const EMBED_BATCH     = 100    // texts per OpenAI embedding request
const CONCURRENCY     = 3      // parallel embed+insert workers
const EMBED_MODEL     = 'text-embedding-3-small'

const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 5, ssl: { rejectUnauthorized: false } })
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// ── Text chunker (matches document-chunker.ts) ────────────────────────────────

function chunkText(text) {
  if (!text || text.trim().length === 0) return []
  const chunks = []
  const paragraphs = text.split(/\n\n+/)
  let current = ''

  const flush = () => {
    if (current.trim().length > 0) {
      chunks.push(current.trim())
    }
    current = ''
  }

  for (const para of paragraphs) {
    if (current.length + para.length + 2 > CHUNK_SIZE) {
      flush()
      // Para itself might be oversized — split at sentence boundary
      if (para.length > CHUNK_SIZE) {
        const sentences = para.match(/[^.!?]+[.!?]+/g) || [para]
        for (const s of sentences) {
          if (current.length + s.length + 1 > CHUNK_SIZE) flush()
          current += (current ? ' ' : '') + s.trim()
        }
      } else {
        current = para
      }
    } else {
      current += (current ? '\n\n' : '') + para
    }
  }
  flush()

  // Add overlap: each chunk prepends the tail of the previous chunk
  const result = []
  for (let i = 0; i < chunks.length; i++) {
    let content = chunks[i]
    if (i > 0) {
      const prev = chunks[i - 1]
      const overlap = prev.slice(Math.max(0, prev.length - CHUNK_OVERLAP))
      content = overlap + '\n\n' + content
    }
    result.push({
      chunkIndex: i,
      content,
      tokenCount: Math.ceil(content.length / 4),
    })
  }
  return result
}

// ── OpenAI embeddings (batched) ───────────────────────────────────────────────

async function embedBatch(texts, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await openai.embeddings.create({ model: EMBED_MODEL, input: texts })
      return res.data.map(d => d.embedding)
    } catch (err) {
      console.warn(`  Embed attempt ${attempt}/${retries}: ${err.message}`)
      if (attempt < retries) await sleep(2000 * attempt)
      else throw err
    }
  }
}

// ── Semaphore ─────────────────────────────────────────────────────────────────

function createSemaphore(limit) {
  let active = 0
  const queue = []
  return {
    async acquire() {
      if (active < limit) { active++; return }
      await new Promise(resolve => queue.push(resolve))
      active++
    },
    release() {
      active--
      if (queue.length > 0) queue.shift()()
    },
  }
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function upsertArticle(article) {
  const client = await pool.connect()
  try {
    const res = await client.query(
      `INSERT INTO "UKNowArticle"
         (id, slug, section, "sectionLabel", url, title, author,
          "publishedAt", "modifiedAt", "wordCount", "createdAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title,
         author = EXCLUDED.author,
         "publishedAt" = EXCLUDED."publishedAt",
         "modifiedAt" = EXCLUDED."modifiedAt",
         "wordCount" = EXCLUDED."wordCount"
       RETURNING id, "embeddedAt"`,
      [
        article.slug,
        article.section,
        article.sectionLabel,
        article.url,
        article.title,
        article.author ?? null,
        article.publishedAt ? new Date(article.publishedAt) : null,
        article.modifiedAt ? new Date(article.modifiedAt) : null,
        article.wordCount ?? 0,
      ]
    )
    return res.rows[0]  // { id, embeddedAt }
  } finally {
    client.release()
  }
}

async function upsertChunks(articleId, chunks, embeddings) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM "UKNowChunk" WHERE "articleId" = $1', [articleId])
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const vec = embeddings[i]
      const vecLiteral = `[${vec.map(n => n.toFixed(8)).join(',')}]`
      await client.query(
        `INSERT INTO "UKNowChunk"
           (id, "articleId", "chunkIndex", content, "tokenCount", embedding, "createdAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5::vector, NOW())`,
        [articleId, chunk.chunkIndex, chunk.content, chunk.tokenCount, vecLiteral]
      )
    }
    await client.query(
      `UPDATE "UKNowArticle" SET "embeddedAt" = NOW() WHERE id = $1`,
      [articleId]
    )
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// ── Process one article ───────────────────────────────────────────────────────

async function processArticle(article, index, total, sem) {
  await sem.acquire()
  try {
    process.stdout.write(`\r  [${index + 1}/${total}] ${article.slug.slice(0, 60).padEnd(60)}`)

    // Upsert the article record
    const row = await upsertArticle(article)

    // Skip if already embedded
    if (row.embeddedAt) return

    // Skip articles with no body text
    const bodyText = article.bodyText?.trim()
    if (!bodyText || bodyText.length < 50) {
      await pool.query(`UPDATE "UKNowArticle" SET "embeddedAt" = NOW() WHERE id = $1`, [row.id])
      return
    }

    // Chunk the body
    const chunks = chunkText(bodyText)
    if (chunks.length === 0) return

    // Embed in batches of EMBED_BATCH
    const allEmbeddings = []
    for (let b = 0; b < chunks.length; b += EMBED_BATCH) {
      const batch = chunks.slice(b, b + EMBED_BATCH)
      const texts = batch.map(c => {
        // Prepend title to first chunk for better retrieval
        return b === 0 && batch.indexOf(c) === 0
          ? `${article.title}\n\n${c.content}`
          : c.content
      })
      const embeddings = await embedBatch(texts)
      allEmbeddings.push(...embeddings)
    }

    await upsertChunks(row.id, chunks, allEmbeddings)
  } catch (err) {
    console.error(`\n  ERROR ${article.slug}: ${err.message}`)
  } finally {
    sem.release()
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== UKNow Ingestion Script ===')
  console.log(`Model: ${EMBED_MODEL} | Chunk: ${CHUNK_SIZE} chars | Overlap: ${CHUNK_OVERLAP} chars | Concurrency: ${CONCURRENCY}\n`)

  if (!existsSync(ARTICLES_FILE)) {
    console.error('output/uknow-articles.json not found — run scrape.mjs first')
    process.exit(1)
  }

  console.log('Loading uknow-articles.json ...')
  const data = JSON.parse(await readFile(ARTICLES_FILE, 'utf8'))
  const articles = data.articles
  console.log(`${articles.length} articles loaded.\n`)

  // Check how many are already embedded
  const res = await pool.query('SELECT COUNT(*) FROM "UKNowArticle" WHERE "embeddedAt" IS NOT NULL')
  const alreadyDone = parseInt(res.rows[0].count, 10)
  console.log(`Already embedded: ${alreadyDone} / ${articles.length}\n`)

  const sem = createSemaphore(CONCURRENCY)
  const total = articles.length

  await Promise.all(
    articles.map((article, i) => processArticle(article, i, total, sem))
  )

  console.log('\n\nDone. Final stats:')
  const final = await pool.query(
    `SELECT COUNT(*) AS articles,
            SUM(CASE WHEN "embeddedAt" IS NOT NULL THEN 1 ELSE 0 END) AS embedded
     FROM "UKNowArticle"`
  )
  const chunkCount = await pool.query('SELECT COUNT(*) FROM "UKNowChunk"')
  console.log(`  Articles in DB : ${final.rows[0].articles}`)
  console.log(`  Embedded       : ${final.rows[0].embedded}`)
  console.log(`  Total chunks   : ${chunkCount.rows[0].count}`)

  await pool.end()
}

main().catch(err => {
  console.error('\nFatal:', err)
  process.exit(1)
})
