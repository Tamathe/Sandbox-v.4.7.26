import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser } from '../../../../lib/server-auth'
import { getContest } from '../../../../lib/bracket/bracket-service'
import { withErrorHandling } from '../../../../lib/api-utils'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const auth = await requireRequestUser(request)
  if ('response' in auth) return auth.response

  const { id } = await params

  try {
    const data = await getContest(id, auth.user.id)
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    // Prisma P2025 = record not found
    if (msg.includes('not found') || msg.includes('P2025')) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 })
    }
    return NextResponse.json({ error: msg }, { status: 400 })
  }
})
