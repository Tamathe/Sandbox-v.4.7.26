/**
 * GraphRAG — Entity-Graph Layer on Top of pgvector
 *
 * Augments flat-chunk RAG with a lightweight knowledge graph so that
 * multi-hop questions (prerequisites, relationships, contrasts) can be
 * answered by traversing entity relationships, not just cosine similarity.
 *
 * Three exported functions:
 *   extractEntitiesFromChunks  — called during material ingestion
 *   buildGraphCommunities      — called once after all chunks for a material are ingested
 *   graphRagSearch             — called at query time; returns a context string
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const HAIKU = 'claude-haiku-4-5-20251001'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExtractedEntity {
  name: string
  type: 'concept' | 'person' | 'event' | 'theorem' | 'process'
  description: string
}

interface ExtractedRelationship {
  from: string
  to: string
  relation: 'depends_on' | 'is_type_of' | 'contradicts' | 'precedes' | 'exemplifies'
}

interface ExtractionResult {
  entities: ExtractedEntity[]
  relationships: ExtractedRelationship[]
}

interface CommunityGroup {
  title: string
  summary: string
  entityNames: string[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function extractFromChunk(
  chunkContent: string,
): Promise<ExtractionResult> {
  const prompt = `Extract entities and relationships from this educational text.
Return JSON only: { "entities": [{ "name": string, "type": "concept"|"person"|"event"|"theorem"|"process", "description": string }], "relationships": [{ "from": string, "to": string, "relation": "depends_on"|"is_type_of"|"contradicts"|"precedes"|"exemplifies" }] }
Only include entities clearly present in the text. Max 8 entities, max 10 relationships.

Text:
${chunkContent.slice(0, 3000)}`

  try {
    const msg = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    // Strip any markdown code fences
    const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(clean) as ExtractionResult
    return {
      entities: Array.isArray(parsed.entities) ? parsed.entities.slice(0, 8) : [],
      relationships: Array.isArray(parsed.relationships)
        ? parsed.relationships.slice(0, 10)
        : [],
    }
  } catch {
    return { entities: [], relationships: [] }
  }
}

// ── extractEntitiesFromChunks ─────────────────────────────────────────────────

/**
 * Called during material ingestion (after chunks are embedded and stored).
 * Processes chunks in batches of 5, extracts entities and edges via Haiku,
 * and upserts them into GraphEntity / GraphEdge using raw SQL conflict handling.
 */
export async function extractEntitiesFromChunks(
  courseId: string,
  chunks: { id: string; content: string }[],
): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) return
  if (chunks.length === 0) return

  const BATCH = 5
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH)
    const results = await Promise.all(batch.map((c) => extractFromChunk(c.content)))

    for (let j = 0; j < batch.length; j++) {
      const chunk = batch[j]
      const { entities, relationships } = results[j]

      // Upsert entities — ON CONFLICT (courseId, name) update description + append chunkId
      for (const entity of entities) {
        if (!entity.name || !entity.type) continue
        await prisma.$executeRawUnsafe(
          `INSERT INTO "GraphEntity" (id, "courseId", name, type, description, "sourceChunkIds", "communityId", "createdAt")
           VALUES (gen_random_uuid()::text, $1, $2, $3, $4, ARRAY[$5::text], NULL, NOW())
           ON CONFLICT ("courseId", name) DO UPDATE
             SET description = EXCLUDED.description,
                 "sourceChunkIds" = array_append("GraphEntity"."sourceChunkIds", $5::text)`,
          courseId,
          entity.name.slice(0, 200),
          entity.type,
          (entity.description ?? '').slice(0, 500),
          chunk.id,
        )
      }

      // Upsert edges — resolve entity ids then insert with conflict handling
      for (const rel of relationships) {
        if (!rel.from || !rel.to || !rel.relation) continue
        const fromEntity = await prisma.graphEntity.findUnique({
          where: { courseId_name: { courseId, name: rel.from } },
          select: { id: true },
        })
        const toEntity = await prisma.graphEntity.findUnique({
          where: { courseId_name: { courseId, name: rel.to } },
          select: { id: true },
        })
        if (!fromEntity || !toEntity) continue

        await prisma.$executeRawUnsafe(
          `INSERT INTO "GraphEdge" (id, "courseId", "fromId", "toId", relation, weight, "createdAt")
           VALUES (gen_random_uuid()::text, $1, $2, $3, $4, 1.0, NOW())
           ON CONFLICT ("fromId", "toId", relation) DO UPDATE
             SET weight = "GraphEdge".weight + 0.1`,
          courseId,
          fromEntity.id,
          toEntity.id,
          rel.relation,
        )
      }
    }
  }

  console.info(
    `[graph-rag] Extracted entities from ${chunks.length} chunks for course ${courseId}`,
  )
}

// ── buildGraphCommunities ─────────────────────────────────────────────────────

/**
 * Groups entities into 3–7 thematic communities via a single Haiku call.
 * Replaces any existing communities for the course and updates each entity's
 * communityId.
 */
export async function buildGraphCommunities(courseId: string): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) return

  const entities = await prisma.graphEntity.findMany({
    where: { courseId },
    select: { id: true, name: true, type: true, description: true },
  })

  if (entities.length < 5) return

  const entityList = entities
    .map((e) => `- ${e.name} (${e.type}): ${e.description ?? ''}`)
    .join('\n')

  const prompt = `You are organizing educational content into thematic clusters.
Given these concepts from a course, group them into 3–7 coherent thematic communities.
Return JSON only: { "communities": [{ "title": string, "summary": string, "entityNames": string[] }] }

Concepts:
${entityList.slice(0, 6000)}`

  try {
    const msg = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(clean) as { communities: CommunityGroup[] }
    const communities = Array.isArray(parsed.communities) ? parsed.communities : []

    // Replace existing communities
    await prisma.graphCommunity.deleteMany({ where: { courseId } })

    for (const comm of communities) {
      if (!comm.title || !Array.isArray(comm.entityNames)) continue

      // Map entity names to ids
      const matchedIds = entities
        .filter((e) => comm.entityNames.includes(e.name))
        .map((e) => e.id)

      const created = await prisma.graphCommunity.create({
        data: {
          courseId,
          level: 0,
          title: comm.title,
          summary: comm.summary ?? '',
          entityIds: matchedIds,
        },
      })

      // Update each entity's communityId
      if (matchedIds.length > 0) {
        await prisma.graphEntity.updateMany({
          where: { id: { in: matchedIds } },
          data: { communityId: created.id },
        })
      }
    }

    console.info(
      `[graph-rag] Built ${communities.length} communities for course ${courseId}`,
    )
  } catch (err) {
    console.error('[graph-rag] buildGraphCommunities failed:', err)
  }
}

// ── graphRagSearch ────────────────────────────────────────────────────────────

const COMPLEX_QUERY_SIGNALS = [
  'why',
  'how does',
  'how do',
  "what's the difference",
  'what is the difference',
  'prerequisite',
  'before',
  'depends',
  'relationship between',
  'relate',
  'contrast',
  'compare',
  'explain',
  'connection between',
  'leads to',
  'causes',
]

// ── surfaceMisconceptionContext ────────────────────────────────────────────────

/**
 * Looks up active fired misconceptions for this student+course in ConceptState,
 * then returns a Sandy-injectable remediation hint block.
 * Called from buildChatSystemPrompt — lightweight (1 DB query, no LLM call).
 */
export async function surfaceMisconceptionContext(
  courseId: string,
  userId: string,
  lastUserMessage: string,
): Promise<string> {
  if (!courseId || !userId) return ''

  // Find concepts where this student has fired misconceptions
  const conceptStates = await prisma.conceptState.findMany({
    where: { userId, courseId, firedMisconceptions: { isEmpty: false } },
    select: { conceptSlug: true, firedMisconceptions: true },
    take: 5,
  })

  if (conceptStates.length === 0) return ''

  // Gather unique fired misconception IDs (latest per concept)
  const allFiredIds = [...new Set(conceptStates.flatMap((cs) => cs.firedMisconceptions))].slice(0, 5)

  const misconceptions = await prisma.misconceptionTaxonomy.findMany({
    where: { id: { in: allFiredIds } },
    select: { conceptSlug: true, misconceptionText: true, remediationHint: true, triggerPatterns: true },
  })

  if (misconceptions.length === 0) return ''

  // Filter to only those whose trigger patterns match the current message (active now)
  const activeNow = misconceptions.filter((m) =>
    m.triggerPatterns.some((p) => {
      try { return new RegExp(p, 'i').test(lastUserMessage) }
      catch { return lastUserMessage.toLowerCase().includes(p.toLowerCase()) }
    }),
  )

  // If none match right now, still surface passive reminders for all recently fired
  const toSurface = activeNow.length > 0 ? activeNow : misconceptions.slice(0, 2)

  const lines: string[] = [
    '\n\n## KNOWN MISCONCEPTIONS FOR THIS STUDENT',
    'This student has previously demonstrated these misconceptions. Address them gently if they surface — do NOT lecture unprompted:',
  ]

  for (const m of toSurface) {
    lines.push(`- **Concept: ${m.conceptSlug}** — Misconception: "${m.misconceptionText}"`)
    lines.push(`  Remediation hint: ${m.remediationHint}`)
  }

  return lines.join('\n')
}

/**
 * Returns a knowledge-graph context string to inject into the system prompt.
 * Returns '' immediately for simple factual queries (vector RAG handles those alone).
 */
export async function graphRagSearch(
  courseId: string,
  query: string,
  topK: number,
): Promise<string> {
  void topK // reserved for future use (limit entity count returned)
  if (!process.env.ANTHROPIC_API_KEY) return ''

  const lowerQuery = query.toLowerCase()
  const isComplex = COMPLEX_QUERY_SIGNALS.some((signal) => lowerQuery.includes(signal))
  if (!isComplex) return ''

  // Fetch all communities for this course
  const communities = await prisma.graphCommunity.findMany({
    where: { courseId },
    select: { id: true, title: true, summary: true, entityIds: true },
  })
  if (communities.length === 0) return ''

  // Ask Haiku to pick 1–2 relevant communities
  const communityList = communities
    .map((c, i) => `${i + 1}. "${c.title}" — ${c.summary.slice(0, 150)}`)
    .join('\n')

  let relevantCommunityIds: string[] = []
  try {
    const msg = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `Given this student question: "${query.slice(0, 400)}"

Which 1–2 of these course topic clusters are most relevant?
${communityList}

Return JSON only: { "selected": [<1-based numbers>] }`,
        },
      ],
    })
    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(clean) as { selected: number[] }
    if (Array.isArray(parsed.selected)) {
      relevantCommunityIds = parsed.selected
        .filter((n) => n >= 1 && n <= communities.length)
        .slice(0, 2)
        .map((n) => communities[n - 1].id)
    }
  } catch {
    // Fall back: pick first community
    if (communities.length > 0) relevantCommunityIds = [communities[0].id]
  }

  if (relevantCommunityIds.length === 0) return ''

  // Gather entity ids from selected communities
  const selectedCommunities = communities.filter((c) => relevantCommunityIds.includes(c.id))
  const entityIdSet = new Set<string>()
  for (const comm of selectedCommunities) {
    for (const eid of comm.entityIds) entityIdSet.add(eid)
  }
  if (entityIdSet.size === 0) return ''

  // Fetch entities with their edges
  const entities = await prisma.graphEntity.findMany({
    where: { id: { in: Array.from(entityIdSet) } },
    include: {
      outEdges: {
        include: { to: { select: { name: true } } },
        take: 5,
      },
      inEdges: {
        include: { from: { select: { name: true } } },
        take: 3,
      },
    },
  })

  if (entities.length === 0) return ''

  // Build context string
  const lines: string[] = ['## KNOWLEDGE GRAPH CONTEXT', 'Relevant concepts from the course knowledge graph:']

  for (const entity of entities) {
    lines.push(`\n**${entity.name}** (${entity.type}): ${entity.description ?? ''}`)
    for (const edge of entity.outEdges) {
      lines.push(`  → ${edge.relation}: ${edge.to.name}`)
    }
    for (const edge of entity.inEdges) {
      lines.push(`  ← ${edge.relation} by: ${edge.from.name}`)
    }
  }

  // Append community summaries
  for (const comm of selectedCommunities) {
    lines.push(`\nThematic context (${comm.title}): ${comm.summary}`)
  }

  return lines.join('\n')
}
