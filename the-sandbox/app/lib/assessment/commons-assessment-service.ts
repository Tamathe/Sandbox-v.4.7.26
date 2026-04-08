import type { Assignment, GradebookStatus, LiveRoomType } from '../../generated/prisma'
import { prisma } from '../prisma'
import { toJsonValue } from '../prisma-utils'
import { scoreSubmission } from '../grading-service'
import {
  createEvidence,
  refreshGradebookEvidenceSummary,
  updateEvidence,
  updateEvidenceScoring,
} from './evidence-service'

type RoomAssessmentParticipant = {
  id: string
  userId: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

export interface RoomAssessmentAccessContext {
  id: string
  type: LiveRoomType
  title: string
  hostId: string
  assignmentId: string | null
  assessmentMode: boolean
  config: Record<string, unknown>
  assignment: {
    id: string
    title: string
    type: Assignment['type']
    rubricId: string | null
    pointsPossible: number
    course: {
      id: string
      title: string
      instructorId: string
    }
  } | null
  participants: RoomAssessmentParticipant[]
}

export interface RoomEvidenceSeed {
  userId: string
  evidenceType:
    | 'SIMULATION_THREAD'
    | 'TEACHBACK_SESSION'
    | 'DEBATE_SESSION'
    | 'FISHBOWL_SESSION'
  sourceId: string
  sourceLabel: string
  summaryText: string
  aiProcessScore?: number | null
  aiCoherenceScore?: number | null
  aiDepthScore?: number | null
  aiScoringRationale?: string | null
  studentAnnotation?: string | null
  weight?: number
}

export async function getRoomAssessmentAccessContext(
  roomId: string
): Promise<RoomAssessmentAccessContext | null> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      assignment: {
        select: {
          id: true,
          title: true,
          type: true,
          rubricId: true,
          pointsPossible: true,
          course: {
            select: {
              id: true,
              title: true,
              instructorId: true,
            },
          },
        },
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },
    },
  })

  if (!room) return null

  return {
    id: room.id,
    type: room.type,
    title: room.title,
    hostId: room.hostId,
    assignmentId: room.assignmentId,
    assessmentMode: room.assessmentMode,
    config: (room.config as Record<string, unknown> | null) ?? {},
    assignment: room.assignment,
    participants: room.participants,
  }
}

export function isFacultyForAssessmentRoom(
  user: { id: string; role: string },
  room: Pick<RoomAssessmentAccessContext, 'assignment'>
): boolean {
  if (user.role === 'ADMIN') return true
  return Boolean(
    user.role === 'EDUCATOR' &&
      room.assignment &&
      room.assignment.course.instructorId === user.id
  )
}

export function isParticipantInAssessmentRoom(
  userId: string,
  room: Pick<RoomAssessmentAccessContext, 'participants'>
): boolean {
  return room.participants.some((participant) => participant.userId === userId)
}

export function getAssessableParticipants(
  room: Pick<RoomAssessmentAccessContext, 'participants' | 'hostId'>
): RoomAssessmentParticipant[] {
  const students = room.participants.filter(
    (participant) => participant.user.role === 'STUDENT'
  )
  if (students.length > 0) return students

  const nonHost = room.participants.filter(
    (participant) => participant.userId !== room.hostId
  )
  return nonHost.length > 0 ? nonHost : room.participants
}

export async function setRoomAssessmentResults(
  roomId: string,
  assessmentResults: unknown
): Promise<void> {
  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    select: { config: true },
  })

  const nextConfig = {
    ...((room?.config as Record<string, unknown> | null) ?? {}),
    assessmentResults,
  }

  await prisma.liveRoom.update({
    where: { id: roomId },
    data: {
      config: toJsonValue(nextConfig),
    },
  })
}

async function ensureAssessmentSubmissionAndEntry(input: {
  assignment: NonNullable<RoomAssessmentAccessContext['assignment']>
  studentId: string
  summaryText: string
}) {
  const placeholder = input.summaryText.trim()
  let submission = await prisma.submission.findUnique({
    where: {
      assignmentId_studentId: {
        assignmentId: input.assignment.id,
        studentId: input.studentId,
      },
    },
    include: {
      gradebookEntry: {
        select: { id: true, status: true },
      },
    },
  })

  if (!submission) {
    submission = await prisma.submission.create({
      data: {
        assignmentId: input.assignment.id,
        studentId: input.studentId,
        type: input.assignment.type,
        textContent: placeholder,
      },
      include: {
        gradebookEntry: {
          select: { id: true, status: true },
        },
      },
    })
  } else if (
    !submission.fileUrl &&
    (!submission.textContent ||
      submission.textContent.startsWith('[Commons assessment]'))
  ) {
    submission = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        textContent: placeholder,
      },
      include: {
        gradebookEntry: {
          select: { id: true, status: true },
        },
      },
    })
  }

  let gradebookEntry = submission.gradebookEntry
  if (!gradebookEntry) {
    gradebookEntry = await prisma.gradebookEntry.create({
      data: {
        submissionId: submission.id,
        status: 'AI_DRAFT',
      },
      select: { id: true, status: true },
    })
  }

  return { submission, gradebookEntry }
}

async function syncAssessmentDraftGrade(input: {
  gradebookEntryId: string
  submissionId: string
  assignment: NonNullable<RoomAssessmentAccessContext['assignment']>
  rationale: string | null | undefined
}) {
  const entry = await prisma.gradebookEntry.findUnique({
    where: { id: input.gradebookEntryId },
    select: {
      id: true,
      status: true,
      processScore: true,
    },
  })

  if (!entry) return

  if (
    input.assignment.rubricId &&
    entry.status !== 'APPROVED' &&
    entry.status !== 'RELEASED'
  ) {
    await scoreSubmission(input.submissionId)
    return
  }

  if (entry.status === 'APPROVED' || entry.status === 'RELEASED') {
    return
  }

  const summary = await refreshGradebookEvidenceSummary(input.gradebookEntryId)
  const normalized = summary.processScore ?? summary.weightedScores.process ?? 0
  const aiScore =
    normalized != null
      ? Math.round(normalized * input.assignment.pointsPossible * 10) / 10
      : null

  await prisma.gradebookEntry.update({
    where: { id: input.gradebookEntryId },
    data: {
      compositeMethod: summary.compositeMethod,
      processScore: summary.processScore,
      aiScore,
      aiRawFeedback: input.rationale?.trim() || null,
      status: 'PENDING_REVIEW',
    },
  })
}

export async function persistRoomEvidenceSeeds(
  roomId: string,
  seeds: RoomEvidenceSeed[]
): Promise<void> {
  if (seeds.length === 0) return

  const room = await getRoomAssessmentAccessContext(roomId)
  if (!room?.assessmentMode || !room.assignment) return

  const participantByUserId = new Map(
    getAssessableParticipants(room).map((participant) => [
      participant.userId,
      participant,
    ])
  )

  for (const seed of seeds) {
    const participant = participantByUserId.get(seed.userId)
    if (!participant) continue

    const { submission, gradebookEntry } = await ensureAssessmentSubmissionAndEntry(
      {
        assignment: room.assignment,
        studentId: participant.userId,
        summaryText: seed.summaryText,
      }
    )

    let linked = await createEvidence({
      gradebookEntryId: gradebookEntry.id,
      evidenceType: seed.evidenceType,
      sourceId: seed.sourceId,
      sourceLabel: seed.sourceLabel,
      weight: seed.weight ?? 1,
      studentAnnotation: seed.studentAnnotation ?? null,
    })

    if (
      seed.studentAnnotation !== undefined &&
      seed.studentAnnotation !== linked.evidence.studentAnnotation
    ) {
      linked = await updateEvidence(linked.evidence.id, {
        studentAnnotation: seed.studentAnnotation,
      })
    }

    if (
      seed.aiProcessScore !== undefined ||
      seed.aiCoherenceScore !== undefined ||
      seed.aiDepthScore !== undefined ||
      seed.aiScoringRationale !== undefined
    ) {
      linked = await updateEvidenceScoring(linked.evidence.id, {
        aiProcessScore: seed.aiProcessScore,
        aiCoherenceScore: seed.aiCoherenceScore,
        aiDepthScore: seed.aiDepthScore,
        aiScoringRationale: seed.aiScoringRationale,
      })
    }

    await syncAssessmentDraftGrade({
      gradebookEntryId: gradebookEntry.id,
      submissionId: submission.id,
      assignment: room.assignment,
      rationale: seed.aiScoringRationale,
    })
  }
}

export async function saveRoomSelfAssessment(input: {
  roomId: string
  userId: string
  evidenceType: 'DEBATE_SESSION' | 'FISHBOWL_SESSION'
  annotation: string | null
}) {
  const room = await getRoomAssessmentAccessContext(input.roomId)
  if (!room?.assessmentMode || !room.assignment) {
    throw new Error('Room is not configured for Commons-based assessment')
  }

  const participant = getAssessableParticipants(room).find(
    (candidate) => candidate.userId === input.userId
  )
  if (!participant) {
    throw new Error('Participant is not linked to this assessment room')
  }

  const { gradebookEntry } = await ensureAssessmentSubmissionAndEntry({
    assignment: room.assignment,
    studentId: participant.userId,
    summaryText: `[Commons assessment] ${room.title}\n\nReflection and scoring evidence are linked from the ${room.type.toLowerCase()} room.`,
  })

  const evidence = await prisma.assessmentEvidence.findUnique({
    where: {
      gradebookEntryId_evidenceType_sourceId: {
        gradebookEntryId: gradebookEntry.id,
        evidenceType: input.evidenceType,
        sourceId: input.roomId,
      },
    },
    select: { id: true },
  })

  if (!evidence) {
    throw new Error('Assessment evidence has not been created for this participant yet')
  }

  return updateEvidence(evidence.id, {
    studentAnnotation: input.annotation,
  })
}

export const FINALIZED_GRADEBOOK_STATUSES: GradebookStatus[] = [
  'APPROVED',
  'RELEASED',
]
