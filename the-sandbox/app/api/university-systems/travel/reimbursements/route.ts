import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { createTravelReimbursement, getUserReimbursements } from '../../../../lib/university-systems-service'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { tripPurpose: string; destination: string; startDate: string; endDate: string; expenses: { category: string; description: string; amount: number }[]; fundingSource?: string; grantNumber?: string }

  const result = await createTravelReimbursement(auth.user.id, body)
  return NextResponse.json(result, { status: 201 })
})

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const result = await getUserReimbursements(auth.user.id)
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
