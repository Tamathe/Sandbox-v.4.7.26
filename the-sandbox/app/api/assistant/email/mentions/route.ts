import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { prisma } from '../../../../lib/prisma'
import { scanForMentions, getMentionSummary } from '../../../../lib/assistant/email-mention-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const user = auth.user
  const nameParts = user.name.split(' ')
  const firstName = nameParts[0] ?? ''
  const lastName = nameParts[nameParts.length - 1] ?? ''

  // Fetch recent emails (last 7 days)
  const since = new Date()
  since.setDate(since.getDate() - 7)

  const emails = await prisma.assistantEmail.findMany({
    where: {
      userId: user.id,
      receivedAt: { gte: since },
    },
    select: {
      id: true,
      fromName: true,
      fromAddress: true,
      subject: true,
      body: true,
      receivedAt: true,
    },
    orderBy: { receivedAt: 'desc' },
    take: 100,
  })

  const mentions = scanForMentions(
    emails.map(e => ({
      id: e.id,
      fromName: e.fromName,
      fromAddress: e.fromAddress,
      subject: e.subject,
      body: e.body,
      receivedAt: e.receivedAt,
    })),
    { first: firstName, last: lastName, full: user.name },
  )

  const summary = getMentionSummary(mentions)

  return NextResponse.json({
    mentions,
    summary,
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
