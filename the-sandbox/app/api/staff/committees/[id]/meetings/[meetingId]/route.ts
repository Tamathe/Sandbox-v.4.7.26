import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../lib/api-utils'
import { getMeeting, updateMeeting } from '../../../../../../lib/staff/minutes-service'

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string; meetingId: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { meetingId } = await params
  const meeting = await getMeeting(meetingId)

  if (!meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
  }

  return NextResponse.json(meeting, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string; meetingId: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { meetingId } = await params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as Record<string, unknown>
  const meeting = await updateMeeting(meetingId, body)
  return NextResponse.json(meeting, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
