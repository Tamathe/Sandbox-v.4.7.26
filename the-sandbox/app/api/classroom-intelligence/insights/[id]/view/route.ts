import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { viewInsightCard } from '../../../../../lib/classroom-intelligence/classroom-intelligence-service'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const result = await viewInsightCard(id)

  return NextResponse.json(result)
})
