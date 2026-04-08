/**
 * Assignment Builder — AI-powered assignment creation service.
 *
 * Responsibilities:
 *  - Generate a Rubric (with RubricCriterion + RubricBand rows) from a tool's
 *    learning objectives using Haiku.
 *  - Persist the generated rubric to the database.
 *  - Provide a thin wrapper to create/update Assignment records.
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'

const anthropic = new Anthropic()

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GenerateRubricParams {
  courseId: string
  /** Title of the assignment the rubric will grade */
  assignmentTitle: string
  /** Optional description / instructions for the assignment */
  assignmentDescription?: string
  /** Total points possible — distributed across criteria */
  pointsPossible: number
  /** Tool whose learning objectives drive the criteria */
  toolId?: string
  /** Override objectives list (used when toolId is absent) */
  objectives?: string[]
}

export interface RubricBandDraft {
  label: string   // e.g. "Excellent" | "Proficient" | "Developing" | "Beginning"
  minPoints: number
  maxPoints: number
  description: string
}

export interface RubricCriterionDraft {
  title: string
  description: string
  maxPoints: number
  order: number
  bands: RubricBandDraft[]
}

export interface GeneratedRubric {
  id: string
  title: string
  courseId: string
  criteria: Array<{
    id: string
    title: string
    description: string | null
    maxPoints: number
    order: number
    bands: Array<{ id: string; label: string; minPoints: number; maxPoints: number; description: string }>
  }>
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildRubricPrompt(
  assignmentTitle: string,
  assignmentDescription: string | undefined,
  pointsPossible: number,
  objectives: string[],
): string {
  const objList = objectives.length
    ? objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')
    : 'No specific objectives provided — infer appropriate criteria from the assignment title.'

  return `You are an expert instructional designer. Generate a grading rubric for the assignment described below.

## Assignment
Title: ${assignmentTitle}
${assignmentDescription ? `Description: ${assignmentDescription}\n` : ''}Total points: ${pointsPossible}

## Learning Objectives
${objList}

## Instructions
- Create 3–5 rubric criteria that collectively cover all learning objectives.
- Each criterion must have a maxPoints value; all maxPoints must sum to exactly ${pointsPossible}.
- For each criterion, generate 4 performance bands in descending order: "Excellent", "Proficient", "Developing", "Beginning".
- Bands for each criterion must span 0 to that criterion's maxPoints (no gaps, no overlaps).
- Write band descriptions in second person ("You clearly demonstrate…").
- Be specific, actionable, and measurable.

## Output format (JSON only — no markdown, no prose)
{
  "criteria": [
    {
      "title": "<criterion title>",
      "description": "<what this criterion assesses>",
      "maxPoints": <number>,
      "order": <1-based index>,
      "bands": [
        { "label": "Excellent",   "minPoints": <n>, "maxPoints": <maxPoints>, "description": "..." },
        { "label": "Proficient",  "minPoints": <n>, "maxPoints": <m>,          "description": "..." },
        { "label": "Developing",  "minPoints": <n>, "maxPoints": <m>,          "description": "..." },
        { "label": "Beginning",   "minPoints": 0,   "maxPoints": <n>,          "description": "..." }
      ]
    }
  ]
}`
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseCriteria(raw: string): RubricCriterionDraft[] {
  // Strip any markdown code fences Haiku may include
  const json = raw.replace(/```(?:json)?/gi, '').trim()
  const parsed = JSON.parse(json) as { criteria: RubricCriterionDraft[] }
  if (!Array.isArray(parsed.criteria) || parsed.criteria.length === 0) {
    throw new Error('Haiku response missing criteria array')
  }
  return parsed.criteria
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Calls Haiku to generate a rubric and persists it to the DB.
 * Returns the full rubric with nested criteria and bands.
 */
export async function generateAndSaveRubric(
  params: GenerateRubricParams,
): Promise<GeneratedRubric> {
  const { courseId, assignmentTitle, assignmentDescription, pointsPossible, toolId, objectives: overrideObjectives } = params

  // 1. Resolve learning objectives
  let objectives: string[] = overrideObjectives ?? []
  if (!objectives.length && toolId) {
    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
      select: { learningObjectives: true },
    })
    objectives = tool?.learningObjectives ?? []
  }

  // 2. Call Haiku
  const prompt = buildRubricPrompt(assignmentTitle, assignmentDescription, pointsPossible, objectives)
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const rawText = message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  const criteria = parseCriteria(rawText)

  // 3. Persist rubric + nested criteria + bands in a transaction
  const rubric = await prisma.$transaction(async tx => {
    const created = await tx.rubric.create({
      data: {
        courseId,
        title: `Rubric: ${assignmentTitle}`,
        description: `AI-generated rubric for "${assignmentTitle}" (${pointsPossible} pts)`,
        criteria: {
          create: criteria.map(c => ({
            title: c.title,
            description: c.description,
            maxPoints: c.maxPoints,
            order: c.order,
            bands: {
              create: c.bands.map(b => ({
                label: b.label,
                minPoints: b.minPoints,
                maxPoints: b.maxPoints,
                description: b.description,
              })),
            },
          })),
        },
      },
      include: {
        criteria: {
          include: { bands: true },
          orderBy: { order: 'asc' },
        },
      },
    })
    return created
  })

  return rubric
}

/**
 * List rubrics for a course, ordered newest-first.
 */
export async function listRubrics(courseId: string) {
  return prisma.rubric.findMany({
    where: { courseId },
    include: {
      criteria: {
        include: { bands: true },
        orderBy: { order: 'asc' },
      },
      _count: { select: { assignments: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Fetch a single rubric by ID, verifying it belongs to the given course.
 */
export async function getRubric(rubricId: string, courseId: string) {
  return prisma.rubric.findFirst({
    where: { id: rubricId, courseId },
    include: {
      criteria: {
        include: { bands: true },
        orderBy: { order: 'asc' },
      },
    },
  })
}

/**
 * Delete a rubric — only if it has no live assignment references.
 * Returns `{ deleted: true }` or `{ deleted: false, reason: string }`.
 */
export async function deleteRubric(
  rubricId: string,
  courseId: string,
): Promise<{ deleted: boolean; reason?: string }> {
  const rubric = await prisma.rubric.findFirst({
    where: { id: rubricId, courseId },
    include: { _count: { select: { assignments: true } } },
  })
  if (!rubric) return { deleted: false, reason: 'not_found' }
  if (rubric._count.assignments > 0) {
    return { deleted: false, reason: 'in_use' }
  }
  await prisma.rubric.delete({ where: { id: rubricId } })
  return { deleted: true }
}
