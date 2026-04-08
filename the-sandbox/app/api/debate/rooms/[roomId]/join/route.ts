import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, parseRequestBody } from '../../../../../lib/server-auth'
import { getRoomByAccessCode } from '../../../../../lib/debate'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) => {
  const auth = await requireRequestUser(request)
  if ('response' in auth) return auth.response

  const { roomId } = await params
  const parsed = await parseRequestBody<{ accessCode: unknown }>(request)
  if ('error' in parsed) return parsed.error
  const { accessCode } = parsed.data

  if (!accessCode || typeof accessCode !== 'string') {
    return NextResponse.json({ error: 'accessCode is required' }, { status: 400 })
  }

  const room = await getRoomByAccessCode(accessCode.trim().toUpperCase())
  if (!room) {
    return NextResponse.json({ error: 'Invalid access code' }, { status: 404 })
  }
  if (room.id !== roomId) {
    return NextResponse.json({ error: 'Access code does not match this room' }, { status: 400 })
  }

  return NextResponse.json({ room })
})
