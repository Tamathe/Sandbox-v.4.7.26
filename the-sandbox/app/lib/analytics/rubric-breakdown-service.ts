/**
 * Rubric Breakdown Service — Faculty Course Intelligence (Phase 3)
 *
 * Generates per-dimension rubric breakdowns for a submission by analyzing
 * the student's ToolSession transcript against the assignment's rubric.
 * Results stored in the RubricBreakdown model for scorecard aggregation.
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import type { RubricBreakdown, Prisma } from '../../generated/prisma'

// ── Types ────────────────────────────────────────────────────────────────────

export interface DimensionScore {
  score: number
  maxScore: number
  band: string // matched band label
  rationale: string
}

export type DimensionsJson = Record<string, DimensionScore>

export interface ScorecardAssignment {
  assignmentId: string
  title: string
  dueAt: string | null
  pointsPossible: number
  submissionCount: number
  gradedCount: number
  avgComposite: number | null
  dimensions: {
    name: string
    avgScore: number
    maxScore: number
    distribution: { band: string; count: number }[]
  }[]
}

// ── Rubric Breakdown Generator ───────────────────────────────────────────────

export async function generateRubricBreakdown(
  submissionId: string,
): Promise<RubricBreakdown | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[rubric-breakdown] ANTHROPIC_API_KEY not set — skipping')
    return null
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: {
        include: {
          rubric: {
            include: {
              criteria: {
                include: { bands: { orderBy: { minPoints: 'desc' } } },
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      },
      session: {
        include: {
          chatMessages: {
            select: { role: true, content: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
            take: 40,
          },
        },
      },
    },
  })

  if (!submission) {
    console.warn(`[rubric-breakdown] Submission ${submissionId} not found`)
    return null
  }

  if (!submission.assignment.rubric) {
    // No rubric — can't generate dimensional breakdown
    return null
  }

  if (!submission.sessionId) {
    // No linked session — can't analyze
    return null
  }

  const rubric = submission.assignment.rubric

  // Build transcript from session messages or text content
  let submissionText: string
  if (submission.session?.chatMessages.length) {
    submissionText = submission.session.chatMessages
      .map((m) => `${m.role === 'user' ? 'Student' : 'AI'}: ${m.content}`)
      .join('\n\n')
  } else if (submission.textContent) {
    submissionText = submission.textContent
  } else {
    submissionText = '[No submission content available]'
  }

  // Build rubric description
  const criteriaBlock = rubric.criteria
    .map((c) => {
      const bands = c.bands
        .map((b) => `    - "${b.label}" (${b.minPoints}–${b.maxPoints} pts): ${b.description}`)
        .join('\n')
      return `  Criterion: "${c.title}" (ID: ${c.id}, max ${c.maxPoints} pts)\n${c.description ? `  Description: ${c.description}\n` : ''}  Bands:\n${bands}`
    })
    .join('\n\n')

  const prompt = `You are an expert educational evaluator. Analyze this student submission and score each rubric dimension.

ASSIGNMENT: ${submission.assignment.title}
RUBRIC: ${rubric.title}

${criteriaBlock}

STUDENT SUBMISSION:
${submissionText.slice(0, 12000)}

Respond with valid JSON only (no markdown, no code fences). For each criterion, provide a score, the matching band label, and a rationale:
{
  "<criterion_id>": {
    "score": <number within criterion's valid range>,
    "maxScore": <criterion max points>,
    "band": "<matching band label>",
    "rationale": "1-2 sentences with specific evidence from the submission"
  }
}`

  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error(`[rubric-breakdown] No JSON in response for submission ${submissionId}`)
    return null
  }

  const dimensions: DimensionsJson = JSON.parse(jsonMatch[0])

  // Validate and clamp scores
  const totalMaxPoints = rubric.criteria.reduce((sum, c) => sum + c.maxPoints, 0)
  let totalScore = 0

  for (const criterion of rubric.criteria) {
    const dim = dimensions[criterion.id]
    if (dim) {
      dim.score = Math.min(criterion.maxPoints, Math.max(0, dim.score))
      dim.maxScore = criterion.maxPoints
      totalScore += dim.score
    }
  }

  const compositeScore = totalMaxPoints > 0 ? totalScore / totalMaxPoints : 0

  // Upsert — allows regeneration
  const breakdown = await prisma.rubricBreakdown.upsert({
    where: { submissionId },
    create: {
      submissionId,
      sessionId: submission.sessionId,
      dimensions: dimensions as unknown as Prisma.InputJsonValue,
      compositeScore: Math.round(compositeScore * 1000) / 1000,
    },
    update: {
      dimensions: dimensions as unknown as Prisma.InputJsonValue,
      compositeScore: Math.round(compositeScore * 1000) / 1000,
      generatedAt: new Date(),
      overriddenAt: null,
      overriddenBy: null,
    },
  })

  console.info(
    `[rubric-breakdown] Generated for submission ${submissionId}: composite ${Math.round(compositeScore * 100)}%`,
  )

  return breakdown
}

// ── Scorecard Aggregation ────────────────────────────────────────────────────

/** Build scorecard data for a course's assignments with rubric breakdowns. */
export async function getAssignmentScorecard(
  courseId: string,
): Promise<ScorecardAssignment[]> {
  const assignments = await prisma.assignment.findMany({
    where: { courseId, rubricId: { not: null } },
    include: {
      rubric: {
        include: {
          criteria: { orderBy: { order: 'asc' } },
        },
      },
      submissions: {
        include: {
          rubricBreakdown: true,
          gradebookEntry: { select: { status: true } },
        },
      },
    },
    orderBy: { dueAt: 'desc' },
  })

  return assignments.map((assignment) => {
    const withBreakdowns = assignment.submissions.filter((s) => s.rubricBreakdown)
    const gradedCount = assignment.submissions.filter(
      (s) =>
        s.gradebookEntry?.status === 'APPROVED' || s.gradebookEntry?.status === 'RELEASED',
    ).length

    // Aggregate composite scores
    const composites = withBreakdowns.map((s) => s.rubricBreakdown!.compositeScore)
    const avgComposite =
      composites.length > 0
        ? Math.round((composites.reduce((a, b) => a + b, 0) / composites.length) * 100)
        : null

    // Per-dimension aggregation
    const criteria = assignment.rubric?.criteria ?? []
    const dimensions = criteria.map((criterion) => {
      const scores: number[] = []
      const bandCounts = new Map<string, number>()

      for (const sub of withBreakdowns) {
        const dims = sub.rubricBreakdown!.dimensions as unknown as DimensionsJson
        const dim = dims[criterion.id]
        if (dim) {
          scores.push(dim.score)
          const band = dim.band || 'Unknown'
          bandCounts.set(band, (bandCounts.get(band) ?? 0) + 1)
        }
      }

      return {
        name: criterion.title,
        avgScore:
          scores.length > 0
            ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
            : 0,
        maxScore: criterion.maxPoints,
        distribution: [...bandCounts.entries()]
          .map(([band, count]) => ({ band, count }))
          .sort((a, b) => b.count - a.count),
      }
    })

    return {
      assignmentId: assignment.id,
      title: assignment.title,
      dueAt: assignment.dueAt?.toISOString() ?? null,
      pointsPossible: assignment.pointsPossible,
      submissionCount: assignment.submissions.length,
      gradedCount,
      avgComposite,
      dimensions,
    }
  })
}

/** Batch-generate rubric breakdowns for all submissions in a course that don't have one yet. */
export async function backfillRubricBreakdowns(
  courseId: string,
): Promise<{ generated: number; errors: string[] }> {
  const submissions = await prisma.submission.findMany({
    where: {
      assignment: { courseId, rubricId: { not: null } },
      sessionId: { not: null },
      rubricBreakdown: null,
    },
    select: { id: true },
  })

  let generated = 0
  const errors: string[] = []

  // Process in batches of 3 to respect rate limits
  for (let i = 0; i < submissions.length; i += 3) {
    const batch = submissions.slice(i, i + 3)
    const results = await Promise.allSettled(
      batch.map((s) => generateRubricBreakdown(s.id)),
    )

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        generated++
      } else if (result.status === 'rejected') {
        errors.push(String(result.reason))
      }
    }
  }

  return { generated, errors }
}
