import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { sendRoundUpdateEmail } from '../../../../../lib/bracket/bracket-email-service'
import { prisma } from '../../../../../lib/prisma'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const auth = await requireRequestUser(request)
  if ('response' in auth) return auth.response

  const { id } = await params

  const contest = await prisma.bracketContest.findUnique({ where: { id } })
  if (!contest) return NextResponse.json({ error: 'Contest not found' }, { status: 404 })
  if (contest.commissionerId !== auth.user.id) {
    return NextResponse.json({ error: 'Only the commissioner can send emails' }, { status: 403 })
  }

  try {
    const log = await sendRoundUpdateEmail(id, auth.user.id)
    return NextResponse.json({ sent: true, recipientCount: log.recipientCount })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to send email'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
})
