import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser } from '../../../../../lib/server-auth'
import { prisma } from '../../../../../lib/prisma'
import { generateNudgeMessages } from '../../../../../lib/bracket/host-service'
import { withErrorHandling } from '../../../../../lib/api-utils'

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
    return NextResponse.json({ error: 'Only the commissioner can send nudges' }, { status: 403 })
  }

  try {
    const result = await generateNudgeMessages(id)
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
})
