import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../lib/api-utils'
import { prisma } from '../../../../../../lib/prisma'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string; meetingId: string }> },
) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id: committeeId, meetingId } = await params

  const meeting = await prisma.committeeMeeting.findFirst({
    where: { id: meetingId, committeeId },
    include: {
      committee: { select: { name: true } },
    },
  })

  if (!meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
  }

  const content = meeting.formattedMinutes ?? 'No minutes available for this meeting.'
  const safeName = meeting.committee.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()
  const dateStr = meeting.date.toISOString().slice(0, 10)

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName}-minutes-${dateStr}.md"`,
    },
  })
})
