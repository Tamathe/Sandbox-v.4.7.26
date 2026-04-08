import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { generateMinutes, getCommitteeHistory } from '../../../../../lib/staff/minutes-service'

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

  const meetings = await getCommitteeHistory(id, { limit })
  return NextResponse.json({ meetings }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { rawNotes, inputType, date, attendees } = parsed.data as { rawNotes: string; inputType?: 'notes' | 'transcript' | 'structured' | 'agenda-aligned'; date?: string; attendees?: string[] }

  if (!rawNotes || typeof rawNotes !== 'string') {
    return NextResponse.json({ error: 'rawNotes is required' }, { status: 400 })
  }

  const result = await generateMinutes({
    committeeId: id,
    meetingDate: date ? new Date(date) : new Date(),
    rawNotes,
    inputType: inputType || 'notes',
    attendees,
  })

  return NextResponse.json(result, { status: 201 })
})
