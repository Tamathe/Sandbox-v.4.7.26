import Anthropic from '@anthropic-ai/sdk'
import type { Prisma } from '../../generated/prisma'
import { prisma } from '../prisma'
import {
  getRoomAssessmentAccessContext,
  persistRoomEvidenceSeeds,
} from './commons-assessment-service'
import type {
  DivergenceAssessmentRecord,
  DivergenceParticipantPath,
  DivergenceTreeNode,
} from './types'

const anthropic = new Anthropic()
const DIVERGENCE_SCORING_MODEL = 'claude-haiku-4-5-20251001'

type SimulationThreadRecord = {
  participantId: string
  turnNumber: number
  prompt: string
  choice: string
  narrative: string
  participant: {
    userId: string
    user: {
      id: string
      name: string
    }
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
        await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt))
      }
    }
  }

  throw lastError
}

function buildTreeNode(
  threads: SimulationThreadRecord[],
  turn: number,
  maxTurns: number,
  participantIds?: Set<string>
): DivergenceTreeNode {
  const relevantThreads = participantIds
    ? threads.filter((thread) => participantIds.has(thread.participantId))
    : threads

  const turnThreads = relevantThreads.filter((thread) => thread.turnNumber === turn)
  const prompt = turnThreads[0]?.prompt ?? ''

  const grouped = new Map<string, string[]>()
  for (const thread of turnThreads) {
    if (!grouped.has(thread.choice)) {
      grouped.set(thread.choice, [])
    }
    grouped.get(thread.choice)!.push(thread.participantId)
  }

  const branches = [...grouped.entries()].map(([choice, ids]) => ({
    choice,
    participantIds: ids,
    childNode:
      turn < maxTurns
        ? buildTreeNode(threads, turn + 1, maxTurns, new Set(ids))
        : undefined,
  }))

  return {
    turn,
    prompt,
    branches,
  }
}

function buildFallbackCoherence(
  participantPath: DivergenceParticipantPath
): { coherenceScore: number; rationale: string } {
  const narratives = participantPath.decisions.map((decision) => decision.narrative).join(' ')
  const choices = participantPath.decisions.map((decision) => decision.choice).join(' ')
  const connectiveSignals = (narratives.match(/\b(because|therefore|however|since|so|if|then)\b/gi) ?? []).length
  const reflectionSignals = (narratives.match(/\b(reassess|adapt|adjust|consider|balance|prioritize)\b/gi) ?? []).length
  const noResponseCount = participantPath.decisions.filter((decision) =>
    /no response/i.test(decision.choice)
  ).length

  const score = roundUnit(
    0.32 +
      Math.min(1, connectiveSignals / 4) * 0.28 +
      Math.min(1, reflectionSignals / 3) * 0.24 +
      Math.min(1, participantPath.decisions.length / 4) * 0.2 -
      Math.min(0.25, noResponseCount * 0.12)
  )

  return {
    coherenceScore: score,
    rationale:
      score >= 0.7
        ? `${participantPath.name}'s choices formed a consistent through-line across the scenario, with later turns building on earlier priorities.`
        : `${participantPath.name}'s path showed some coherent intentions, but the strategy was less clearly sustained across turns.`,
  }
}

export async function buildDivergenceTree(
  roomId: string
): Promise<DivergenceAssessmentRecord> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    select: {
      title: true,
      config: true,
    },
  })

  if (!room) {
    throw new Error('Room not found')
  }

  const threads = await prisma.simulationThread.findMany({
    where: { roomId },
    include: {
      participant: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: [{ participantId: 'asc' }, { turnNumber: 'asc' }],
  })

  if (threads.length === 0) {
    throw new Error('Simulation has no recorded decision paths')
  }

  const byParticipant = new Map<string, SimulationThreadRecord[]>()
  for (const thread of threads as SimulationThreadRecord[]) {
    if (!byParticipant.has(thread.participantId)) {
      byParticipant.set(thread.participantId, [])
    }
    byParticipant.get(thread.participantId)!.push(thread)
  }

  const participants: DivergenceParticipantPath[] = []
  for (const [, participantThreads] of byParticipant) {
    const first = participantThreads[0]
    const last = participantThreads[participantThreads.length - 1]
    if (!first || !last) continue

    participants.push({
      userId: first.participant.user.id,
      name: first.participant.user.name ?? 'Anonymous',
      decisions: participantThreads.map((thread) => ({
        turn: thread.turnNumber,
        choice: thread.choice,
        narrative: thread.narrative,
      })),
      endState: last.narrative,
      coherenceScore: 0,
      coherenceRationale: '',
    })
  }

  const maxTurns = Math.max(...threads.map((thread) => thread.turnNumber))
  const keyDecisionPoints = Array.from({ length: maxTurns }, (_, index) => {
    const turn = index + 1
    const choicesThisTurn = threads
      .filter((thread) => thread.turnNumber === turn)
      .map((thread) => thread.choice)
    const divergenceScore =
      choicesThisTurn.length > 0
        ? new Set(choicesThisTurn).size / choicesThisTurn.length
        : 0

    return {
      turn,
      divergenceScore: roundUnit(divergenceScore),
    }
  })

  const clusterCount = new Set(
    participants.map((participant) => participant.decisions.at(-1)?.choice ?? participant.endState)
  ).size

  const config = (room.config as { customScenario?: string } | null) ?? {}
  const scenario =
    config.customScenario?.trim() ||
    threads.find((thread) => thread.turnNumber === 1)?.prompt ||
    room.title

  return {
    roomId,
    scenario,
    tree: buildTreeNode(threads as SimulationThreadRecord[], 1, maxTurns),
    clusterCount,
    keyDecisionPoints,
    participants,
  }
}

export async function scoreCoherence(
  participantPath: DivergenceParticipantPath,
  scenario: string
): Promise<{ coherenceScore: number; rationale: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return buildFallbackCoherence(participantPath)
  }

  const decisionText = participantPath.decisions
    .map(
      (decision) =>
        `Turn ${decision.turn}: Chose "${decision.choice}" and saw this result: ${decision.narrative}`
    )
    .join('\n')

  try {
    const response = await withRetry(() =>
      anthropic.messages.create({
        model: DIVERGENCE_SCORING_MODEL,
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: `Scenario: ${scenario}

Participant "${participantPath.name}" followed this path:
${decisionText}

Score the internal COHERENCE of the participant's decision-making on a 0.0 to 1.0 scale.
Focus on whether the choices form a recognizable framework under ambiguity, not whether the outcome was "correct."

Return JSON only:
{"coherence":0.0,"rationale":"1-2 sentences about the logic or inconsistency you observed."}`,
          },
        ],
      })
    )

    const text = extractTextContent(response.content)
    const jsonText = text.match(/\{[\s\S]*\}/)?.[0]
    if (!jsonText) {
      throw new Error('No JSON object found in coherence response')
    }

    const parsed = JSON.parse(jsonText) as {
      coherence?: number
      rationale?: unknown
    }

    return {
      coherenceScore: roundUnit(parsed.coherence ?? 0),
      rationale:
        typeof parsed.rationale === 'string' && parsed.rationale.trim().length > 0
          ? parsed.rationale.trim()
          : `${participantPath.name}'s path was assessed for decision coherence.`,
    }
  } catch (error) {
    console.error('[divergence-service] AI coherence scoring failed:', error)
    return buildFallbackCoherence(participantPath)
  }
}

function hydrateSnapshotRecord(snapshot: {
  roomId: string
  scenario: string
  treeJson: Prisma.JsonValue
  clusterCount: number
  keyDecisionPoints: Prisma.JsonValue
  participantPaths: Prisma.JsonValue
}): DivergenceAssessmentRecord {
  return {
    roomId: snapshot.roomId,
    scenario: snapshot.scenario,
    tree: snapshot.treeJson as unknown as DivergenceTreeNode,
    clusterCount: snapshot.clusterCount,
    keyDecisionPoints:
      (snapshot.keyDecisionPoints as unknown as DivergenceAssessmentRecord['keyDecisionPoints']) ??
      [],
    participants:
      (snapshot.participantPaths as unknown as DivergenceParticipantPath[]) ?? [],
  }
}

export async function persistDivergenceSnapshot(
  roomId: string
): Promise<DivergenceAssessmentRecord> {
  const result = await buildDivergenceTree(roomId)

  await Promise.all(
    result.participants.map(async (participant) => {
      const scored = await scoreCoherence(participant, result.scenario)
      participant.coherenceScore = scored.coherenceScore
      participant.coherenceRationale = scored.rationale
    })
  )

  const snapshot = await prisma.divergenceSnapshot.upsert({
    where: { roomId },
    update: {
      scenario: result.scenario,
      totalTurns: result.keyDecisionPoints.length,
      treeJson: result.tree as unknown as Prisma.InputJsonValue,
      clusterCount: result.clusterCount,
      keyDecisionPoints: result.keyDecisionPoints as unknown as Prisma.InputJsonValue,
      participantPaths: result.participants as unknown as Prisma.InputJsonValue,
    },
    create: {
      roomId,
      scenario: result.scenario,
      totalTurns: result.keyDecisionPoints.length,
      treeJson: result.tree as unknown as Prisma.InputJsonValue,
      clusterCount: result.clusterCount,
      keyDecisionPoints: result.keyDecisionPoints as unknown as Prisma.InputJsonValue,
      participantPaths: result.participants as unknown as Prisma.InputJsonValue,
    },
  })

  return hydrateSnapshotRecord(snapshot)
}

export async function getDivergenceAssessmentRecord(
  roomId: string
): Promise<DivergenceAssessmentRecord> {
  const snapshot = await prisma.divergenceSnapshot.findUnique({
    where: { roomId },
  })

  if (snapshot) {
    return hydrateSnapshotRecord(snapshot)
  }

  return persistDivergenceSnapshot(roomId)
}

export async function finalizeDivergenceAssessment(roomId: string): Promise<void> {
  const room = await getRoomAssessmentAccessContext(roomId)
  if (!room?.assessmentMode || !room.assignment) return

  const record = await persistDivergenceSnapshot(roomId)
  const seeds = record.participants.map((participant) => ({
    userId: participant.userId,
    evidenceType: 'SIMULATION_THREAD' as const,
    sourceId: roomId,
    sourceLabel: `Simulation Room: ${room.title}`,
    summaryText: [
      `[Commons assessment] ${room.title}`,
      `Mode: Divergence simulation`,
      `Participant: ${participant.name}`,
      `Scenario: ${record.scenario}`,
      `Decision path:`,
      ...participant.decisions.map(
        (decision) =>
          `- Turn ${decision.turn}: ${decision.choice} -> ${decision.narrative}`
      ),
      `End state: ${participant.endState}`,
    ].join('\n'),
    aiProcessScore: participant.coherenceScore,
    aiCoherenceScore: participant.coherenceScore,
    aiDepthScore: roundUnit(
      participant.decisions.length > 0
        ? participant.decisions.length / Math.max(record.keyDecisionPoints.length, 1)
        : 0
    ),
    aiScoringRationale: participant.coherenceRationale,
  }))

  await persistRoomEvidenceSeeds(roomId, seeds)

  await Promise.all(
    record.participants.map((participant) =>
      prisma.liveRoomParticipant.updateMany({
        where: {
          roomId,
          userId: participant.userId,
        },
        data: {
          score: Math.round(participant.coherenceScore * 100),
        },
      })
    )
  )
}
