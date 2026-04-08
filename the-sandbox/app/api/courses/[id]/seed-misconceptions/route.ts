/**
 * GET  /api/courses/[courseId]/seed-misconceptions
 *   Returns current seeding status: total records + lastUpdatedAt.
 *
 * POST /api/courses/[courseId]/seed-misconceptions
 *   Educator-triggered pipeline:
 *   1. Fetch all DocumentChunks for course (batched 5 at a time)
 *   2. Haiku call per batch → (conceptSlug, misconceptionText, triggerPatterns[], remediationHint) tuples
 *   3. Upsert MisconceptionTaxonomy records
 *   4. Seed GraphRAG nodes with type "misconception" + CORRECTS / COMMON_CONFUSION edges
 *
 * One-time + refresh: re-running overwrites existing records for the course.
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../../../lib/prisma'
import { requireEducatorUser } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'

export const runtime = 'nodejs'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const HAIKU = 'claude-haiku-4-5-20251001'
const BATCH_SIZE = 5

// ── Haiku extraction prompt ────────────────────────────────────────────────────

const EXTRACTION_SYSTEM = `You are an expert curriculum designer analyzing educational content to identify common student misconceptions.

For each passage, extract up to 5 misconceptions students commonly develop around the key concepts in that text.

Return ONLY valid JSON:
{
  "misconceptions": [
    {
      "conceptSlug": "<lowercase-hyphenated-concept-name>",
      "misconceptionText": "<concise description of what students wrongly believe>",
      "triggerPatterns": ["<regex pattern 1>", "<regex pattern 2>"],
      "remediationHint": "<1-2 sentence correction Sandy should use — direct, not a lecture>"
    }
  ]
}

Trigger patterns should be simple regex strings that match student phrasing that reveals this misconception.
Example: for misconception "students think correlation implies causation", triggerPatterns might be ["causes", "because of", "led to", "due to"].
Keep them broad enough to catch paraphrase — not so broad they match everything.
Max 3 trigger patterns per misconception. Max 5 misconceptions per passage.`

interface ExtractedMisconception {
  conceptSlug: string
  misconceptionText: string
  triggerPatterns: string[]
  remediationHint: string
}

async function extractMisconceptionsFromChunk(
  chunkContent: string,
): Promise<ExtractedMisconception[]> {
  try {
    const msg = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 1024,
      system: EXTRACTION_SYSTEM,
      messages: [{ role: 'user', content: chunkContent.slice(0, 3000) }],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
    const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(clean) as { misconceptions: ExtractedMisconception[] }
    return Array.isArray(parsed.misconceptions) ? parsed.misconceptions.slice(0, 5) : []
  } catch {
    return []
  }
}

// ── GraphRAG seeding ───────────────────────────────────────────────────────────

async function seedMisconceptionGraphNodes(
  courseId: string,
  misconceptions: (ExtractedMisconception & { id: string })[],
): Promise<void> {
  for (const m of misconceptions) {
    // Upsert GraphEntity with type "misconception"
    await prisma.$executeRawUnsafe(
      `INSERT INTO "GraphEntity" (id, "courseId", name, type, description, "sourceChunkIds", "communityId", "createdAt")
       VALUES (gen_random_uuid()::text, $1, $2, 'misconception', $3, ARRAY[]::text[], NULL, NOW())
       ON CONFLICT ("courseId", name) DO UPDATE
         SET description = EXCLUDED.description`,
      courseId,
      `MISCONCEPTION:${m.conceptSlug}:${m.misconceptionText.slice(0, 60)}`,
      m.remediationHint.slice(0, 500),
    )

    // Find the concept entity (if it exists from regular entity extraction)
    const conceptEntity = await prisma.graphEntity.findFirst({
      where: { courseId, name: { contains: m.conceptSlug, mode: 'insensitive' } },
      select: { id: true },
    })

    const misconceptionEntity = await prisma.graphEntity.findFirst({
      where: {
        courseId,
        name: { startsWith: `MISCONCEPTION:${m.conceptSlug}` },
      },
      select: { id: true },
    })

    if (conceptEntity && misconceptionEntity) {
      // Edge: misconception CORRECTS concept
      await prisma.$executeRawUnsafe(
        `INSERT INTO "GraphEdge" (id, "courseId", "fromId", "toId", relation, weight, "createdAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, 'corrects', 1.0, NOW())
         ON CONFLICT ("fromId", "toId", relation) DO NOTHING`,
        courseId,
        misconceptionEntity.id,
        conceptEntity.id,
      )
    }
  }
}

// ── GET handler ───────────────────────────────────────────────────────────────

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const user = await requireEducatorUser(req)
  const { id: courseId } = await params

  const count = await prisma.misconceptionTaxonomy.count({ where: { courseId } })
  const latest = await prisma.misconceptionTaxonomy.findFirst({
    where: { courseId },
    orderBy: { updatedAt: 'desc' },
    select: { updatedAt: true },
  })

  return NextResponse.json({
    courseId,
    count,
    lastSeededAt: latest?.updatedAt ?? null,
    ready: count > 0,
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

// ── POST handler ──────────────────────────────────────────────────────────────

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  await requireEducatorUser(req)
  const { id: courseId } = await params

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured' },
      { status: 503 },
    )
  }

  // Fetch all DocumentChunks for this course
  const chunks = await prisma.documentChunk.findMany({
    where: { courseId },
    select: { id: true, content: true },
    orderBy: { chunkIndex: 'asc' },
  })

  if (chunks.length === 0) {
    return NextResponse.json(
      { message: 'No document chunks found for this course. Upload course materials first.', seeded: 0 },
      { status: 200 },
    )
  }

  // Clear existing misconceptions so refresh is idempotent
  await prisma.misconceptionTaxonomy.deleteMany({ where: { courseId } })

  let totalSeeded = 0
  const allWithIds: (ExtractedMisconception & { id: string })[] = []

  // Process chunks in batches
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map((c) => extractMisconceptionsFromChunk(c.content)),
    )

    // Collect valid misconceptions from this batch
    const validMisconceptions: ExtractedMisconception[] = []
    for (const results of batchResults) {
      for (const m of results) {
        if (!m.conceptSlug || !m.misconceptionText || !m.remediationHint) continue
        validMisconceptions.push(m)
      }
    }

    if (validMisconceptions.length > 0) {
      // Batch create all misconceptions (deleteMany above ensures no conflicts)
      await prisma.misconceptionTaxonomy.createMany({
        data: validMisconceptions.map(m => ({
          courseId,
          conceptSlug: m.conceptSlug.slice(0, 100),
          misconceptionText: m.misconceptionText,
          triggerPatterns: m.triggerPatterns.slice(0, 3),
          remediationHint: m.remediationHint,
        })),
        skipDuplicates: true,
      })

      // Fetch created records to get IDs for GraphRAG seeding
      const created = await prisma.misconceptionTaxonomy.findMany({
        where: { courseId },
        select: { id: true, conceptSlug: true, misconceptionText: true, remediationHint: true },
        orderBy: { createdAt: 'desc' },
        take: validMisconceptions.length,
      })

      for (const c of created) {
        const orig = validMisconceptions.find(m => m.conceptSlug.slice(0, 100) === c.conceptSlug)
        if (orig) {
          allWithIds.push({ ...orig, id: c.id })
        }
      }
      totalSeeded += validMisconceptions.length
    }
  }

  // Seed GraphRAG nodes for all extracted misconceptions
  await seedMisconceptionGraphNodes(courseId, allWithIds).catch(console.error)

  return NextResponse.json({
    message: `Seeded ${totalSeeded} misconceptions from ${chunks.length} chunks.`,
    seeded: totalSeeded,
    chunksProcessed: chunks.length,
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
