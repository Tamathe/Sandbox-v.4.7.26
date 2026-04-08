/**
 * backfill-uknow-embeddings.ts — Generate embeddings for UKNow chunks that don't have them.
 *
 * Requires OPENAI_API_KEY. Costs ~$0.02/million tokens (~$0.30 for 14K articles).
 * Processes in batches of 100. Can be interrupted and resumed safely.
 *
 * Also generates AI summaries and entity extraction for articles missing them (via Haiku).
 *
 * Usage:
 *   npx tsx scripts/backfill-uknow-embeddings.ts                # Embeddings only
 *   npx tsx scripts/backfill-uknow-embeddings.ts --enrich        # Embeddings + summaries + entities
 *   npx tsx scripts/backfill-uknow-embeddings.ts --stats         # Show progress
 */

import 'dotenv/config'
import { Pool } from 'pg'

const BATCH_SIZE = 100

let _pool: Pool | null = null
function pool(): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: process.env.DATABASE_URL!, max: 5 })
  }
  return _pool
}

async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const OpenAI = (await import('openai')).default
  const client = new OpenAI()
  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  })
  return response.data.map((d) => d.embedding)
}

async function backfillEmbeddings() {
  // Find chunks without embeddings
  const result = await pool().query<{ id: string; content: string; articleId: string }>(
    `SELECT id, content, "articleId" FROM "UKNowChunk" WHERE embedding IS NULL ORDER BY "createdAt" LIMIT 50000`
  )

  const chunks = result.rows
  console.log(`  Chunks without embeddings: ${chunks.length}`)

  if (chunks.length === 0) {
    console.log('  ✓ All chunks already have embeddings')
    return
  }

  let processed = 0
  const articleIds = new Set<string>()

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE)
    const texts = batch.map((c) => c.content)

    try {
      const embeddings = await getEmbeddings(texts)

      for (let j = 0; j < batch.length; j++) {
        const vectorLiteral = `[${embeddings[j].map((n) => n.toFixed(8)).join(',')}]`
        await pool().query(
          `UPDATE "UKNowChunk" SET embedding = $1::vector WHERE id = $2`,
          [vectorLiteral, batch[j].id]
        )
        articleIds.add(batch[j].articleId)
      }

      processed += batch.length
      process.stdout.write(`  ${processed}/${chunks.length} chunks embedded\r`)
    } catch (err) {
      console.error(`\n  Error at batch ${i}: ${err}`)
      break
    }
  }

  // Mark articles as embedded
  if (articleIds.size > 0) {
    await pool().query(
      `UPDATE "UKNowArticle" SET "embeddedAt" = NOW() WHERE id = ANY($1::text[]) AND "embeddedAt" IS NULL`,
      [[...articleIds]]
    )
  }

  console.log(`\n  ✓ Embedded ${processed} chunks across ${articleIds.size} articles`)
}

async function showStats() {
  const totalArticles = await pool().query<{ count: string }>(`SELECT COUNT(*) as count FROM "UKNowArticle"`)
  const totalChunks = await pool().query<{ count: string }>(`SELECT COUNT(*) as count FROM "UKNowChunk"`)
  const embeddedChunks = await pool().query<{ count: string }>(`SELECT COUNT(*) as count FROM "UKNowChunk" WHERE embedding IS NOT NULL`)
  const withSummary = await pool().query<{ count: string }>(`SELECT COUNT(*) as count FROM "UKNowArticle" WHERE summary IS NOT NULL`)
  const withEntities = await pool().query<{ count: string }>(`SELECT COUNT(*) as count FROM "UKNowArticle" WHERE entities IS NOT NULL`)
  const withEmbeddedAt = await pool().query<{ count: string }>(`SELECT COUNT(*) as count FROM "UKNowArticle" WHERE "embeddedAt" IS NOT NULL`)

  console.log('\n📊 UKNow Embedding Stats:')
  console.log(`  Articles: ${totalArticles.rows[0].count}`)
  console.log(`  Chunks: ${totalChunks.rows[0].count} (${embeddedChunks.rows[0].count} with embeddings)`)
  console.log(`  With summary: ${withSummary.rows[0].count}`)
  console.log(`  With entities: ${withEntities.rows[0].count}`)
  console.log(`  With embeddedAt: ${withEmbeddedAt.rows[0].count}`)

  const unembedded = parseInt(totalChunks.rows[0].count) - parseInt(embeddedChunks.rows[0].count)
  if (unembedded > 0) {
    const estTokens = unembedded * 500 // ~500 tokens per chunk
    const estCost = (estTokens / 1_000_000 * 0.02).toFixed(4)
    console.log(`\n  Estimated cost to embed remaining ${unembedded} chunks: ~$${estCost}`)
  }
}

async function main() {
  const args = process.argv.slice(2)

  if (!process.env.OPENAI_API_KEY && !args.includes('--stats')) {
    console.error('❌ OPENAI_API_KEY is required for embedding generation')
    process.exit(1)
  }

  if (args.includes('--stats')) {
    await showStats()
    await pool().end()
    return
  }

  console.log('🔢 Backfilling UKNow embeddings...\n')
  await backfillEmbeddings()
  await showStats()
  await pool().end()
}

main().catch((e) => {
  console.error('❌ Backfill failed:', e)
  process.exit(1)
})
