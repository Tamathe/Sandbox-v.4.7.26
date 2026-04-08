import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { prisma } from '../../../../../lib/prisma'
import { openPoll, listPolls } from '../../../../../lib/sandcastle/poll-service'

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { roomId } = await params

  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { hostId: true } })
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }
  if (room.hostId !== auth.user.id && auth.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await parseRequestBody<{
    question?: string
    options?: string[]
    durationSeconds?: number
  }>(request)
  if ('error' in body) return body.error

  const { question, options, durationSeconds } = body.data

  if (!question || question.trim().length === 0) {
    return NextResponse.json({ error: 'question is required' }, { status: 400 })
  }
  if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
    return NextResponse.json({ error: 'options must be an array of 2–6 items' }, { status: 400 })
  }

  try {
    const result = await openPoll(roomId, auth.user.id, question.trim(), options, durationSeconds)
    return NextResponse.json(result, { status: 201 })
  } catch (err: unknown) {
    const e = err as { code?: string; status?: number; message?: string }
    return NextResponse.json(
      { error: e.message ?? 'Failed to open poll', code: e.code },
      { status: e.status ?? 500 },
    )
  }
})

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { roomId } = await params

  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { hostId: true } })
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }
  if (room.hostId !== auth.user.id && auth.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const polls = await listPolls(roomId)
  return NextResponse.json({ polls }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
