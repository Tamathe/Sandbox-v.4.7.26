/**
 * Prerequisite Unpacker Service — Concept Chain Resolution
 *
 * Traces backward through prerequisite concepts to find the root gap
 * when a student is struggling. AI-infers concept prerequisites on
 * first request and caches them in ConceptPrerequisite.
 *
 * Exports:
 *   unpackPrerequisiteChain — resolve chain + identify root gap + narrative
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'
import { applyMasteryDecay, isMasteryStale } from './mastery-decay'

const anthropic = new Anthropic()
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

const MAX_CHAIN_DEPTH = 4
const STRUGGLING_THRESHOLD = 0.6
const GAP_THRESHOLD = 0.5

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PrerequisiteNode {
  concept: string
  effectiveMastery: number
  isStale: boolean
  isGap: boolean
  depth: number
  courseId?: string
  courseCode?: string
}

export interface PrerequisiteChain {
  targetConcept: string
  targetMastery: number
  chain: PrerequisiteNode[]
  rootGap: {
    concept: string
    effectiveMastery: number
    recommendedAction: string
    recommendedToolId?: string
  } | null
  explanation: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeSlug(concept: string): string {
  return concept.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

/**
 * Fetches or AI-infers prerequisite concepts for a given concept+course.
 * Results are cached in ConceptPrerequisite for future lookups.
 */
async function getOrInferPrerequisites(
  concept: string,
  courseId: string,
  courseCode: string,
  courseTitle: string,
): Promise<{ concept: string; prerequisite: string; strength: number }[]> {
  const slug = normalizeSlug(concept)

  // Check cache first
  const cached = await prisma.conceptPrerequisite.findMany({
    where: { concept: slug, courseId },
  })
  if (cached.length > 0) {
    return cached.map((c) => ({
      concept: c.concept,
      prerequisite: c.prerequisite,
      strength: c.strength,
    }))
  }

  // Also check universal (courseId = null) prerequisites
  const universal = await prisma.conceptPrerequisite.findMany({
    where: { concept: slug, courseId: null },
  })
  if (universal.length > 0) {
    return universal.map((c) => ({
      concept: c.concept,
      prerequisite: c.prerequisite,
      strength: c.strength,
    }))
  }

  // AI-infer prerequisites
  const response = await anthropic.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `For a student in "${courseCode}: ${courseTitle}", what are the prerequisite concepts needed to understand "${concept}"?

Return a JSON array of objects with:
- "prerequisite": the concept name (concise, 2-4 words)
- "strength": 0-1 how critical this prerequisite is (1.0 = essential, 0.5 = helpful)

Return at most 4 prerequisites ordered by importance. Only include direct prerequisites, not transitive ones.

Respond with ONLY the JSON array, no other text.`,
      },
    ],
  })

  const text =
    response.content[0].type === 'text' ? response.content[0].text : ''

  let parsed: { prerequisite: string; strength: number }[] = []
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0])
    }
  } catch {
    // AI response wasn't valid JSON — return empty chain
    return []
  }

  // Validate and normalize
  const valid = parsed
    .filter(
      (p) =>
        typeof p.prerequisite === 'string' &&
        typeof p.strength === 'number' &&
        p.prerequisite.length > 0,
    )
    .slice(0, 4)

  if (valid.length === 0) return []

  // Cache in database
  await prisma.conceptPrerequisite.createMany({
    data: valid.map((p) => ({
      concept: slug,
      prerequisite: normalizeSlug(p.prerequisite),
      courseId,
      strength: Math.min(1, Math.max(0, p.strength)),
      source: 'ai_inferred',
    })),
    skipDuplicates: true,
  })

  return valid.map((p) => ({
    concept: slug,
    prerequisite: normalizeSlug(p.prerequisite),
    strength: p.strength,
  }))
}

/**
 * Recursively walks the prerequisite chain, enriching each node with mastery.
 */
async function walkChain(
  concept: string,
  courseId: string,
  courseCode: string,
  courseTitle: string,
  userId: string,
  depth: number,
  visited: Set<string>,
): Promise<PrerequisiteNode[]> {
  if (depth > MAX_CHAIN_DEPTH || visited.has(concept)) return []
  visited.add(concept)

  const prereqs = await getOrInferPrerequisites(
    concept,
    courseId,
    courseCode,
    courseTitle,
  )

  const nodes: PrerequisiteNode[] = []

  for (const prereq of prereqs) {
    // Look up mastery for this prerequisite concept
    const mastery = await prisma.studentConceptMastery.findUnique({
      where: { userId_concept: { userId, concept: prereq.prerequisite } },
      include: { firstCourse: true },
    })

    const effectiveMastery = mastery ? applyMasteryDecay(mastery) : 0
    const stale = mastery ? isMasteryStale(mastery) : false

    const node: PrerequisiteNode = {
      concept: prereq.prerequisite,
      effectiveMastery,
      isStale: stale,
      isGap: effectiveMastery < GAP_THRESHOLD,
      depth,
      courseId: mastery?.firstCourseId ?? undefined,
      courseCode: mastery?.firstCourse?.courseCode ?? undefined,
    }

    nodes.push(node)

    // Recurse deeper only if this is a gap (no point tracing strong concepts)
    if (node.isGap && depth < MAX_CHAIN_DEPTH) {
      const deeper = await walkChain(
        prereq.prerequisite,
        courseId,
        courseCode,
        courseTitle,
        userId,
        depth + 1,
        visited,
      )
      nodes.push(...deeper)
    }
  }

  return nodes
}

/**
 * Finds a recommended tool for reviewing a concept in this course.
 */
async function findRecommendedTool(
  concept: string,
  courseId: string,
): Promise<{ toolId: string; toolTitle: string } | null> {
  // Look for tools linked to this course
  const links = await prisma.courseToolLink.findMany({
    where: { courseId },
    include: { tool: true },
  })

  if (links.length === 0) return null

  // Simple heuristic: pick the first tool whose name or description mentions the concept
  const conceptWords = concept.replace(/-/g, ' ').toLowerCase()
  const match = links.find(
    (l) =>
      l.tool.name.toLowerCase().includes(conceptWords) ||
      (l.tool.shortDescription?.toLowerCase().includes(conceptWords) ?? false),
  )

  if (match) return { toolId: match.tool.id, toolTitle: match.tool.name }

  // Fallback: return first available tool
  return { toolId: links[0].tool.id, toolTitle: links[0].tool.name }
}

// ── Main Export ────────────────────────────────────────────────────────────────

/**
 * Unpacks the prerequisite chain for a struggling concept.
 * Returns the full chain with mastery values, root gap identification,
 * and an AI-generated narrative explanation.
 */
export async function unpackPrerequisiteChain(
  userId: string,
  concept: string,
  courseId: string,
): Promise<PrerequisiteChain> {
  // 1. Fetch the course for context
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { courseCode: true, title: true },
  })
  if (!course) {
    throw new Error('Course not found')
  }

  // 2. Fetch target concept mastery
  const slug = normalizeSlug(concept)
  const targetMastery = await prisma.studentConceptMastery.findUnique({
    where: { userId_concept: { userId, concept: slug } },
  })
  const targetEffective = targetMastery ? applyMasteryDecay(targetMastery) : 0

  // 3. Walk the prerequisite chain
  const visited = new Set<string>()
  const chain = await walkChain(
    slug,
    courseId,
    course.courseCode,
    course.title,
    userId,
    1,
    visited,
  )

  // 4. Identify root gap (deepest + weakest prerequisite)
  const gaps = chain.filter((n) => n.isGap)
  let rootGap: PrerequisiteChain['rootGap'] = null

  if (gaps.length > 0) {
    // Sort by depth desc, then by mastery asc → deepest weakest first
    gaps.sort((a, b) => b.depth - a.depth || a.effectiveMastery - b.effectiveMastery)
    const weakest = gaps[0]

    const tool = await findRecommendedTool(weakest.concept, courseId)
    const actionParts = [`Review "${weakest.concept.replace(/-/g, ' ')}"`]
    if (tool) actionParts.push(`using ${tool.toolTitle}`)

    rootGap = {
      concept: weakest.concept,
      effectiveMastery: weakest.effectiveMastery,
      recommendedAction: actionParts.join(' '),
      recommendedToolId: tool?.toolId,
    }
  }

  // 5. Generate AI narrative explanation
  let explanation = ''
  if (chain.length > 0) {
    const chainSummary = chain
      .map(
        (n) =>
          `"${n.concept.replace(/-/g, ' ')}" (mastery: ${(n.effectiveMastery * 100).toFixed(0)}%, depth: ${n.depth})`,
      )
      .join(', ')

    const narResponse = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `A student in "${course.courseCode}: ${course.title}" is struggling with "${concept.replace(/-/g, ' ')}" (effective mastery: ${(targetEffective * 100).toFixed(0)}%).

Their prerequisite concept chain: ${chainSummary}.
${rootGap ? `The root gap is "${rootGap.concept.replace(/-/g, ' ')}" at ${(rootGap.effectiveMastery * 100).toFixed(0)}% mastery.` : 'No clear gap was identified.'}

Write a 2-sentence empathetic explanation of WHY they're struggling and WHERE to start. Address the student directly. Be encouraging.`,
        },
      ],
    })

    explanation =
      narResponse.content[0].type === 'text'
        ? narResponse.content[0].text
        : ''
  } else {
    explanation = `We couldn't trace prerequisite concepts for "${concept.replace(/-/g, ' ')}" yet. Keep practicing and your mastery data will help us find connections.`
  }

  return {
    targetConcept: slug,
    targetMastery: targetEffective,
    chain,
    rootGap,
    explanation,
  }
}
