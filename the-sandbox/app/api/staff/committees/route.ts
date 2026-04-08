import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { getUpcomingMeetings, createCommittee } from '../../../lib/staff/committee-service'
import type { CommitteeMember, CreateCommitteeInput } from '../../../lib/staff/committee-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const upcoming = await getUpcomingMeetings(auth.user.id)
  const committees = upcoming.map((u) => {
    const members = u.committee!.members as CommitteeMember[] | null
    const nextAgenda = (u.committee!.nextAgenda as { title: string }[] | null) ?? []
    return {
      id: u.committee!.id,
      name: u.committee!.name,
      type: u.committee!.type,
      cadence: u.committee!.cadence,
      meetingDay: u.committee!.meetingDay,
      meetingTime: u.committee!.meetingTime,
      nextMeeting: u.nextMeeting?.toISOString() ?? null,
      openActionItems: u.openActionItems,
      pendingMinutes: u.pendingMinutes,
      memberCount: members?.length ?? 0,
      agendaItemCount: nextAgenda.length,
    }
  })
  return NextResponse.json({ committees }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as Omit<CreateCommitteeInput, 'chairId'>
  const committee = await createCommittee({ ...body, chairId: auth.user.id })
  return NextResponse.json(committee, { status: 201 })
})
