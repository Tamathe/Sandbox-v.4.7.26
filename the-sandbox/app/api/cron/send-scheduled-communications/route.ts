import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const authError = verifyCronSecret(request)
  if (authError) return authError

  try {
    const now = new Date()

    // Find all approved communications whose scheduled time has passed
    const due = await prisma.staffCommunication.findMany({
      where: {
        status: 'approved',
        scheduledFor: { not: null, lte: now },
      },
      select: {
        id: true,
        authorId: true,
        subject: true,
        type: true,
        audienceDesc: true,
      },
    })

    if (due.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 }, {
        headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
      })
    }

    await prisma.$transaction([
      prisma.staffCommunication.updateMany({
        where: { id: { in: due.map(c => c.id) } },
        data: {
          status: 'sent',
          sentAt: now,
          scheduledFor: null,
          scheduledBy: null,
        },
      }),
      ...due.map(comm =>
        prisma.assistantActionLog.create({
          data: {
            userId: comm.authorId,
            actionType: 'communication-sent',
            summary: `Scheduled communication sent: ${comm.subject ?? '(no subject)'}`,
            metadata: {
              communicationId: comm.id,
              type: comm.type,
              audience: comm.audienceDesc,
              scheduledSend: true,
            },
          },
        })
      ),
    ])

    return NextResponse.json({ ok: true, sent: due.length }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  } catch (error) {
    console.error('[CRON] send-scheduled-communications error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
})
