import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import { createEvidence, listEvidenceForGradebookEntry } from './evidence-service'
import {
  clampUnit,
  parseProcessAnnotationPayload,
  type AssessmentEvidenceRecord,
  type AssessmentEvidenceSummary,
  type ProcessScores,
  type ProcessTranscriptSnapshot,
} from './types'

const anthropic = new Anthropic()
const PROCESS_SCORING_MODEL = 'claude-haiku-4-5-20251001'

export interface ProcessAssessmentContext {
  sessionId: string
  sessionOwnerId: string | null
  transcript: ProcessTranscriptSnapshot
  evidence: AssessmentEvidenceRecord | null
  gradebookEntry: {
    id: string
    status: string
    processScore: number | null
    compositeMethod: string | null
  } | null
  submission: {
    id: string
    studentId: string
    assignmentId: string
    assignmentTitle: string
    assessmentMode: string
    assignmentType: string
    courseId: string
    instructorId: string
  } | null
}

type EvidenceRecordShape = {
  id: string
  gradebookEntryId: string
  evidenceType: string
  sourceId: string
  sourceLabel: string
  studentAnnotation: string | null
  annotatedAt: Date | null
  aiProcessScore: number | null
  aiCoherenceScore: number | null
  aiDepthScore: number | null
  aiScoringRationale: string | null
  facultyScore: number | null
  facultyNotes: string | null
  reviewedAt: Date | null
  weight: number
  createdAt: Date
}

function serializeEvidence(evidence: EvidenceRecordShape): AssessmentEvidenceRecord {
  return {
    id: evidence.id,
    gradebookEntryId: evidence.gradebookEntryId,
    evidenceType: evidence.evidenceType as AssessmentEvidenceRecord['evidenceType'],
    sourceId: evidence.sourceId,
    sourceLabel: evidence.sourceLabel,
    studentAnnotation: evidence.studentAnnotation,
    annotatedAt: evidence.annotatedAt?.toISOString() ?? null,
    aiProcessScore: evidence.aiProcessScore,
    aiCoherenceScore: evidence.aiCoherenceScore,
    aiDepthScore: evidence.aiDepthScore,
    aiScoringRationale: evidence.aiScoringRationale,
    facultyScore: evidence.facultyScore,
    facultyNotes: evidence.facultyNotes,
    reviewedAt: evidence.reviewedAt?.toISOString() ?? null,
    weight: evidence.weight,
    createdAt: evidence.createdAt.toISOString(),
  }
}

function roundUnit(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000
}

function extractTextContent(blocks: Anthropic.Messages.ContentBlock[]): string {
  return blocks
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim()
}

function extractJsonObject(rawText: string): string | null {
  const match = rawText.match(/\{[\s\S]*\}/)
  return match?.[0] ?? null
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  retryableStatusCodes = [429, 500, 503, 529]
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      const status = (error as { status?: number })?.status
      if (status !== undefined && !retryableStatusCodes.includes(status)) {
        throw error
      }

      lastError = error
      if (attempt < maxAttempts - 1) {
        const delayMs = 500 * 2 ** attempt
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }

  throw lastError
}

function buildFallbackScores(
  transcript: ProcessTranscriptSnapshot,
  reason: string
): ProcessScores {
  const studentMessages = transcript.messages.filter((message) => message.role === 'user')
  const annotations = transcript.annotations
  const reflection = transcript.reflection?.trim() ?? ''
  const studentWordCount = studentMessages.reduce(
    (sum, message) => sum + message.content.split(/\s+/).filter(Boolean).length,
    0
  )
  const reflectionWordCount = reflection.split(/\s+/).filter(Boolean).length

  const revisionSignals = studentMessages.filter((message) =>
    /\b(actually|instead|rethink|revised?|changed my mind|you're right|i see|i realized|let me try|another approach)\b/i.test(
      message.content
    )
  ).length

  const coherenceSignals = studentMessages.filter((message) =>
    /\b(because|therefore|however|since|so|if|then|which means|for example)\b/i.test(message.content)
  ).length

  const metacognitionSignals =
    annotations.filter((annotation) =>
      /\b(stuck|realized|learned|changed|confused|misunderstood|noticed|next time)\b/i.test(annotation.text)
    ).length +
    (/\b(stuck|realized|learned|changed|confused|misunderstood|noticed|next time)\b/i.test(reflection) ? 1 : 0)

  const annotationCoverage = studentMessages.length > 0
    ? Math.min(1, annotations.length / Math.max(1, Math.ceil(studentMessages.length / 2)))
    : 0

  const processScore = roundUnit(
    0.18 +
      Math.min(1, studentMessages.length / 6) * 0.28 +
      Math.min(1, revisionSignals / 3) * 0.36 +
      annotationCoverage * 0.18
  )

  const coherenceScore = roundUnit(
    0.22 +
      Math.min(1, coherenceSignals / 4) * 0.38 +
      Math.min(1, studentWordCount / 220) * 0.2 +
      (studentMessages.length >= 3 ? 0.12 : 0) +
      (annotations.length > 0 ? 0.08 : 0)
  )

  const depthScore = roundUnit(
    0.1 +
      annotationCoverage * 0.38 +
      Math.min(1, reflectionWordCount / 90) * 0.32 +
      Math.min(1, metacognitionSignals / 3) * 0.2
  )

  return {
    processScore,
    coherenceScore,
    depthScore,
    rationale: `Fallback heuristic used because ${reason}. Estimated from ${studentMessages.length} student turns, ${annotations.length} inline annotations, and ${reflectionWordCount} reflection words.`,
    usedFallback: true,
  }
}

export async function getProcessAssessmentContext(
  sessionId: string
): Promise<ProcessAssessmentContext> {
  const session = await prisma.toolSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      userId: true,
      startedAt: true,
      endedAt: true,
      durationSeconds: true,
      messageCount: true,
      tool: { select: { name: true } },
      chatMessages: {
        select: { role: true, content: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      },
      submission: {
        select: {
          id: true,
          studentId: true,
          assignment: {
            select: {
              id: true,
              title: true,
              assessmentMode: true,
              type: true,
              courseId: true,
              course: { select: { instructorId: true } },
            },
          },
          gradebookEntry: {
            select: {
              id: true,
              status: true,
              processScore: true,
              compositeMethod: true,
            },
          },
        },
      },
    },
  })

  if (!session) {
    throw new Error('Session not found')
  }

  const evidenceRecord = await prisma.assessmentEvidence.findFirst({
    where: {
      sourceId: sessionId,
      evidenceType: 'SANDY_TRANSCRIPT',
    },
    select: {
      id: true,
      gradebookEntryId: true,
      evidenceType: true,
      sourceId: true,
      sourceLabel: true,
      studentAnnotation: true,
      annotatedAt: true,
      aiProcessScore: true,
      aiCoherenceScore: true,
      aiDepthScore: true,
      aiScoringRationale: true,
      facultyScore: true,
      facultyNotes: true,
      reviewedAt: true,
      weight: true,
      createdAt: true,
    },
  })

  const serializedEvidence = evidenceRecord ? serializeEvidence(evidenceRecord) : null
  const parsedAnnotation = parseProcessAnnotationPayload(serializedEvidence?.studentAnnotation)

  return {
    sessionId: session.id,
    sessionOwnerId: session.userId ?? null,
    transcript: {
      sessionId: session.id,
      messages: session.chatMessages.map((message) => ({
        role: message.role,
        content: message.content,
        timestamp: message.createdAt.toISOString(),
      })),
      annotations: parsedAnnotation.annotations,
      reflection: parsedAnnotation.reflection ?? null,
      sessionMeta: {
        mode: session.tool?.name ?? 'Unknown',
        duration: session.durationSeconds ?? 0,
        messageCount: session.messageCount,
        startedAt: session.startedAt.toISOString(),
        endedAt: session.endedAt?.toISOString() ?? null,
      },
    },
    evidence: serializedEvidence,
    gradebookEntry: session.submission?.gradebookEntry
      ? {
          id: session.submission.gradebookEntry.id,
          status: session.submission.gradebookEntry.status,
          processScore: session.submission.gradebookEntry.processScore,
          compositeMethod: session.submission.gradebookEntry.compositeMethod,
        }
      : null,
    submission: session.submission
      ? {
          id: session.submission.id,
          studentId: session.submission.studentId,
          assignmentId: session.submission.assignment.id,
          assignmentTitle: session.submission.assignment.title,
          assessmentMode: session.submission.assignment.assessmentMode,
          assignmentType: session.submission.assignment.type,
          courseId: session.submission.assignment.courseId,
          instructorId: session.submission.assignment.course.instructorId,
        }
      : null,
  }
}

export async function buildProcessTranscript(
  sessionId: string
): Promise<ProcessTranscriptSnapshot> {
  const context = await getProcessAssessmentContext(sessionId)
  return context.transcript
}

export async function ensureProcessTranscriptEvidence(sessionId: string): Promise<{
  evidence: AssessmentEvidenceRecord
  summary: AssessmentEvidenceSummary
}> {
  const context = await getProcessAssessmentContext(sessionId)

  if (context.evidence) {
    const { evidence, summary } = await listEvidenceForGradebookEntry(context.evidence.gradebookEntryId)
    return {
      evidence: evidence.find((item) => item.id === context.evidence?.id) ?? context.evidence,
      summary,
    }
  }

  if (!context.submission || !context.gradebookEntry) {
    throw new Error('Process evidence requires a linked submission')
  }

  if (context.submission.assessmentMode !== 'PROCESS') {
    throw new Error('Session is not linked to a PROCESS assessment')
  }

  return createEvidence({
    gradebookEntryId: context.gradebookEntry.id,
    evidenceType: 'SANDY_TRANSCRIPT',
    sourceId: sessionId,
    sourceLabel: `Sandy transcript: ${context.submission.assignmentTitle}`,
  })
}

export async function scoreProcess(sessionId: string): Promise<ProcessScores> {
  const transcript = await buildProcessTranscript(sessionId)
  const conversationText = transcript.messages
    .map((message, index) => `[${index}] ${message.role}: ${message.content}`)
    .join('\n\n')

  const annotationText =
    transcript.annotations.length > 0
      ? transcript.annotations
          .map((annotation) => `[Message ${annotation.messageIndex}] ${annotation.text}`)
          .join('\n')
      : '(No inline annotations provided.)'

  const reflectionText = transcript.reflection?.trim() || '(No summary reflection provided.)'

  if (!process.env.ANTHROPIC_API_KEY) {
    return buildFallbackScores(transcript, 'ANTHROPIC_API_KEY is not configured')
  }

  try {
    const response = await withRetry(() =>
      anthropic.messages.create({
        model: PROCESS_SCORING_MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `You are scoring a student's thinking process from a Sandy transcript. Score the process, not the correctness of the final answer.

## Session Transcript
${conversationText}

## Inline Annotations
${annotationText}

## Reflection
${reflectionText}

## Session Metadata
Mode: ${transcript.sessionMeta.mode}
Duration: ${Math.round(transcript.sessionMeta.duration / 60)} minutes
Messages: ${transcript.sessionMeta.messageCount}

Score each dimension from 0.0 to 1.0:
1. revision_depth: Did the student revise, iterate, or genuinely respond to pushback?
2. coherence: Is the reasoning internally consistent and connected across the session?
3. metacognition: Do the annotations and reflection show specific self-awareness about their own thinking?

Return JSON only:
{"revision_depth":0.0,"coherence":0.0,"metacognition":0.0,"rationale":"2-3 sentence explanation"}`,
          },
        ],
      })
    )

    const rawText = extractTextContent(response.content)
    const jsonText = extractJsonObject(rawText)
    if (!jsonText) {
      throw new Error('No JSON object found in process scoring response')
    }

    const parsed = JSON.parse(jsonText) as {
      revision_depth?: number
      coherence?: number
      metacognition?: number
      rationale?: unknown
    }

    return {
      processScore: roundUnit(clampUnit(parsed.revision_depth) ?? 0),
      coherenceScore: roundUnit(clampUnit(parsed.coherence) ?? 0),
      depthScore: roundUnit(clampUnit(parsed.metacognition) ?? 0),
      rationale:
        typeof parsed.rationale === 'string' && parsed.rationale.trim().length > 0
          ? parsed.rationale.trim()
          : 'AI process scoring completed.',
    }
  } catch (error) {
    console.error(`[process-scoring] Failed to score session ${sessionId}:`, error)
    return buildFallbackScores(
      transcript,
      error instanceof Error ? error.message : 'AI scoring failed'
    )
  }
}

export async function scoreAndPersistProcess(
  evidenceId: string,
  sessionId: string
): Promise<{
  evidence: AssessmentEvidenceRecord
  summary: AssessmentEvidenceSummary
  scores: ProcessScores
}> {
  const scores = await scoreProcess(sessionId)

  const updated = await prisma.assessmentEvidence.update({
    where: { id: evidenceId },
    data: {
      aiProcessScore: scores.processScore,
      aiCoherenceScore: scores.coherenceScore,
      aiDepthScore: scores.depthScore,
      aiScoringRationale: scores.rationale,
    },
    select: {
      id: true,
      gradebookEntryId: true,
    },
  })

  const { evidence, summary } = await listEvidenceForGradebookEntry(updated.gradebookEntryId)
  const updatedEvidence = evidence.find((item) => item.id === updated.id)

  if (!updatedEvidence) {
    throw new Error('Updated process evidence could not be reloaded')
  }

  return {
    evidence: updatedEvidence,
    summary,
    scores,
  }
}
