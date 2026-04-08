import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { resolveEvent } from '../../../../../lib/campus-pulse/campus-pulse-service'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) => {
  const auth = await requireAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { eventId } = await params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error

  const { note } = parsed.data as { note?: string }
  await resolveEvent(eventId, auth.user.id, note || 'Resolved')

  return NextResponse.json({ success: true })
})
