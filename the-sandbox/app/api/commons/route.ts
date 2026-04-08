import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../lib/server-auth'
import { createLiveRoom } from '../../lib/commons/commons-service'
import type { LiveRoomType } from '../../generated/prisma'
import { withErrorHandling } from '../../lib/api-utils'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { channelId, type, title, config, courseId, assignmentId, assessmentMode } = parsed.data as {
    channelId: string
    type: LiveRoomType
    title: string
    config?: Record<string, unknown>
    courseId?: string
    assignmentId?: string
    assessmentMode?: boolean
  }

  if (!channelId || !type || !title) {
    return NextResponse.json({ error: 'channelId, type, and title are required' }, { status: 400 })
  }

  try {
    const room = await createLiveRoom(
      channelId,
      auth.user.id,
      type,
      title,
      config,
      courseId,
      assignmentId,
      assessmentMode
    )
    return NextResponse.json(room, { status: 201 })
  } catch (err: unknown) {
    const e = err as { message: string; status?: number }
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 })
  }
})
