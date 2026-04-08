import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { CollabMode, CollabSessionStatus } from '../../../generated/prisma'
import {
  buildCollabShareUrl,
  ensureModeSupported,
  getUserByEmail,
  isConversationalTool,
} from '../../../lib/collab'
import { prisma } from '../../../lib/prisma'
import { generateJoinCode } from '../../../lib/join-code'
import { parseRequestBody } from '../../../lib/server-auth'
import { validateBody } from '../../../lib/validate'
import { CollabModeSchema } from '../../../lib/schemas'

const CreateCollabSessionSchema = z.object({
  toolId: z.string().min(1),
  mode: CollabModeSchema.optional(),
  courseId: z.string().optional().nullable(),
  turnDurationSeconds: z.number().int().min(10).optional().nullable(),
  artifactTitle: z.string().max(200).optional().nullable(),
  maxParticipants: z.number().int().min(2).max(8).optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getUserByEmail(request.headers.get('x-demo-user-email'))
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = await parseRequestBody(request)
    if ('error' in parsed) return parsed.error
    const validation = validateBody(CreateCollabSessionSchema, parsed.data)
    if ('error' in validation) return validation.error
    const {
      toolId,
      mode: rawMode,
      courseId = null,
      turnDurationSeconds = null,
      artifactTitle = null,
      maxParticipants: requestedMaxParticipants = null,
    } = validation.value
    const mode = rawMode ?? CollabMode.CO_PRESENCE

    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
      select: {
        id: true,
        name: true,
        toolType: true,
        collabEnabled: true,
        collabModes: true,
        collabMaxUsers: true,
      },
    })

    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }

    if (!isConversationalTool(tool.toolType)) {
      return NextResponse.json(
        { error: 'Collaborative sessions are only supported for conversational tools right now.' },
        { status: 400 }
      )
    }

    if (!ensureModeSupported(tool, mode)) {
      return NextResponse.json(
        { error: 'This tool is not configured for that collaboration mode.' },
        { status: 400 }
      )
    }

    let joinCode = ''
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = generateJoinCode()
      const collision = await prisma.collabSession.findFirst({
        where: {
          joinCode: candidate,
          status: {
            in: [CollabSessionStatus.WAITING, CollabSessionStatus.ACTIVE],
          },
        },
        select: { id: true },
      })

      if (!collision) {
        joinCode = candidate
        break
      }
    }

    if (!joinCode) {
      return NextResponse.json(
        { error: 'Could not generate a unique join code. Please try again.' },
        { status: 500 }
      )
    }

    const maxParticipants = requestedMaxParticipants ?? tool.collabMaxUsers

    const collabSession = await prisma.$transaction(async (tx) => {
      const toolSession = await tx.toolSession.create({
        data: {
          toolId: tool.id,
          courseId,
          userId: user.id,
        },
      })

      const session = await tx.collabSession.create({
        data: {
          toolSessionId: toolSession.id,
          toolId: tool.id,
          hostId: user.id,
          joinCode,
          mode,
          status: CollabSessionStatus.WAITING,
          maxParticipants,
          turnDurationSeconds: mode === CollabMode.TURN_BASED ? turnDurationSeconds : null,
          currentTurnUserId: mode === CollabMode.TURN_BASED ? user.id : null,
          currentTurnStartedAt: mode === CollabMode.TURN_BASED ? new Date() : null,
          artifactTitle: mode === CollabMode.ARTIFACT_BUILDER ? artifactTitle || 'Shared Artifact' : null,
          courseId,
        },
      })

      await tx.collabParticipant.create({
        data: {
          collabSessionId: session.id,
          userId: user.id,
          toolSessionId: toolSession.id,
          turnOrder: 0,
          isActive: true,
        },
      })

      return session
    })

    return NextResponse.json(
      {
        collabSessionId: collabSession.id,
        joinCode,
        shareUrl: buildCollabShareUrl(request, tool.id, joinCode),
        mode,
        createdAt: collabSession.createdAt.toISOString(),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/collab/sessions error:', error)
    return NextResponse.json({ error: 'Failed to create collaborative session' }, { status: 500 })
  }
}
