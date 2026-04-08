/**
 * export-uknow.ts — Export all UKNow articles + chunks from the database to JSON.
 *
 * Outputs prisma/data/uknow-corpus.json in the same format the seed script reads.
 * Embeddings are NOT exported (too large). Use backfill-uknow-embeddings.ts to regenerate.
 *
 * Usage:
 *   npx tsx scripts/export-uknow.ts
 */

import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { PrismaClient } from '../app/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })
const OUTPUT_FILE = path.join(__dirname, '..', 'prisma', 'data', 'uknow-corpus.json')

async function main() {
  console.log('Exporting UKNow articles from database...')

  const articles = await prisma.uKNowArticle.findMany({
    include: {
      chunks: {
        select: { chunkIndex: true, content: true },
        orderBy: { chunkIndex: 'asc' },
      },
    },
    orderBy: { publishedAt: 'desc' },
  })

  const corpus = articles.map((a) => ({
    slug: a.slug,
    url: a.url,
    title: a.title,
    section: a.section,
    sectionLabel: a.sectionLabel,
    author: a.author,
    publishedAt: a.publishedAt?.toISOString() ?? null,
    excerpt: a.chunks[0]?.content.slice(0, 300) ?? '',
    body: a.chunks.map((c) => c.content).join('\n\n') || a.summary || '',
    wordCount: a.wordCount,
    summary: a.summary,
    sentiment: a.sentiment,
    entities: a.entities,
  }))

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(corpus, null, 2))

  const sizeMB = (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(1)
  console.log(`✓ Exported ${corpus.length} articles → ${OUTPUT_FILE} (${sizeMB} MB)`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('❌ Export failed:', e)
  process.exit(1)
})
