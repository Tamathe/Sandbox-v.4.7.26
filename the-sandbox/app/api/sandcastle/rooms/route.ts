import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { prisma } from '../../../lib/prisma'
import { createRoom, ROOM_ONLY_TYPES } from '../../../lib/sandcastle/room-service'

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireEducatorUser(request)
  if (isAuthFailure(auth)) return auth.response

  const body = await parseRequestBody<{
    toolId?: string
    title?: string
    maxParticipants?: number
  }>(request)
  if ('error' in body) return body.error

  const { toolId, title, maxParticipants } = body.data

  if (!toolId) {
    return NextResponse.json({ error: 'toolId is required' }, { status: 400 })
  }

  const tool = await prisma.tool.findUnique({ where: { id: toolId } })
  if (!tool) {
    return NextResponse.json({ error: 'Tool not found', code: 'TOOL_NOT_FOUND' }, { status: 400 })
  }

  if (!ROOM_ONLY_TYPES.includes(tool.toolType as (typeof ROOM_ONLY_TYPES)[number])) {
    return NextResponse.json(
      { error: 'Tool type cannot be used as a room experience', code: 'INVALID_TOOL_TYPE' },
      { status: 400 },
    )
  }

  // Enforce one active room per tool
  const activeRoom = await prisma.room.findFirst({
    where: { toolId, endedAt: null },
  })
  if (activeRoom) {
    return NextResponse.json(
      { error: 'This tool already has an active room', code: 'ROOM_ALREADY_ACTIVE' },
      { status: 409 },
    )
  }

  const { room, wsToken } = await createRoom(
    auth.user.id,
    toolId,
    title ?? tool.name,
    maxParticipants,
  )
  return NextResponse.json({ roomId: room.roomId, joinCode: room.joinCode, wsToken, room }, { status: 201 })
})
