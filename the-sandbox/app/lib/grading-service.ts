/**
 * AI grading service.
 *
 * Scores a student submission against its rubric using Claude Sonnet.
 * Called synchronously after submission creation — best-effort.
 * If scoring fails the GradebookEntry stays at AI_DRAFT with no score;
 * faculty can still manually grade it.
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'
import { generateRubricBreakdown } from './analytics/rubric-breakdown-service'
import { parseProcessAnnotationPayload } from './assessment/types'

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  retryableStatusCodes = [529, 500, 503],
): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status
      if (status !== undefined && !retryableStatusCodes.includes(status)) throw err
      lastErr = err
      if (attempt < maxAttempts - 1) {
        const delayMs = 500 * 2 ** attempt
        console.warn(`[grading-service] Retrying after status ${status ?? 'unknown'} (attempt ${attempt + 2}/${maxAttempts})`)
        await new Promise((res) => setTimeout(res, delayMs))
      }
    }
  }
  throw lastErr
}

interface CriterionScore {
  score: number
  rationale: string
}

interface ScoringResult {
  overallFeedback: string
  criteriaScores: Record<string, CriterionScore>
}

function formatStudentAnnotation(annotation: string): string {
  const parsed = parseProcessAnnotationPayload(annotation)

  if (parsed.annotations.length === 0 && !parsed.reflection) {
    return annotation
  }

  const sections: string[] = []

  if (parsed.annotations.length > 0) {
    sections.push(
      [
        'Inline Transcript Annotations:',
        ...parsed.annotations.map(
          (item) => `- Message ${item.messageIndex}: ${item.text}`
        ),
      ].join('\n')
    )
  }

  if (parsed.reflection) {
    sections.push(`Student Reflection:\n${parsed.reflection}`)
  }

  return sections.join('\n\n')
}

/** Build the text content to score — handles legacy text, file placeholder, or chat transcript. */
async function buildSubmissionText(submissionId: string): Promise<string> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      session: {
        include: {
          chatMessages: {
            select: { role: true, content: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
      gradebookEntry: {
        include: {
          evidence: {
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
  })
  if (!submission) throw new Error('Submission not found')

  const sections: string[] = []

  if (submission.gradebookEntry?.evidence.length) {
    const transcriptEvidenceIds = submission.gradebookEntry.evidence
      .filter((item) => item.evidenceType === 'SANDY_TRANSCRIPT')
      .map((item) => item.sourceId)

    const externalSessionIds = transcriptEvidenceIds.filter((sourceId) => sourceId !== submission.sessionId)
    const externalSessions = externalSessionIds.length
      ? await prisma.toolSession.findMany({
          where: { id: { in: externalSessionIds } },
          include: {
            chatMessages: {
              select: { role: true, content: true, createdAt: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        })
      : []

    const externalSessionMap = new Map(externalSessions.map((session) => [session.id, session]))

    for (const evidence of submission.gradebookEntry.evidence) {
      const evidenceSections: string[] = [`[EVIDENCE: ${evidence.sourceLabel}]`, `Type: ${evidence.evidenceType}`]

      if (evidence.evidenceType === 'SANDY_TRANSCRIPT') {
        const session =
          evidence.sourceId === submission.sessionId ? submission.session : externalSessionMap.get(evidence.sourceId)
        if (session) {
          const transcript = session.chatMessages
            .map((m) => `${m.role === 'user' ? 'Student' : 'AI'}: ${m.content}`)
            .join('\n\n')
          evidenceSections.push(transcript)
        } else {
          evidenceSections.push('(Transcript unavailable)')
        }
      }

      if (evidence.studentAnnotation) {
        evidenceSections.push(`Student Annotation:\n${formatStudentAnnotation(evidence.studentAnnotation)}`)
      }

      if (evidence.aiScoringRationale) {
        evidenceSections.push(`AI Process Notes: ${evidence.aiScoringRationale}`)
      }

      sections.push(evidenceSections.join('\n\n'))
    }
  }

  const hasTranscriptEvidence = submission.gradebookEntry?.evidence.some(
    (item) => item.evidenceType === 'SANDY_TRANSCRIPT'
  )

  if (submission.textContent) {
    sections.push(`[SUBMISSION TEXT]\n\n${submission.textContent}`)
  } else if (submission.fileUrl) {
    sections.push(`[FILE SUBMISSION]\n\n${submission.fileName ?? submission.fileUrl}`)
  } else if (submission.type === 'AI_EXPERIENCE' && submission.session && !hasTranscriptEvidence) {
    const transcript = submission.session.chatMessages
      .map((m) => `${m.role === 'user' ? 'Student' : 'AI'}: ${m.content}`)
      .join('\n\n')
    sections.push(`[AI EXPERIENCE TRANSCRIPT]\n\n${transcript}`)
  }

  if (sections.length > 0) {
    return sections.join('\n\n---\n\n')
  }
  return '[No submission content]'
}

/** Score a submission and write results to its GradebookEntry. */
export async function scoreSubmission(submissionId: string): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[grading-service] ANTHROPIC_API_KEY not set — skipping AI scoring')
    return
  }

  // Load submission + assignment + rubric
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      gradebookEntry: true,
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
      student: { select: { name: true } },
    },
  })

  if (!submission?.gradebookEntry) {
    console.warn(`[grading-service] No GradebookEntry for submission ${submissionId}`)
    return
  }
  if (!submission.assignment.rubric) {
    // No rubric — can't score; faculty will grade manually
    await prisma.gradebookEntry.update({
      where: { id: submission.gradebookEntry.id },
      data: { status: 'PENDING_REVIEW' },
    })
    return
  }

  const rubric = submission.assignment.rubric
  const submissionText = await buildSubmissionText(submissionId)

  // Build rubric description for the prompt
  const rubricBlock = rubric.criteria
    .map((c) => {
      const bands = c.bands
        .map((b) => `  - ${b.label} (${b.minPoints}–${b.maxPoints} pts): ${b.description}`)
        .join('\n')
      return `Criterion: "${c.title}" (max ${c.maxPoints} pts)\nID: ${c.id}\n${c.description ? `Description: ${c.description}\n` : ''}Bands:\n${bands}`
    })
    .join('\n\n')

  const prompt = `You are an expert educational evaluator. Score the following student submission against the provided rubric.

ASSIGNMENT: ${submission.assignment.title}
RUBRIC: ${rubric.title}

${rubricBlock}

STUDENT SUBMISSION:
${submissionText.slice(0, 15000)}

Respond with ONLY valid JSON in this exact format — no other text:
{
  "overallFeedback": "2-4 sentences of holistic feedback. Be specific, constructive, and encouraging.",
  "criteriaScores": {
    "<criterion_id>": {
      "score": <number within the criterion's valid range>,
      "rationale": "1-2 sentences explaining this score with specific evidence from the submission"
    }
  }
}`

  try {
    const client = new Anthropic()
    const response = await withRetry(() =>
      client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      })
    )

    const first = response.content[0]
    const text = first?.type === 'text' ? first.text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const result: ScoringResult = JSON.parse(jsonMatch[0])

    // Compute total score from criteria
    const totalScore = rubric.criteria.reduce((sum, c) => {
      const cs = result.criteriaScores[c.id]
      if (!cs) return sum
      // Clamp to valid range
      const clamped = Math.min(c.maxPoints, Math.max(0, cs.score))
      return sum + clamped
    }, 0)

    await prisma.gradebookEntry.update({
      where: { id: submission.gradebookEntry.id },
      data: {
        aiScore: Math.round(totalScore * 10) / 10,
        aiRawFeedback: result.overallFeedback,
        aiCriteriaScores: result.criteriaScores as unknown as import('../generated/prisma').Prisma.InputJsonValue,
        status: 'PENDING_REVIEW',
      },
    })

    console.info(
      `[grading-service] Scored submission ${submissionId}: ${totalScore}/${submission.assignment.pointsPossible}`
    )

    // Generate dimensional rubric breakdown (non-blocking)
    generateRubricBreakdown(submissionId).catch((err) =>
      console.error(`[grading-service] Rubric breakdown failed for ${submissionId}:`, err)
    )
  } catch (err) {
    console.error(`[grading-service] Scoring failed for submission ${submissionId}:`, err)
    // Still move to PENDING_REVIEW so faculty can see it
    await prisma.gradebookEntry.update({
      where: { id: submission.gradebookEntry.id },
      data: { status: 'PENDING_REVIEW' },
    }).catch(() => {})
  }
}
