import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import {
  getRoomAssessmentAccessContext,
  persistRoomEvidenceSeeds,
  saveRoomSelfAssessment,
} from './commons-assessment-service'
import { updateEvidenceScoring } from './evidence-service'
import {
  parseCrossExamSelfAssessment,
  serializeCrossExamSelfAssessment,
  type CrossExamParticipantResult,
  type CrossExamSelfAssessmentPayload,
} from './types'

const anthropic = new Anthropic()
const CROSS_EXAM_MODEL = 'claude-haiku-4-5-20251001'

interface StoredCrossExamResults {
  roomType: 'DEBATE' | 'FISHBOWL'
  weights?: { ai: number; peer: number; self: number }
  participants: CrossExamParticipantResult[]
}

function roundUnit(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000
}

function normalizeFivePoint(value: number): number {
  return roundUnit(value / 5)
}

function extractTextContent(blocks: Anthropic.Messages.ContentBlock[]): string {
  return blocks
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim()
}

function buildFallbackDebateParticipant(input: {
  userId: string
  name: string
  opening: string
  rebuttal: string
  closing: string
}): CrossExamParticipantResult {
  const transcript = [
    `Opening: ${input.opening || '(none)'}`,
    `Rebuttal: ${input.rebuttal || '(none)'}`,
    `Closing: ${input.closing || '(none)'}`,
  ].join('\n\n')

  const strongest = input.opening || input.rebuttal || input.closing
  const weakest = input.rebuttal || input.closing || input.opening
  const wordCount = transcript.split(/\s+/).filter(Boolean).length
  const evidenceSignals =
    (transcript.match(/\b(data|study|evidence|research|according|for example)\b/gi) ?? [])
      .length
  const rebuttalSignals =
    (input.rebuttal.match(/\b(however|but|although|yet|counter|respond)\b/gi) ?? []).length
  const argumentQuality = roundUnit(0.32 + Math.min(0.45, wordCount / 400))
  const evidenceUse = roundUnit(0.24 + Math.min(0.52, evidenceSignals * 0.1))
  const rebuttals = roundUnit(0.22 + Math.min(0.56, rebuttalSignals * 0.14))
  const overall = roundUnit((argumentQuality + evidenceUse + rebuttals) / 3)

  return {
    userId: input.userId,
    name: input.name,
    ai: {
      argumentQuality,
      evidenceUse,
      rebuttals,
      overall,
      rationale:
        overall >= 0.7
          ? `${input.name} made a coherent case and responded to pressure with a recognizable line of reasoning.`
          : `${input.name} showed a plausible argument, but the evidence chain or rebuttal work was less consistently developed.`,
    },
    peer: {
      ratings: [],
      average: 0,
    },
    excerpts: {
      strongest: strongest?.slice(0, 260),
      weakest: weakest?.slice(0, 260),
    },
  }
}

export async function scoreDebateParticipant(input: {
  userId: string
  name: string
  topic: string
  sideName: string
  opening: string
  rebuttal: string
  closing: string
}): Promise<CrossExamParticipantResult> {
  const transcript = [
    `Opening: ${input.opening || '(none)'}`,
    `Rebuttal: ${input.rebuttal || '(none)'}`,
    `Closing: ${input.closing || '(none)'}`,
  ].join('\n\n')

  const strongest = input.opening || input.rebuttal || input.closing
  const weakest = input.rebuttal || input.closing || input.opening

  if (!process.env.ANTHROPIC_API_KEY) {
    return buildFallbackDebateParticipant(input)
  }

  try {
    const response = await anthropic.messages.create({
      model: CROSS_EXAM_MODEL,
      max_tokens: 700,
      messages: [
        {
          role: 'user',
          content: `A student just completed a debate on "${input.topic}" from the ${input.sideName} side.

Their statements:
${transcript}

Score the student's performance on 0.0 to 1.0 scales for:
- argumentQuality
- evidenceUse
- rebuttals

Also provide an overall average and a brief rationale.

Return JSON only:
{"argumentQuality":0.78,"evidenceUse":0.74,"rebuttals":0.69,"overall":0.74,"rationale":"1-2 sentences"}`,
        },
      ],
    })

    const text = extractTextContent(response.content)
    const jsonText = text.match(/\{[\s\S]*\}/)?.[0]
    if (!jsonText) {
      throw new Error('No JSON object found in debate scoring response')
    }

    const parsed = JSON.parse(jsonText) as {
      argumentQuality?: number
      evidenceUse?: number
      rebuttals?: number
      overall?: number
      rationale?: unknown
    }

    return {
      userId: input.userId,
      name: input.name,
      ai: {
        argumentQuality: roundUnit(parsed.argumentQuality ?? 0),
        evidenceUse: roundUnit(parsed.evidenceUse ?? 0),
        rebuttals: roundUnit(parsed.rebuttals ?? 0),
        overall: roundUnit(
          parsed.overall ??
            ((parsed.argumentQuality ?? 0) +
              (parsed.evidenceUse ?? 0) +
              (parsed.rebuttals ?? 0)) /
              3
        ),
        rationale:
          typeof parsed.rationale === 'string' && parsed.rationale.trim().length > 0
            ? parsed.rationale.trim()
            : `${input.name}'s debate performance was assessed.`,
      },
      peer: {
        ratings: [],
        average: 0,
      },
      excerpts: {
        strongest: strongest?.slice(0, 260),
        weakest: weakest?.slice(0, 260),
      },
    }
  } catch (error) {
    console.error('[cross-exam] AI debate scoring failed:', error)
    return buildFallbackDebateParticipant(input)
  }
}

export function buildFishbowlParticipantResult(input: {
  userId: string
  name: string
  totalRounds: number
  innerRounds: number
  annotationCount: number
  sampleAnnotations: string[]
}): CrossExamParticipantResult {
  const participationSignal =
    input.totalRounds > 0 ? input.innerRounds / input.totalRounds : 0
  const annotationSignal = Math.min(1, input.annotationCount / 4)
  const argumentQuality = roundUnit(0.28 + participationSignal * 0.52)
  const evidenceUse = roundUnit(0.22 + annotationSignal * 0.56)
  const rebuttals = roundUnit(0.24 + Math.min(1, participationSignal + annotationSignal) * 0.5)
  const overall = roundUnit((argumentQuality + evidenceUse + rebuttals) / 3)

  return {
    userId: input.userId,
    name: input.name,
    ai: {
      argumentQuality,
      evidenceUse,
      rebuttals,
      overall,
      rationale:
        input.innerRounds > 0
          ? `${input.name} contributed during ${input.innerRounds} discussion round(s) and added ${input.annotationCount} observer note(s), giving a usable picture of participation quality.`
          : `${input.name}'s fishbowl score leans on observer annotations because direct inner-circle contributions were limited in the captured record.`,
    },
    peer: {
      ratings: [],
      average: roundUnit((participationSignal + annotationSignal) / 2),
    },
    excerpts: {
      strongest: input.sampleAnnotations[0]?.slice(0, 260),
      weakest: input.sampleAnnotations.at(-1)?.slice(0, 260),
    },
  }
}

export async function getStoredCrossExamResults(
  roomId: string
): Promise<StoredCrossExamResults | null> {
  const room = await getRoomAssessmentAccessContext(roomId)
  if (!room) return null

  const raw = room.config.assessmentResults as StoredCrossExamResults | undefined
  if (!raw || !Array.isArray(raw.participants)) {
    return null
  }

  return raw
}

async function findCrossExamEvidence(
  roomId: string,
  userId: string
): Promise<{
  id: string
  evidenceType: 'DEBATE_SESSION' | 'FISHBOWL_SESSION'
  studentAnnotation: string | null
  gradebookEntryId: string
} | null> {
  const room = await getRoomAssessmentAccessContext(roomId)
  if (!room?.assignment) return null

  const submission = await prisma.submission.findUnique({
    where: {
      assignmentId_studentId: {
        assignmentId: room.assignment.id,
        studentId: userId,
      },
    },
    include: {
      gradebookEntry: {
        include: {
          evidence: {
            where: {
              sourceId: roomId,
              evidenceType: {
                in: ['DEBATE_SESSION', 'FISHBOWL_SESSION'],
              },
            },
          },
        },
      },
    },
  })

  const evidence = submission?.gradebookEntry?.evidence[0]
  if (!evidence) return null

  return {
    id: evidence.id,
    evidenceType: evidence.evidenceType as 'DEBATE_SESSION' | 'FISHBOWL_SESSION',
    studentAnnotation: evidence.studentAnnotation ?? null,
    gradebookEntryId: evidence.gradebookEntryId,
  }
}

export async function aggregateCrossExamScores(
  roomId: string,
  userId: string,
  config: { aiWeight?: number; peerWeight?: number; selfWeight?: number } = {}
) {
  const stored = await getStoredCrossExamResults(roomId)
  if (!stored) {
    throw new Error('Cross-exam results are not available for this room yet')
  }

  const participant = stored.participants.find((candidate) => candidate.userId === userId)
  if (!participant) {
    throw new Error('Participant was not found in stored cross-exam results')
  }

  const evidence = await findCrossExamEvidence(roomId, userId)
  const selfAssessment = parseCrossExamSelfAssessment(evidence?.studentAnnotation)

  const weights = {
    ai: config.aiWeight ?? stored.weights?.ai ?? 0.4,
    peer: config.peerWeight ?? stored.weights?.peer ?? 0.4,
    self: config.selfWeight ?? stored.weights?.self ?? 0.2,
  }

  const selfScore = selfAssessment.selfScore ?? 0
  const composite = roundUnit(
    participant.ai.overall * weights.ai +
      participant.peer.average * weights.peer +
      selfScore * weights.self
  )

  return {
    roomType: stored.roomType,
    participant,
    evidence,
    ai: participant.ai,
    peer: participant.peer,
    self: {
      score: selfScore,
      reflection: selfAssessment.reflection ?? '',
    },
    excerpts: participant.excerpts ?? {},
    composite,
    weights,
  }
}

export async function persistCrossExamAssessment(roomId: string): Promise<void> {
  const room = await getRoomAssessmentAccessContext(roomId)
  if (!room?.assessmentMode || !room.assignment) return

  const stored = await getStoredCrossExamResults(roomId)
  if (!stored) return

  const evidenceType =
    stored.roomType === 'DEBATE' ? 'DEBATE_SESSION' : 'FISHBOWL_SESSION'
  const weights = {
    ai: stored.weights?.ai ?? 0.4,
    peer: stored.weights?.peer ?? 0.4,
    self: stored.weights?.self ?? 0.2,
  }

  await persistRoomEvidenceSeeds(
    roomId,
    stored.participants.map((participant) => ({
      userId: participant.userId,
      evidenceType,
      sourceId: roomId,
      sourceLabel: `${stored.roomType === 'DEBATE' ? 'Debate' : 'Fishbowl'} Assessment: ${room.title}`,
      summaryText: [
        `[Commons assessment] ${room.title}`,
        `Mode: ${stored.roomType === 'DEBATE' ? 'Cross-examination debate' : 'Cross-examination fishbowl'}`,
        `Participant: ${participant.name}`,
        participant.excerpts?.strongest
          ? `Strongest excerpt: ${participant.excerpts.strongest}`
          : null,
      ]
        .filter(Boolean)
        .join('\n'),
      aiProcessScore: roundUnit(
        participant.ai.overall * weights.ai + participant.peer.average * weights.peer
      ),
      aiCoherenceScore: participant.ai.overall,
      aiDepthScore: participant.peer.average,
      aiScoringRationale: [
        participant.ai.rationale ?? 'Cross-exam performance assessed.',
        `Default weights -> AI ${Math.round(weights.ai * 100)}%, Peer ${Math.round(weights.peer * 100)}%, Self ${Math.round(weights.self * 100)}%`,
      ].join('\n\n'),
    }))
  )
}

export async function saveCrossExamSelfAssessment(input: {
  roomId: string
  userId: string
  payload: CrossExamSelfAssessmentPayload
}) {
  const stored = await getStoredCrossExamResults(input.roomId)
  if (!stored) {
    throw new Error('Cross-exam results are not available yet')
  }

  const evidenceType =
    stored.roomType === 'DEBATE' ? 'DEBATE_SESSION' : 'FISHBOWL_SESSION'
  const serialized = serializeCrossExamSelfAssessment(input.payload)
  const updated = await saveRoomSelfAssessment({
    roomId: input.roomId,
    userId: input.userId,
    evidenceType,
    annotation: serialized,
  })

  const aggregate = await aggregateCrossExamScores(input.roomId, input.userId)
  if (updated.evidence) {
    await updateEvidenceScoring(updated.evidence.id, {
      aiProcessScore: aggregate.composite,
      aiScoringRationale: [
        aggregate.ai.rationale ?? 'Cross-exam performance assessed.',
        aggregate.self.reflection
          ? `Self-reflection: ${aggregate.self.reflection}`
          : null,
      ]
        .filter(Boolean)
        .join('\n\n'),
    })
  }

  return aggregate
}
